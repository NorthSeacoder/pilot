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
    // 修复构建后的模板路径：从 dist/cli 或其他位置正确定位到 dist/modules/testing/templates
    const builtTemplatesDir = join(__dirname, '..', '..', 'modules', 'testing', 'templates')
    this.templatesDir = templatesDir || builtTemplatesDir
  }

  /**
   * Copy testing strategy rules to project
   */
  async installTestingStrategy(projectPath: string): Promise<void> {
    const sourceFile = join(this.templatesDir, 'testing-strategy.yaml')
    const targetDir = join(projectPath, '.cursor', 'rules')
    const targetFile = join(targetDir, 'testing-strategy.yaml')

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
    const targetFile = join(projectPath, '.cursor', 'rules', 'testing-strategy.yaml')
    return existsSync(targetFile)
  }

  /**
   * Get the target path where rules will be installed
   */
  getRulesPath(projectPath: string): string {
    return join(projectPath, '.cursor', 'rules', 'testing-strategy.yaml')
  }
}

// Export singleton instance
export const rulesInstaller = new RulesInstaller()