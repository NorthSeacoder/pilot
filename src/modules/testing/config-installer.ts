import { copyFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'node:url'
import type { TechStack } from '../../types'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class ConfigInstaller {
  private templatesDir: string

  constructor(templatesDir?: string) {
    // 修复构建后的模板路径：从 dist/cli 或其他位置正确定位到 dist/modules/testing/templates
    const builtTemplatesDir = join(__dirname, '..', '..', 'modules', 'testing', 'templates')
    this.templatesDir = templatesDir || builtTemplatesDir
  }

  /**
   * Install Vitest config file for specific tech stack
   */
  async installVitestConfig(projectPath: string, techStack: TechStack, hasWorkspace: boolean = false): Promise<void> {
    try {
      const templateName = this.getVitestTemplate(techStack, hasWorkspace)
      const sourceFile = join(this.templatesDir, 'vitest-config', templateName)
      const targetFile = join(projectPath, 'vitest.config.ts')

      await copyFile(sourceFile, targetFile)
      console.log(`✅ Vitest config installed: ${targetFile}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to install Vitest config: ${errorMessage}`)
      throw new Error(`Failed to install Vitest config: ${errorMessage}`)
    }
  }

  /**
   * Install test setup file for specific tech stack
   */
  async installTestSetup(projectPath: string, techStack: TechStack, hasWorkspace: boolean = false): Promise<void> {
    try {
      const templateName = this.getTestSetupTemplate(techStack)
      const sourceFile = join(this.templatesDir, 'test-setup', templateName)
      
      // Determine setup file path
      let targetFile: string
      if (hasWorkspace) {
        targetFile = join(projectPath, 'test-setup.ts')
      } else {
        const srcDir = join(projectPath, 'src')
        if (existsSync(srcDir)) {
          targetFile = join(srcDir, 'test-setup.ts')
        } else {
          // Ensure src directory exists
          await mkdir(srcDir, { recursive: true })
          targetFile = join(srcDir, 'test-setup.ts')
        }
      }

      // Ensure target directory exists
      await mkdir(dirname(targetFile), { recursive: true })
      
      await copyFile(sourceFile, targetFile)
      console.log(`✅ Test setup installed: ${targetFile}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to install test setup: ${errorMessage}`)
      throw new Error(`Failed to install test setup: ${errorMessage}`)
    }
  }

  /**
   * Install both config and setup files
   */
  async installTestingConfig(projectPath: string, techStack: TechStack, hasWorkspace: boolean = false): Promise<void> {
    await this.installVitestConfig(projectPath, techStack, hasWorkspace)
    await this.installTestSetup(projectPath, techStack, hasWorkspace)
  }

  /**
   * Get template name for Vitest config based on tech stack
   */
  private getVitestTemplate(techStack: TechStack, hasWorkspace: boolean): string {
    if (hasWorkspace) {
      return 'workspace.template'
    }

    switch (techStack) {
      case 'react':
        return 'react.template'
      case 'vue2':
        return 'vue2.template'
      case 'vue3':
        return 'vue3.template'
      default:
        return 'react.template' // Default fallback
    }
  }

  /**
   * Get template name for test setup based on tech stack
   */
  private getTestSetupTemplate(techStack: TechStack): string {
    switch (techStack) {
      case 'react':
        return 'react.template'
      case 'vue2':
        return 'vue2.template'
      case 'vue3':
        return 'vue3.template'
      default:
        return 'react.template' // Default fallback
    }
  }

  /**
   * Check if config files already exist
   */
  async hasExistingConfig(projectPath: string): Promise<{ hasConfig: boolean; hasSetup: boolean }> {
    const configPath = join(projectPath, 'vitest.config.ts')
    const setupPathSrc = join(projectPath, 'src', 'test-setup.ts')
    const setupPathRoot = join(projectPath, 'test-setup.ts')

    return {
      hasConfig: existsSync(configPath),
      hasSetup: existsSync(setupPathSrc) || existsSync(setupPathRoot)
    }
  }
}

// Export singleton instance
export const configInstaller = new ConfigInstaller()