import path from 'node:path'
import { readFile, writeFile, copyFile } from 'fs/promises'
import { pathExists } from 'fs-extra'
import type {
  ProjectDetection,
  ConfigConflict,
  ConflictResolutionOptions,
  ConflictResolutionResult,
  ConflictDetectionContext,
} from '../../types'

/**
 * 配置冲突解决器
 */
export class ConfigConflictResolver {
  /**
   * 检测配置冲突
   */
  async detectConflicts(context: ConflictDetectionContext): Promise<ConfigConflict[]> {
    const conflicts: ConfigConflict[] = []
    const { projectInfo, targetFiles, newConfigs } = context

    // 检测现有配置文件冲突
    for (const targetFile of targetFiles) {
      const existingConflicts = await this.detectFileConflicts(targetFile, newConfigs, projectInfo)
      conflicts.push(...existingConflicts)
    }

    // 检测依赖版本冲突
    const dependencyConflicts = await this.detectDependencyConflicts(projectInfo, newConfigs)
    conflicts.push(...dependencyConflicts)

    // 检测框架兼容性冲突
    const frameworkConflicts = await this.detectFrameworkConflicts(projectInfo, newConfigs)
    conflicts.push(...frameworkConflicts)

    return conflicts
  }

  /**
   * 检测文件级别的冲突
   */
  private async detectFileConflicts(
    filePath: string,
    newConfigs: Record<string, any>,
    projectInfo: ProjectDetection
  ): Promise<ConfigConflict[]> {
    const conflicts: ConfigConflict[] = []

    if (!(await pathExists(filePath))) {
      return conflicts
    }

    try {
      const existingContent = await readFile(filePath, 'utf-8')
      const fileName = path.basename(filePath)
      const newConfig = newConfigs[fileName]

      if (!newConfig) {
        return conflicts
      }

      // 检测 Vitest 配置冲突
      if (fileName.includes('vitest.config')) {
        const vitestConflicts = this.detectVitestConfigConflicts(
          filePath,
          existingContent,
          newConfig
        )
        conflicts.push(...vitestConflicts)
      }

      // 检测测试设置冲突
      if (fileName.includes('test-setup')) {
        const setupConflicts = this.detectTestSetupConflicts(filePath, existingContent, newConfig)
        conflicts.push(...setupConflicts)
      }

      // 检测 package.json 冲突
      if (fileName === 'package.json') {
        const packageConflicts = this.detectPackageJsonConflicts(
          filePath,
          existingContent,
          newConfig,
          projectInfo
        )
        conflicts.push(...packageConflicts)
      }
    } catch (error) {
      conflicts.push({
        id: `file-read-error-${path.basename(filePath)}`,
        type: 'config-exists',
        severity: 'error',
        filePath,
        description: `无法读取现有配置文件: ${error}`,
        existingValue: null,
        newValue: newConfigs[path.basename(filePath)],
        suggestedStrategy: 'manual',
        availableStrategies: ['manual', 'skip'],
      })
    }

    return conflicts
  }

  /**
   * 检测 Vitest 配置冲突
   */
  private detectVitestConfigConflicts(
    filePath: string,
    existingContent: string,
    newConfig: any
  ): ConfigConflict[] {
    const conflicts: ConfigConflict[] = []

    // 检测是否已有测试配置
    if (existingContent.includes('test:') || existingContent.includes('vitest')) {
      conflicts.push({
        id: 'vitest-config-exists',
        type: 'config-exists',
        severity: 'warning',
        filePath,
        description: '检测到现有的 Vitest 配置，可能会与新配置冲突',
        existingValue: '现有 Vitest 配置',
        newValue: newConfig,
        suggestedStrategy: 'merge',
        availableStrategies: ['merge', 'replace', 'backup', 'skip'],
      })
    }

    // 检测环境配置冲突
    if (existingContent.includes('environment:') && newConfig.test?.environment) {
      const existingEnv = this.extractConfigValue(existingContent, 'environment')
      if (existingEnv && existingEnv !== newConfig.test.environment) {
        conflicts.push({
          id: 'test-environment-conflict',
          type: 'config-exists',
          severity: 'warning',
          filePath,
          description: `测试环境配置冲突: 现有 ${existingEnv} vs 新配置 ${newConfig.test.environment}`,
          existingValue: existingEnv,
          newValue: newConfig.test.environment,
          suggestedStrategy: 'merge',
          availableStrategies: ['merge', 'replace', 'manual'],
        })
      }
    }

    // 检测插件冲突
    if (existingContent.includes('plugins:') && newConfig.plugins) {
      conflicts.push({
        id: 'plugins-conflict',
        type: 'config-exists',
        severity: 'info',
        filePath,
        description: '检测到现有插件配置，需要合并插件列表',
        existingValue: '现有插件配置',
        newValue: newConfig.plugins,
        suggestedStrategy: 'merge',
        availableStrategies: ['merge', 'replace'],
      })
    }

    return conflicts
  }

