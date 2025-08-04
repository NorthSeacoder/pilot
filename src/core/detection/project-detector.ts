import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { findUp } from 'find-up'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { detectFramework } from './framework-detector'
import { detectArchitecture, detectWorkspaceInfo } from './architecture-detector'
import { detectPackageManager } from './package-manager-detector'
import { detectTypeScript } from './typescript-detector'
import { detectExistingTests } from './existing-tests-detector'
import { analyzeDependencyVersions, getNodeVersion } from './dependency-analyzer'

/**
 * 检测项目基本信息
 */
export async function detectProject(options: ModuleOptions): Promise<ProjectDetection> {
  // 获取当前执行目录
  const currentDir = process.cwd()
  
  // 查找项目根目录（包含 package.json 的目录）
  const packageJsonPath = await findUp('package.json')
  if (!packageJsonPath) {
    throw new Error('未找到 package.json 文件，请在项目根目录中运行此命令')
  }

  const rootDir = path.dirname(packageJsonPath)
  
  // 读取 package.json
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  // 并行执行多个检测任务以提升性能
  const [
    techStack,
    architecture,
    packageManager,
    isTypeScript,
    { hasExistingTests, existingTestFrameworks, existingConfigs },
    dependencyVersions,
    nodeVersion
  ] = await Promise.all([
    // 检测技术栈
    options.stack ? Promise.resolve(options.stack) : detectFramework(packageJson, { currentDir, rootDir }),
    // 检测架构
    options.arch ? Promise.resolve(options.arch) : detectArchitecture(rootDir),
    // 检测包管理器
    detectPackageManager(rootDir),
    // 检测 TypeScript
    detectTypeScript(rootDir, packageJson),
    // 检测现有测试配置
    detectExistingTests(rootDir, packageJson),
    // 分析依赖版本
    analyzeDependencyVersions(packageJson),
    // 获取 Node.js 版本（同步操作包装为 Promise）
    Promise.resolve(getNodeVersion())
  ])

  // 检测工作区信息（需要依赖 architecture 结果）
  const workspaceInfo = await detectWorkspaceInfo(rootDir, currentDir, architecture)

  return {
    techStack,
    architecture,
    rootDir,
    packageManager,
    isTypeScript,
    hasWorkspace: workspaceInfo !== undefined,
    hasExistingTests,
    existingTestFrameworks,
    workspaceInfo,
    dependencyVersions,
    existingConfigs,
    currentDir,
    nodeVersion,
  }
}