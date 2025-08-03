import path from 'node:path'
import { readFile, writeFile } from 'fs/promises'
import { pathExists } from 'fs-extra'
import { fileURLToPath } from 'node:url'
import type { ProjectDetection, ModuleOptions } from '../../types'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 配置生成上下文
 */
export interface ConfigContext {
  projectInfo: ProjectDetection
  options: ModuleOptions
  existingConfig?: any
  templateVariables: Record<string, any>
}

/**
 * 配置生成结果
 */
export interface ConfigResult {
  content: string
  filePath: string
  backup?: string
  conflicts?: ConflictInfo[]
}

/**
 * 配置冲突信息 (简化版本，用于向后兼容)
 */
export interface ConflictInfo {
  property: string
  existingValue: any
  newValue: any
  severity: 'error' | 'warning' | 'info'
  description: string
}

/**
 * 增强的 Vitest 配置生成器
 */
export class VitestConfigGenerator {
  constructor() {
    // ConfigInstaller and ConfigConflictResolver can be instantiated when needed
  }

  /**
   * 生成 Vitest 配置
   */
  async generateConfig(context: ConfigContext): Promise<ConfigResult> {
    const { projectInfo, options } = context
    const { techStack, hasWorkspace } = projectInfo

    // 确定配置文件路径
    const configPath = this.determineConfigPath(projectInfo)
    
    // 检查现有配置
    const existingConfig = await this.detectExistingConfig(configPath)
    
    if (existingConfig && !options.dryRun) {
      // 智能合并现有配置
      return await this.mergeWithExistingConfig(existingConfig, context)
    }

    // 生成新配置
    const templateVariables = this.buildTemplateVariables(context)
    const configContent = await this.renderConfigTemplate(techStack, hasWorkspace, templateVariables)

    const result: ConfigResult = {
      content: configContent,
      filePath: configPath,
      conflicts: []
    }

    if (!options.dryRun) {
      // 确保目录存在
      const configDir = path.dirname(configPath)
      await require('fs/promises').mkdir(configDir, { recursive: true })
      
      await writeFile(configPath, configContent, 'utf-8')
      if (options.verbose) {
        console.log(`✅ Vitest 配置已生成: ${configPath}`)
      }
    }

    return result
  }

  /**
   * 确定配置文件路径
   */
  private determineConfigPath(projectInfo: ProjectDetection): string {
    const { currentDir, workspaceInfo } = projectInfo

    // 如果在工作区子项目中执行，在子项目内生成配置
    if (workspaceInfo?.currentLocation === 'package' && workspaceInfo.currentPackage) {
      return path.join(workspaceInfo.currentPackage.path, 'vitest.config.ts')
    }

    // 否则在当前执行目录生成配置
    return path.join(currentDir, 'vitest.config.ts')
  }

  /**
   * 检测现有配置
   */
  private async detectExistingConfig(configPath: string): Promise<any | null> {
    const configFiles = [
      configPath,
      configPath.replace('.ts', '.js'),
      path.join(path.dirname(configPath), 'vite.config.ts'),
      path.join(path.dirname(configPath), 'vite.config.js'),
    ]

    for (const file of configFiles) {
      if (await pathExists(file)) {
        try {
          const content = await readFile(file, 'utf-8')
          return { filePath: file, content }
        } catch (error) {
          console.warn(`警告: 无法读取现有配置文件 ${file}:`, error)
        }
      }
    }

    return null
  }

  /**
   * 与现有配置智能合并
   */
  private async mergeWithExistingConfig(
    existingConfig: { filePath: string; content: string },
    context: ConfigContext
  ): Promise<ConfigResult> {
    const { options } = context
    const conflicts: ConflictInfo[] = []

    // 分析现有配置
    const hasVitestConfig = existingConfig.content.includes('test:') || 
                           existingConfig.content.includes('vitest')

    if (hasVitestConfig) {
      // 如果已有 Vitest 配置，提供合并选项
      conflicts.push({
        property: 'test',
        existingValue: '已存在测试配置',
        newValue: '新的测试配置',
        severity: 'warning',
        description: '检测到现有的 Vitest 配置，建议手动合并或备份现有配置'
      })

      if (options.verbose) {
        console.log(`⚠️  发现现有的 Vitest 配置: ${existingConfig.filePath}`)
        console.log('建议手动检查并合并配置，或使用 --force 选项覆盖')
      }

      return {
        content: existingConfig.content,
        filePath: existingConfig.filePath,
        conflicts
      }
    }

    // 如果是 Vite 配置但没有测试配置，尝试添加测试配置
    const templateVariables = this.buildTemplateVariables(context)
    const testConfig = this.generateTestConfigSection(templateVariables)
    
    let mergedContent = existingConfig.content

    // 简单的配置合并逻辑
    if (mergedContent.includes('export default defineConfig({')) {
      // 在 defineConfig 中添加 test 配置
      const configRegex = /export default defineConfig\(\{([\s\S]*?)\}\)/
      const match = mergedContent.match(configRegex)
      
      if (match) {
        const configContent = match[1] || ''
        // 检查是否有内容且需要逗号
        const trimmedContent = configContent.trim()
        const needsComma = trimmedContent && !trimmedContent.endsWith(',')
        const separator = needsComma ? ',\n' : '\n'
        
        mergedContent = mergedContent.replace(
          configRegex,
          `export default defineConfig({${configContent}${separator}  test: ${testConfig}\n})`
        )
      } else {
        conflicts.push({
          property: 'config',
          existingValue: '无法解析的配置格式',
          newValue: '新的测试配置',
          severity: 'error',
          description: '现有配置格式无法自动合并，需要手动处理'
        })
      }
    } else {
      // 无法自动合并，返回冲突信息
      conflicts.push({
        property: 'config',
        existingValue: '无法解析的配置格式',
        newValue: '新的测试配置',
        severity: 'error',
        description: '现有配置格式无法自动合并，需要手动处理'
      })
    }

    const result: ConfigResult = {
      content: mergedContent,
      filePath: existingConfig.filePath,
      conflicts
    }

    if (!options.dryRun && conflicts.length === 0) {
      // 备份原文件
      const backupPath = `${existingConfig.filePath}.backup`
      await writeFile(backupPath, existingConfig.content, 'utf-8')
      result.backup = backupPath

      await writeFile(existingConfig.filePath, mergedContent, 'utf-8')
      
      if (options.verbose) {
        console.log(`✅ 配置已合并到现有文件: ${existingConfig.filePath}`)
        console.log(`📁 原配置已备份到: ${backupPath}`)
      }
    }

    return result
  }

