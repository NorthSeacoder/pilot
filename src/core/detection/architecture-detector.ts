import path from 'node:path'
import { pathExists } from 'fs-extra'
import { readFile } from 'node:fs/promises'
import type { ProjectArchitecture } from '../../types'

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