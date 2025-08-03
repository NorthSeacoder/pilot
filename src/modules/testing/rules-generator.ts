
import type { ProjectDetection, ModuleOptions } from '../../types'
import { RulesInstaller } from './rules-installer'

/**
 * 生成 Cursor AI 测试规则文件
 */
export async function generateCursorRules(
  projectInfo: ProjectDetection,
  _options: ModuleOptions
): Promise<void> {
  const { rootDir } = projectInfo
  
  // 使用简单的规则安装器
  const installer = new RulesInstaller()
  
  try {
    // 直接复制通用规则文件
    await installer.installTestingStrategy(rootDir)
    console.log('✅ Testing strategy rules installed successfully')
  } catch (error) {
    console.error('❌ Failed to install testing strategy rules:', error)
    throw error
  }
}