  /**
   * 检测测试设置冲突
   */
  private detectTestSetupConflicts(
    filePath: string,
    existingContent: string,
    newConfig: any
  ): ConfigConflict[] {
    const conflicts: ConfigConflict[] = []

    // 检测测试库导入冲突
    if (existingContent.includes('@testing-library')) {
      conflicts.push({
        id: 'testing-library-exists',
        type: 'setup-conflict',
        severity: 'warning',
        filePath,
        description: '检测到现有的 Testing Library 设置',
        existingValue: '现有测试库设置',
        newValue: newConfig,
        suggestedStrategy: 'merge',
        availableStrategies: ['merge', 'replace', 'backup', 'skip'],
      })
    }

    // 检测清理函数冲突
    if (existingContent.includes('cleanup') || existingContent.includes('afterEach')) {
      conflicts.push({
        id: 'cleanup-exists',
        type: 'setup-conflict',
        severity: 'info',
        filePath,
        description: '检测到现有的测试清理设置',
        existingValue: '现有清理设置',
        newValue: newConfig,
        suggestedStrategy: 'merge',
        availableStrategies: ['merge', 'skip'],
      })
    }

    // 检测 Mock 设置冲突
    if (existingContent.includes('vi.fn()') || existingContent.includes('mock')) {
      conflicts.push({
        id: 'mock-setup-exists',
        type: 'setup-conflict',
        severity: 'info',
        filePath,
        description: '检测到现有的 Mock 设置',
        existingValue: '现有 Mock 设置',
        newValue: newConfig,
        suggestedStrategy: 'merge',
        availableStrategies: ['merge', 'skip'],
      })
    }

    return conflicts
  }

  /**
   * 检测 package.json 冲突
   */
  private detectPackageJsonConflicts(
    filePath: string,
    existingContent: string,
    newConfig: any,
    _projectInfo: ProjectDetection
  ): ConfigConflict[] {
    const conflicts: ConfigConflict[] = []

    try {
      const existingPackage = JSON.parse(existingContent)

      // 检测脚本冲突
      if (existingPackage.scripts && newConfig.scripts) {
        for (const [scriptName, scriptValue] of Object.entries(newConfig.scripts)) {
          if (
            existingPackage.scripts[scriptName] &&
            existingPackage.scripts[scriptName] !== scriptValue
          ) {
            conflicts.push({
              id: `script-conflict-${scriptName}`,
              type: 'config-exists',
              severity: 'warning',
              filePath,
              description: `脚本 "${scriptName}" 已存在且内容不同`,
              existingValue: existingPackage.scripts[scriptName],
              newValue: scriptValue,
              suggestedStrategy: 'merge',
              availableStrategies: ['merge', 'replace', 'skip'],
            })
          }
        }
      }

      // 检测依赖冲突
      if (existingPackage.devDependencies && newConfig.devDependencies) {
        for (const [depName, depVersion] of Object.entries(newConfig.devDependencies)) {
          if (existingPackage.devDependencies[depName]) {
            const existingVersion = existingPackage.devDependencies[depName]
            if (existingVersion !== depVersion) {
              conflicts.push({
                id: `dependency-conflict-${depName}`,
                type: 'dependency-mismatch',
                severity: 'warning',
                filePath,
                description: `依赖 "${depName}" 版本冲突: ${existingVersion} vs ${depVersion}`,
                existingValue: existingVersion,
                newValue: depVersion,
                suggestedStrategy: 'merge',
                availableStrategies: ['merge', 'replace', 'skip'],
              })
            }
          }
        }
      }
    } catch (error) {
      conflicts.push({
        id: 'package-json-parse-error',
        type: 'config-exists',
        severity: 'error',
        filePath,
        description: `无法解析 package.json: ${error}`,
        existingValue: existingContent,
        newValue: newConfig,
        suggestedStrategy: 'manual',
        availableStrategies: ['manual', 'skip'],
      })
    }

    return conflicts
  }

