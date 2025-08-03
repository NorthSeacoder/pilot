import path from 'node:path'
import { pathExists } from 'fs-extra'
import { safeAsync } from '../../utils/error-handler'

/**
 * 检测项目使用的包管理器
 */
export async function detectPackageManager(rootDir: string): Promise<'npm' | 'yarn' | 'pnpm'> {
  // 检测 pnpm
  const hasPnpmLock = await safeAsync(
    () => pathExists(path.join(rootDir, 'pnpm-lock.yaml')),
    { operation: 'pnpm锁文件检测', filePath: path.join(rootDir, 'pnpm-lock.yaml') },
    false
  )
  if (hasPnpmLock) {
    return 'pnpm'
  }

  // 检测 yarn
  const hasYarnLock = await safeAsync(
    () => pathExists(path.join(rootDir, 'yarn.lock')),
    { operation: 'yarn锁文件检测', filePath: path.join(rootDir, 'yarn.lock') },
    false
  )
  if (hasYarnLock) {
    return 'yarn'
  }

  // 检测 npm
  const hasNpmLock = await safeAsync(
    () => pathExists(path.join(rootDir, 'package-lock.json')),
    { operation: 'npm锁文件检测', filePath: path.join(rootDir, 'package-lock.json') },
    false
  )
  if (hasNpmLock) {
    return 'npm'
  }

  // 默认使用 npm
  return 'npm'
}