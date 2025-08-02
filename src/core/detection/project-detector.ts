import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { findUp } from 'find-up'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { detectFramework } from './framework-detector'
import { detectArchitecture } from './architecture-detector'
import { detectPackageManager } from './package-manager-detector'

/**
 * 检测项目基本信息
 */
export async function detectProject(options: ModuleOptions): Promise<ProjectDetection> {
  // 查找项目根目录（包含 package.json 的目录）
  const packageJsonPath = await findUp('package.json')
  if (!packageJsonPath) {
    throw new Error('未找到 package.json 文件，请在项目根目录中运行此命令')
  }

  const rootDir = path.dirname(packageJsonPath)
  
  // 读取 package.json
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  // 检测技术栈
  const techStack = options.stack || await detectFramework(packageJson, rootDir)
  
  // 检测项目架构
  const architecture = options.arch || await detectArchitecture(rootDir)
  
  // 检测包管理器
  const packageManager = await detectPackageManager(rootDir)

  return {
    techStack,
    architecture,
    rootDir,
    packageManager,
  }
}