  /**
   * 检测依赖版本冲突
   */
  private async detectDependencyConflicts(
    projectInfo: ProjectDetection,
    newConfigs: Record<string, any>
  ): Promise<ConfigConflict[]> {
    const conflicts: ConfigConflict[] = []
    const { dependencyVersions, techStack } = projectInfo

    // 检测框架版本兼容性
    const frameworkVersion = this.getFrameworkVersion(dependencyVersions, techStack)
    if (frameworkVersion) {
      const incompatibleDeps = this.checkVersionCompatibility(
        frameworkVersion,
        techStack,
        newConfigs
      )
      conflicts.push(...incompatibleDeps)
    }

    return conflicts
  }

  /**
   * 检测框架兼容性冲突
   */
  private async detectFrameworkConflicts(
    projectInfo: ProjectDetection,
    _newConfigs: Record<string, any>
  ): Promise<ConfigConflict[]> {
    const conflicts: ConfigConflict[] = []
    const { techStack, dependencyVersions } = projectInfo

    // 检测 React 版本兼容性
    if (techStack === 'react') {
      const reactVersion = dependencyVersions.react
      if (reactVersion && this.isReactVersionIncompatible(reactVersion)) {
        conflicts.push({
          id: 'react-version-incompatible',
          type: 'version-incompatible',
          severity: 'error',
          filePath: 'package.json',
          description: `React 版本 ${reactVersion} 与测试配置不兼容`,
          existingValue: reactVersion,
          newValue: '推荐版本 ^17.0.0 或 ^18.0.0',
          suggestedStrategy: 'manual',
          availableStrategies: ['manual', 'skip'],
        })
      }
    }

    // 检测 Vue 版本兼容性
    if (techStack.startsWith('vue')) {
      const vueVersion = dependencyVersions.vue
      if (vueVersion && this.isVueVersionIncompatible(vueVersion, techStack)) {
        conflicts.push({
          id: 'vue-version-incompatible',
          type: 'version-incompatible',
          severity: 'error',
          filePath: 'package.json',
          description: `Vue 版本 ${vueVersion} 与 ${techStack} 配置不兼容`,
          existingValue: vueVersion,
          newValue: techStack === 'vue2' ? '推荐版本 ^2.6.0' : '推荐版本 ^3.0.0',
          suggestedStrategy: 'manual',
          availableStrategies: ['manual', 'skip'],
        })
      }
    }

    return conflicts
  }

  /**
   * 解决配置冲突
   */
  async resolveConflict(
    conflict: ConfigConflict,
    options: ConflictResolutionOptions
  ): Promise<ConflictResolutionResult> {
    const { strategy } = options
    const result: ConflictResolutionResult = {
      resolved: false,
      strategy,
      filePath: conflict.filePath,
      changes: [],
      errors: [],
    }

    try {
      switch (strategy) {
        case 'merge':
          return await this.mergeConfiguration(conflict, options)
        case 'replace':
          return await this.replaceConfiguration(conflict, options)
        case 'backup':
          return await this.backupAndReplace(conflict, options)
        case 'skip':
          return await this.skipConfiguration(conflict)
        case 'manual':
          return await this.manualResolution(conflict, options)
        default:
          result.errors.push(`不支持的解决策略: ${strategy}`)
      }
    } catch (error) {
      result.errors.push(`解决冲突时发生错误: ${error}`)
    }

    return result
  }

