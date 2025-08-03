import path from 'node:path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { pathExists } from 'fs-extra'
import { fileURLToPath } from 'node:url'
import type { ProjectDetection, ModuleOptions } from '../../types'

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 测试设置生成上下文
 */
export interface TestSetupContext {
  projectInfo: ProjectDetection
  options: ModuleOptions
  existingSetup?: any
  templateVariables: Record<string, any>
}

/**
 * 测试设置生成结果
 */
export interface TestSetupResult {
  content: string
  filePath: string
  backup?: string
  conflicts?: SetupConflictInfo[]
}

/**
 * 设置冲突信息
 */
export interface SetupConflictInfo {
  section: string
  existingValue: any
  newValue: any
  severity: 'error' | 'warning' | 'info'
  description: string
}

/**
 * 增强的测试设置文件生成器
 */
export class TestSetupGenerator {
  /**
   * 生成测试设置文件
   */
  async generateSetup(context: TestSetupContext): Promise<TestSetupResult> {
    const { projectInfo, options } = context
    const { techStack } = projectInfo

    // 确定设置文件路径
    const setupPath = this.determineSetupPath(projectInfo)
    
    // 检查现有设置
    const existingSetup = await this.detectExistingSetup(setupPath)
    
    if (existingSetup && !options.dryRun) {
      // 智能合并现有设置
      return await this.mergeWithExistingSetup(existingSetup, context)
    }

    // 生成新设置
    const templateVariables = this.buildTemplateVariables(context)
    const setupContent = await this.renderSetupTemplate(techStack, templateVariables)

    const result: TestSetupResult = {
      content: setupContent,
      filePath: setupPath,
      conflicts: []
    }

    if (!options.dryRun) {
      // 确保目录存在
      const setupDir = path.dirname(setupPath)
      await mkdir(setupDir, { recursive: true })
      
      await writeFile(setupPath, setupContent, 'utf-8')
      if (options.verbose) {
        console.log(`✅ 测试设置文件已生成: ${setupPath}`)
      }
    }

    return result
  }

  /**
   * 确定设置文件路径
   */
  private determineSetupPath(projectInfo: ProjectDetection): string {
    const { currentDir, hasWorkspace, workspaceInfo } = projectInfo

    // 如果在工作区根目录执行，在根目录生成设置文件
    if (hasWorkspace && workspaceInfo?.currentLocation === 'root') {
      return path.join(currentDir, 'test-setup.ts')
    }

    // 如果在工作区子项目中执行，在子项目的 src 目录生成设置文件
    if (workspaceInfo?.currentLocation === 'package' && workspaceInfo.currentPackage) {
      return path.join(workspaceInfo.currentPackage.path, 'src', 'test-setup.ts')
    }

    // 默认在 src 目录生成设置文件
    return path.join(currentDir, 'src', 'test-setup.ts')
  }

  /**
   * 检测现有设置文件
   */
  private async detectExistingSetup(setupPath: string): Promise<any | null> {
    const setupFiles = [
      setupPath,
      setupPath.replace('.ts', '.js'),
      path.join(path.dirname(setupPath), 'setupTests.ts'),
      path.join(path.dirname(setupPath), 'setupTests.js'),
      path.join(path.dirname(setupPath), 'test-setup.js'),
    ]

    for (const file of setupFiles) {
      if (await pathExists(file)) {
        try {
          const content = await readFile(file, 'utf-8')
          return { filePath: file, content }
        } catch (error) {
          console.warn(`警告: 无法读取现有设置文件 ${file}:`, error)
        }
      }
    }

    return null
  }

