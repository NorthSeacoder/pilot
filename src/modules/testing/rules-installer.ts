import { copyFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'node:url'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class RulesInstaller {
  private templatesDir: string

  constructor(templatesDir?: string) {
    if (templatesDir) {
      this.templatesDir = templatesDir
    } else {
      // 检测是否在源代码环境（开发/测试）还是构建后环境（生产）
      if (__dirname.includes('src/modules/testing')) {
        // 开发/测试环境：直接使用当前目录下的 templates
        this.templatesDir = join(__dirname, 'templates')
      } else {
        // 生产环境：从 dist/cli 定位到 dist/modules/testing/templates
        this.templatesDir = join(__dirname, '..', 'modules', 'testing', 'templates')
      }
    }
  }

  /**
   * Copy testing strategy rules to project
   */
  async installTestingStrategy(projectPath: string): Promise<void> {
    const sourceFile = join(this.templatesDir, 'testing-strategy.yaml')
    const targetDir = join(projectPath, '.cursor', 'rules')
    const targetFile = join(targetDir, 'testing-strategy.mdc')

    try {
      // Ensure target directory exists
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true })
      }

      // Copy the rules file
      await copyFile(sourceFile, targetFile)
      
      console.log(`✅ Testing strategy rules installed to: ${targetFile}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to install testing strategy rules: ${errorMessage}`)
      throw new Error(`Failed to install testing strategy rules: ${errorMessage}`)
    }
  }

  /**
   * Check if testing strategy rules already exist
   */
  async hasExistingRules(projectPath: string): Promise<boolean> {
    const targetFile = join(projectPath, '.cursor', 'rules', 'testing-strategy.mdc')
    return existsSync(targetFile)
  }

  /**
   * Get the target path where rules will be installed
   */
  getRulesPath(projectPath: string): string {
    return join(projectPath, '.cursor', 'rules', 'testing-strategy.mdc')
  }
}

// Export singleton instance
export const rulesInstaller = new RulesInstaller()