  /**
   * 合并配置
   */
  private async mergeConfiguration(
    conflict: ConfigConflict,
    options: ConflictResolutionOptions
  ): Promise<ConflictResolutionResult> {
    const result: ConflictResolutionResult = {
      resolved: false,
      strategy: 'merge',
      filePath: conflict.filePath,
      changes: [],
      errors: [],
    }

    try {
      const existingContent = await readFile(conflict.filePath, 'utf-8')
      let mergedContent: string

      // 根据文件类型选择合并策略
      if (conflict.filePath.includes('vitest.config')) {
        mergedContent = await this.mergeVitestConfig(existingContent, conflict.newValue, options)
      } else if (conflict.filePath.includes('test-setup')) {
        mergedContent = await this.mergeTestSetup(existingContent, conflict.newValue, options)
      } else if (conflict.filePath.includes('package.json')) {
        mergedContent = await this.mergePackageJson(existingContent, conflict.newValue, options)
      } else {
        throw new Error(`不支持的文件类型: ${conflict.filePath}`)
      }

      // 备份原文件
      if (options.backupOriginal) {
        const backupPath = `${conflict.filePath}.backup.${Date.now()}`
        await copyFile(conflict.filePath, backupPath)
        result.backupPath = backupPath
        result.changes.push(`原文件已备份到: ${backupPath}`)
      }

      // 写入合并后的内容
      await writeFile(conflict.filePath, mergedContent, 'utf-8')
      result.resolved = true
      result.changes.push('配置已成功合并')
    } catch (error) {
      result.errors.push(`合并配置失败: ${error}`)
    }

    return result
  }

  /**
   * 替换配置
   */
  private async replaceConfiguration(
    conflict: ConfigConflict,
    options: ConflictResolutionOptions
  ): Promise<ConflictResolutionResult> {
    const result: ConflictResolutionResult = {
      resolved: false,
      strategy: 'replace',
      filePath: conflict.filePath,
      changes: [],
      errors: [],
    }

    try {
      // 备份原文件
      if (options.backupOriginal) {
        const backupPath = `${conflict.filePath}.backup.${Date.now()}`
        await copyFile(conflict.filePath, backupPath)
        result.backupPath = backupPath
        result.changes.push(`原文件已备份到: ${backupPath}`)
      }

      // 写入新配置
      const newContent =
        typeof conflict.newValue === 'string'
          ? conflict.newValue
          : JSON.stringify(conflict.newValue, null, 2)

      await writeFile(conflict.filePath, newContent, 'utf-8')
      result.resolved = true
      result.changes.push('配置已完全替换')
    } catch (error) {
      result.errors.push(`替换配置失败: ${error}`)
    }

    return result
  }

  /**
   * 备份并替换
   */
  private async backupAndReplace(
    conflict: ConfigConflict,
    options: ConflictResolutionOptions
  ): Promise<ConflictResolutionResult> {
    // 备份并替换与替换策略相同，但强制备份
    return await this.replaceConfiguration(conflict, { ...options, backupOriginal: true })
  }

  /**
   * 跳过配置
   */
  private async skipConfiguration(conflict: ConfigConflict): Promise<ConflictResolutionResult> {
    return {
      resolved: true,
      strategy: 'skip',
      filePath: conflict.filePath,
      changes: ['配置已跳过，保持现有设置'],
      errors: [],
    }
  }

  /**
   * 手动解决
   */
  private async manualResolution(
    conflict: ConfigConflict,
    _options: ConflictResolutionOptions
  ): Promise<ConflictResolutionResult> {
    return {
      resolved: false,
      strategy: 'manual',
      filePath: conflict.filePath,
      changes: ['需要手动解决冲突'],
      errors: ['此冲突需要手动处理'],
    }
  }

  /**
   * 合并 Vitest 配置
   */
  private async mergeVitestConfig(
    existingContent: string,
    newConfig: any,
    _options: ConflictResolutionOptions
  ): Promise<string> {
    // 简化的合并逻辑，实际实现会更复杂
    if (existingContent.includes('export default defineConfig({')) {
      // 尝试智能合并
      const testConfigSection = this.generateTestConfigSection(newConfig)
      return existingContent.replace(
        /export default defineConfig\(\{([\s\S]*?)\}\)/,
        (_match, configContent) => {
          const needsComma = configContent.trim() && !configContent.trim().endsWith(',')
          const separator = needsComma ? ',\n' : '\n'
          return `export default defineConfig({${configContent}${separator}  test: ${testConfigSection}\n})`
        }
      )
    }

    return existingContent
  }

