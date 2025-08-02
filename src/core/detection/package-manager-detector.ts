import path from 'node:path'
import { pathExists } from 'fs-extra'

/**
 * 检测项目使用的包管理器
 */
export async function detectPackageManager(rootDir: string): Promise<'npm' | 'yarn' | 'pnpm'> {
  // 检测 pnpm
  if (await pathExists(path.join(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }

  // 检测 yarn
  if (await pathExists(path.join(rootDir, 'yarn.lock'))) {
    return 'yarn'
  }

  // 检测 npm
  if (await pathExists(path.join(rootDir, 'package-lock.json'))) {
    return 'npm'
  }

  // 默认使用 npm
  return 'npm'
}