  /**
   * 与现有设置智能合并
   */
  private async mergeWithExistingSetup(
    existingSetup: { filePath: string; content: string },
    context: TestSetupContext
  ): Promise<TestSetupResult> {
    const { options } = context
    const conflicts: SetupConflictInfo[] = []

    // 分析现有设置
    const hasTestingLibraryImport = existingSetup.content.includes('@testing-library')
    const hasJestDomImport = existingSetup.content.includes('@testing-library/jest-dom')
    const hasCleanup = existingSetup.content.includes('cleanup')
    // Check if existing setup has vitest imports
    // const hasVitestImports = existingSetup.content.includes('vitest')

    // 检查冲突
    if (hasTestingLibraryImport || hasJestDomImport || hasCleanup) {
      conflicts.push({
        section: 'testing-library',
        existingValue: '已存在测试库设置',
        newValue: '新的测试库设置',
        severity: 'warning',
        description: '检测到现有的测试库设置，建议手动合并或备份现有设置'
      })

      if (options.verbose) {
        console.log(`⚠️  发现现有的测试设置: ${existingSetup.filePath}`)
        console.log('建议手动检查并合并设置，或使用 --force 选项覆盖')
      }

      return {
        content: existingSetup.content,
        filePath: existingSetup.filePath,
        conflicts
      }
    }

    // 如果没有冲突，尝试添加缺失的设置
    const templateVariables = this.buildTemplateVariables(context)
    let mergedContent = existingSetup.content

    // 添加缺失的导入
    const missingImports = this.getMissingImports(existingSetup.content, templateVariables)
    if (missingImports.length > 0) {
      mergedContent = missingImports.join('\n') + '\n\n' + mergedContent
    }

    // 添加缺失的设置代码
    const missingSetup = this.getMissingSetup(existingSetup.content, templateVariables)
    if (missingSetup.length > 0) {
      mergedContent = mergedContent + '\n\n' + missingSetup.join('\n\n')
    }

    const result: TestSetupResult = {
      content: mergedContent,
      filePath: existingSetup.filePath,
      conflicts
    }

    if (!options.dryRun && missingImports.length > 0 || missingSetup.length > 0) {
      // 备份原文件
      const backupPath = `${existingSetup.filePath}.backup`
      await writeFile(backupPath, existingSetup.content, 'utf-8')
      result.backup = backupPath

      await writeFile(existingSetup.filePath, mergedContent, 'utf-8')
      
      if (options.verbose) {
        console.log(`✅ 设置已合并到现有文件: ${existingSetup.filePath}`)
        console.log(`📁 原设置已备份到: ${backupPath}`)
      }
    }

    return result
  }

  /**
   * 构建模板变量
   */
  private buildTemplateVariables(context: TestSetupContext): Record<string, any> {
    const { projectInfo } = context
    const { techStack, isTypeScript, hasWorkspace } = projectInfo

    const variables: Record<string, any> = {
      framework: techStack,
      isTypeScript,
      hasWorkspace,
    }

    // 框架特定的导入和设置
    switch (techStack) {
      case 'react':
        variables.testingLibraryImport = "import { cleanup } from '@testing-library/react'"
        variables.frameworkSpecificSetup = []
        break
      case 'vue2':
        variables.testingLibraryImport = "import { cleanup } from '@testing-library/vue'"
        variables.frameworkSpecificSetup = [
          "import Vue from 'vue'",
          "// Suppress Vue production tip",
          "Vue.config.productionTip = false"
        ]
        break
      case 'vue3':
        variables.testingLibraryImport = "import { cleanup } from '@testing-library/vue'"
        variables.frameworkSpecificSetup = [
          "// Mock URL.createObjectURL",
          "global.URL.createObjectURL = vi.fn(() => 'mocked-url')",
          "global.URL.revokeObjectURL = vi.fn()"
        ]
        break
    }

    return variables
  }