  /**
   * 合并测试设置
   */
  private async mergeTestSetup(
    existingContent: string,
    _newConfig: any,
    _options: ConflictResolutionOptions
  ): Promise<string> {
    // 简化的合并逻辑
    let mergedContent = existingContent

    // 添加缺失的导入
    if (!existingContent.includes('@testing-library/jest-dom')) {
      mergedContent = "import '@testing-library/jest-dom'\n" + mergedContent
    }

    return mergedContent
  }

  /**
   * 合并 package.json
   */
  private async mergePackageJson(
    existingContent: string,
    newConfig: any,
    _options: ConflictResolutionOptions
  ): Promise<string> {
    const existingPackage = JSON.parse(existingContent)

    // 合并脚本
    if (newConfig.scripts) {
      existingPackage.scripts = { ...existingPackage.scripts, ...newConfig.scripts }
    }

    // 合并依赖
    if (newConfig.devDependencies) {
      existingPackage.devDependencies = {
        ...existingPackage.devDependencies,
        ...newConfig.devDependencies,
      }
    }

    return JSON.stringify(existingPackage, null, 2)
  }

  /**
   * 生成测试配置部分
   */
  private generateTestConfigSection(config: any): string {
    return JSON.stringify(config.test || {}, null, 2)
  }

  /**
   * 提取配置值
   */
  private extractConfigValue(content: string, key: string): string | null {
    const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`)
    const match = content.match(regex)
    return match && match[1] ? match[1] : null
  }

  /**
   * 获取框架版本
   */
  private getFrameworkVersion(
    dependencies: Record<string, string>,
    techStack: string
  ): string | null {
    switch (techStack) {
      case 'react':
        return dependencies.react || null
      case 'vue2':
      case 'vue3':
        return dependencies.vue || null
      default:
        return null
    }
  }

  /**
   * 检查版本兼容性
   */
  private checkVersionCompatibility(
    _frameworkVersion: string,
    _techStack: string,
    _newConfigs: Record<string, any>
  ): ConfigConflict[] {
    // 简化的兼容性检查
    return []
  }

  /**
   * 检查 React 版本兼容性
   */
  private isReactVersionIncompatible(version: string): boolean {
    // 简化的版本检查
    const versionMatch = version.match(/(\d+)/)
    if (!versionMatch || !versionMatch[1]) return false
    const majorVersion = parseInt(versionMatch[1])
    return majorVersion < 16
  }

  /**
   * 检查 Vue 版本兼容性
   */
  private isVueVersionIncompatible(version: string, techStack: string): boolean {
    const versionMatch = version.match(/(\d+)/)
    if (!versionMatch || !versionMatch[1]) return false
    const majorVersion = parseInt(versionMatch[1])
    if (techStack === 'vue2') {
      return majorVersion !== 2
    } else if (techStack === 'vue3') {
      return majorVersion !== 3
    }
    return false
  }
}

/**
 * 批量解决冲突
 */
export async function resolveConflicts(
  conflicts: ConfigConflict[],
  globalOptions: ConflictResolutionOptions
): Promise<ConflictResolutionResult[]> {
  const resolver = new ConfigConflictResolver()
  const results: ConflictResolutionResult[] = []

  for (const conflict of conflicts) {
    const result = await resolver.resolveConflict(conflict, globalOptions)
    results.push(result)
  }

  return results
}

/**
 * 交互式冲突解决
 */
export async function interactiveConflictResolution(
  conflicts: ConfigConflict[]
): Promise<ConflictResolutionResult[]> {
  const resolver = new ConfigConflictResolver()
  const results: ConflictResolutionResult[] = []

  for (const conflict of conflicts) {
    console.log(`\n冲突: ${conflict.description}`)
    console.log(`文件: ${conflict.filePath}`)
    console.log(`严重程度: ${conflict.severity}`)
    console.log(`建议策略: ${conflict.suggestedStrategy}`)
    console.log(`可用策略: ${conflict.availableStrategies.join(', ')}`)

    // 在实际实现中，这里会有用户交互逻辑
    const options: ConflictResolutionOptions = {
      strategy: conflict.suggestedStrategy,
      backupOriginal: true,
      preserveComments: true,
    }

    const result = await resolver.resolveConflict(conflict, options)
    results.push(result)
  }

  return results
}
