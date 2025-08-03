import path from 'node:path'
import { pathExists } from 'fs-extra'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { ConfigInstaller } from './config-installer'

/**
 * 生成 Vitest 配置文件
 */
export async function generateVitestConfig(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const { rootDir, techStack, hasWorkspace } = projectInfo
  
  // 检查是否已存在配置文件
  const configFiles = [
    'vitest.config.ts',
    'vitest.config.js',
    'vite.config.ts',
    'vite.config.js',
  ]
  
  for (const configFile of configFiles) {
    if (await pathExists(path.join(rootDir, configFile))) {
      if (options.verbose) {
        console.log(`发现已存在的配置文件: ${configFile}，跳过配置生成`)
      }
      return
    }
  }

  // 使用配置安装器
  const installer = new ConfigInstaller()
  
  try {
    // 直接复制对应的配置和设置文件
    await installer.installTestingConfig(rootDir, techStack, hasWorkspace)
    
    if (options.verbose) {
      console.log('✅ Vitest 配置和测试设置文件已成功安装')
    }
  } catch (error) {
    console.error('❌ 安装配置文件失败:', error)
    throw error
  }
}