  /**
   * 渲染设置模板
   */
  private async renderSetupTemplate(
    techStack: string,
    variables: Record<string, any>
  ): Promise<string> {
    const templateName = `${techStack}.template`
    // 修复构建后的模板路径：从 dist/cli 或其他位置正确定位到 dist/modules/testing/templates
    const builtTemplatesDir = path.join(__dirname, '..', '..', 'modules', 'testing', 'templates')
    const templatePath = path.join(builtTemplatesDir, 'test-setup', templateName)
    
    try {
      let template = await readFile(templatePath, 'utf-8')
      
      // 替换模板变量
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`
        template = template.replace(new RegExp(placeholder, 'g'), String(value))
      }

      return template
    } catch (error) {
      console.warn(`警告: 无法读取模板文件 ${templatePath}，使用默认设置`)
      return this.generateDefaultSetup(techStack, variables)
    }
  }

  /**
   * 获取缺失的导入语句
   */
  private getMissingImports(existingContent: string, variables: Record<string, any>): string[] {
    const missingImports: string[] = []

    // 检查基础导入
    if (!existingContent.includes("@testing-library/jest-dom")) {
      missingImports.push("import '@testing-library/jest-dom'")
    }

    if (!existingContent.includes(variables.testingLibraryImport)) {
      missingImports.push(variables.testingLibraryImport)
    }

    if (!existingContent.includes("import { afterEach, beforeAll, vi } from 'vitest'")) {
      missingImports.push("import { afterEach, beforeAll, vi } from 'vitest'")
    }

    // 框架特定导入
    if (variables.frameworkSpecificSetup && Array.isArray(variables.frameworkSpecificSetup)) {
      for (const setup of variables.frameworkSpecificSetup) {
        if (setup.startsWith('import') && !existingContent.includes(setup)) {
          missingImports.push(setup)
        }
      }
    }

    return missingImports
  }

  /**
   * 获取缺失的设置代码
   */
  private getMissingSetup(existingContent: string, variables: Record<string, any>): string[] {
    const missingSetup: string[] = []

    // 检查清理代码
    if (!existingContent.includes('afterEach') || !existingContent.includes('cleanup')) {
      missingSetup.push(`// Cleanup after each test case
afterEach(() => {
  cleanup()
})`)
    }

    // 检查基础 mock 设置
    if (!existingContent.includes('beforeAll')) {
      const mockSetup = this.generateMockSetup(variables)
      missingSetup.push(mockSetup)
    }

    return missingSetup
  }

  /**
   * 生成 Mock 设置代码
   */
  private generateMockSetup(variables: Record<string, any>): string {
    const mockSetup = [`beforeAll(() => {`]

    // 框架特定设置
    if (variables.frameworkSpecificSetup && Array.isArray(variables.frameworkSpecificSetup)) {
      for (const setup of variables.frameworkSpecificSetup) {
        if (!setup.startsWith('import')) {
          mockSetup.push(`  ${setup}`)
        }
      }
      mockSetup.push('')
    }

    // 通用 Mock 设置
    mockSetup.push(
      `  // Mock window.matchMedia`,
      `  Object.defineProperty(window, 'matchMedia', {`,
      `    writable: true,`,
      `    value: vi.fn().mockImplementation(query => ({`,
      `      matches: false,`,
      `      media: query,`,
      `      onchange: null,`,
      `      addListener: vi.fn(), // deprecated`,
      `      removeListener: vi.fn(), // deprecated`,
      `      addEventListener: vi.fn(),`,
      `      removeEventListener: vi.fn(),`,
      `      dispatchEvent: vi.fn(),`,
      `    })),`,
      `  })`,
      ``,
      `  // Mock ResizeObserver`,
      `  global.ResizeObserver = vi.fn().mockImplementation(() => ({`,
      `    observe: vi.fn(),`,
      `    unobserve: vi.fn(),`,
      `    disconnect: vi.fn(),`,
      `  }))`,
      ``,
      `  // Mock IntersectionObserver`,
      `  global.IntersectionObserver = vi.fn().mockImplementation(() => ({`,
      `    observe: vi.fn(),`,
      `    unobserve: vi.fn(),`,
      `    disconnect: vi.fn(),`,
      `  }))`,
      `})`
    )

    return mockSetup.join('\n')
  }

  /**
   * 生成默认设置
   */
  private generateDefaultSetup(_techStack: string, variables: Record<string, any>): string {
    const imports = [
      "import '@testing-library/jest-dom'",
      variables.testingLibraryImport,
      "import { afterEach, beforeAll, vi } from 'vitest'"
    ]

    // 添加框架特定导入
    if (variables.frameworkSpecificSetup && Array.isArray(variables.frameworkSpecificSetup)) {
      for (const setup of variables.frameworkSpecificSetup) {
        if (setup.startsWith('import')) {
          imports.push(setup)
        }
      }
    }

    const cleanup = `// Cleanup after each test case
afterEach(() => {
  cleanup()
})`

    const mockSetup = this.generateMockSetup(variables)

    const consoleSetup = `// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}`

    return [
      imports.join('\n'),
      '',
      cleanup,
      '',
      mockSetup,
      '',
      consoleSetup
    ].join('\n')
  }

  /**
   * 验证设置文件
   */
  async validateSetup(setupPath: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const content = await readFile(setupPath, 'utf-8')
      const errors: string[] = []

      // 基本检查
      if (!content.includes('@testing-library/jest-dom')) {
        errors.push('缺少 @testing-library/jest-dom 导入')
      }

      if (!content.includes('cleanup')) {
        errors.push('缺少测试清理设置')
      }

      if (!content.includes('afterEach')) {
        errors.push('缺少 afterEach 钩子')
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      return { valid: false, errors: [`无法读取设置文件: ${error}`] }
    }
  }
}

/**
 * 生成测试设置文件 (向后兼容的函数)
 */
export async function generateTestSetup(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const generator = new TestSetupGenerator()
  const context: TestSetupContext = {
    projectInfo,
    options,
    templateVariables: {}
  }

  try {
    const result = await generator.generateSetup(context)
    
    if (result.conflicts && result.conflicts.length > 0) {
      console.log('⚠️  设置生成过程中发现以下冲突:')
      for (const conflict of result.conflicts) {
        console.log(`  - ${conflict.description}`)
      }
    }

    if (options.verbose && !options.dryRun) {
      console.log('✅ 测试设置文件已成功生成')
    }
  } catch (error) {
    console.error('❌ 生成设置文件失败:', error)
    throw error
  }
}