  /**
   * 构建模板变量
   */
  private buildTemplateVariables(context: ConfigContext): Record<string, any> {
    const { projectInfo } = context
    const { techStack, isTypeScript, hasWorkspace, workspaceInfo } = projectInfo

    const variables: Record<string, any> = {
      framework: techStack,
      isTypeScript,
      hasWorkspace,
      coverage_threshold: 75,
    }

    // 框架特定的插件配置
    switch (techStack) {
      case 'react':
        variables.framework_plugin_import = "import react from '@vitejs/plugin-react'"
        variables.framework_plugin = 'react()'
        break
      case 'vue2':
        variables.framework_plugin_import = "import { createVuePlugin } from 'vite-plugin-vue2'"
        variables.framework_plugin = 'createVuePlugin()'
        break
      case 'vue3':
        variables.framework_plugin_import = "import vue from '@vitejs/plugin-vue'"
        variables.framework_plugin = 'vue()'
        break
    }

    // 设置文件路径
    if (hasWorkspace && workspaceInfo?.currentLocation === 'root') {
      variables.setupFiles = './test-setup.ts'
    } else {
      variables.setupFiles = './src/test-setup.ts'
    }

    return variables
  }

  /**
   * 渲染配置模板
   */
  private async renderConfigTemplate(
    techStack: string,
    hasWorkspace: boolean,
    variables: Record<string, any>
  ): Promise<string> {
    let templateName: string

    if (hasWorkspace) {
      templateName = 'workspace.template'
    } else {
      templateName = `${techStack}.template`
    }

    // 检测是否在源代码环境（开发/测试）还是构建后环境（生产）
    let templatesDir: string
    if (__dirname.includes('src/modules/testing')) {
      // 开发/测试环境：直接使用当前目录下的 templates
      templatesDir = path.join(__dirname, 'templates')
    } else {
      // 生产环境：从 dist/cli 定位到 dist/modules/testing/templates
      templatesDir = path.join(__dirname, '..', 'modules', 'testing', 'templates')
    }
    
    const templatePath = path.join(templatesDir, 'vitest-config', templateName)
    
    try {
      let template = await readFile(templatePath, 'utf-8')
      
      // 替换模板变量
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`
        template = template.replace(new RegExp(placeholder, 'g'), String(value))
      }

      return template
    } catch (error) {
      console.warn(`警告: 无法读取模板文件 ${templatePath}，使用默认配置`)
      return this.generateDefaultConfig(techStack, variables)
    }
  }

  /**
   * 生成测试配置部分
   */
  private generateTestConfigSection(variables: Record<string, any>): string {
    return `{
    environment: 'jsdom',
    globals: true,
    setupFiles: ['${variables.setupFiles}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/**',
        '**/*.stories.*',
        '**/*.test.*',
      ],
      thresholds: {
        global: {
          branches: ${variables.coverage_threshold},
          functions: ${variables.coverage_threshold},
          lines: ${variables.coverage_threshold},
          statements: ${variables.coverage_threshold}
        }
      }
    },
  }`
  }

  /**
   * 生成默认配置
   */
  private generateDefaultConfig(_techStack: string, variables: Record<string, any>): string {
    const pluginImport = variables.framework_plugin_import || "import react from '@vitejs/plugin-react'"
    const plugin = variables.framework_plugin || 'react()'
    const testConfig = this.generateTestConfigSection(variables)

    return `import { defineConfig } from 'vitest/config'
${pluginImport}

export default defineConfig({
  plugins: [${plugin}],
  test: ${testConfig}
})
`
  }

  /**
   * 验证配置
   */
  async validateConfig(configPath: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const content = await readFile(configPath, 'utf-8')
      const errors: string[] = []

      // 基本语法检查
      if (!content.includes('defineConfig')) {
        errors.push('配置文件缺少 defineConfig 调用')
      }

      if (!content.includes('test:')) {
        errors.push('配置文件缺少测试配置部分')
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      return { valid: false, errors: [`无法读取配置文件: ${error}`] }
    }
  }
}

/**
 * 生成 Vitest 配置文件 (向后兼容的函数)
 */
export async function generateVitestConfig(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const generator = new VitestConfigGenerator()
  const context: ConfigContext = {
    projectInfo,
    options,
    templateVariables: {}
  }

  try {
    const result = await generator.generateConfig(context)
    
    if (result.conflicts && result.conflicts.length > 0) {
      console.log('⚠️  配置生成过程中发现以下冲突:')
      for (const conflict of result.conflicts) {
        console.log(`  - ${conflict.description}`)
      }
    }

    if (options.verbose && !options.dryRun) {
      console.log('✅ Vitest 配置已成功生成')
    }
  } catch (error) {
    console.error('❌ 生成配置文件失败:', error)
    throw error
  }
}