import path from 'node:path'
import { pathExists } from 'fs-extra'
import { readFile } from 'node:fs/promises'
import { glob } from 'glob'
import yaml from 'js-yaml'
import type { ProjectArchitecture, WorkspaceInfo, WorkspacePackage } from '../../types'
import { safeAsync, safeReadFile, safeParseJSON } from '../../utils/error-handler'

/**
 * 检测项目架构类型
 */
export async function detectArchitecture(rootDir: string): Promise<ProjectArchitecture> {
  // 检测 pnpm workspace
  const pnpmWorkspacePath = path.join(rootDir, 'pnpm-workspace.yaml')
  if (await pathExists(pnpmWorkspacePath)) {
    return 'pnpm-workspace'
  }

  // 检测 yarn workspace
  const packageJsonPath = path.join(rootDir, 'package.json')
  if (await pathExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
      if (packageJson.workspaces) {
        return 'yarn-workspace'
      }
    } catch {
      // 忽略 JSON 解析错误
    }
  }

  // 默认为单模块项目
  return 'single'
}

/**
 * 检测工作区信息
 */
export async function detectWorkspaceInfo(
  rootDir: string,
  currentDir: string,
  architecture: ProjectArchitecture
): Promise<WorkspaceInfo | undefined> {
  if (architecture === 'single') {
    return undefined
  }

  const rootPackageJsonPath = path.join(rootDir, 'package.json')
  const rootPackageJson = JSON.parse(await readFile(rootPackageJsonPath, 'utf-8'))

  let packages: WorkspacePackage[] = []
  let workspaceType: 'pnpm' | 'yarn'

  if (architecture === 'pnpm-workspace') {
    workspaceType = 'pnpm'
    packages = await detectPnpmWorkspacePackages(rootDir)
  } else {
    workspaceType = 'yarn'
    packages = await detectYarnWorkspacePackages(rootDir, rootPackageJson.workspaces)
  }

  // 确定当前执行位置
  const currentLocation = currentDir === rootDir ? 'root' : 'package'
  let currentPackage: WorkspacePackage | undefined

  if (currentLocation === 'package') {
    currentPackage = packages.find((pkg) => currentDir.startsWith(path.join(rootDir, pkg.path)))
  }

  return {
    type: workspaceType,
    packages,
    rootPackageJson,
    currentLocation,
    currentPackage,
  }
}

/**
 * 通用的包检测函数
 */
async function detectWorkspacePackagesFromPatterns(
  rootDir: string,
  patterns: string[]
): Promise<WorkspacePackage[]> {
  const packages: WorkspacePackage[] = []

  for (const pattern of patterns) {
    const packageDirs = await glob(pattern, {
      cwd: rootDir,
    })

    for (const dir of packageDirs) {
      const packageJsonPath = path.join(rootDir, dir, 'package.json')
      if (await pathExists(packageJsonPath)) {
        const content = await safeReadFile(packageJsonPath)
        if (content) {
          const packageJson = safeParseJSON(content, {
            operation: '工作区包检测',
            filePath: packageJsonPath,
          })

          if (packageJson) {
            packages.push({
              name: packageJson.name || path.basename(dir),
              path: dir,
              packageJson,
            })
          }
        }
      }
    }
  }

  return packages
}

/**
 * 检测 pnpm workspace 包
 */
async function detectPnpmWorkspacePackages(rootDir: string): Promise<WorkspacePackage[]> {
  const pnpmWorkspacePath = path.join(rootDir, 'pnpm-workspace.yaml')

  const content = await safeReadFile(pnpmWorkspacePath)
  if (content) {
    const config = safeAsync(
      () => Promise.resolve(yaml.load(content) as any),
      { operation: 'pnpm-workspace.yaml解析', filePath: pnpmWorkspacePath },
      {}
    )

    const configData = await config
    const patterns = configData.packages || []

    return await detectWorkspacePackagesFromPatterns(rootDir, patterns)
  }

  return []
}

/**
 * 检测 yarn workspace 包
 */
async function detectYarnWorkspacePackages(
  rootDir: string,
  workspaces: string[] | { packages: string[] }
): Promise<WorkspacePackage[]> {
  const patterns = Array.isArray(workspaces) ? workspaces : workspaces.packages || []
  return await detectWorkspacePackagesFromPatterns(rootDir, patterns)
}
