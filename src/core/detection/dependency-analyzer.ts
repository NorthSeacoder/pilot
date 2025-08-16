import type { VersionCompatibility, TechStack } from '../../types'
import { extractMajorVersion, extractMinorVersion } from '../../utils/version-utils'

/**
 * 依赖规格定义
 */
export interface DependencySpec {
  name: string
  version?: string
  dev: boolean
  peer?: boolean
  optional?: boolean
}

/**
 * 冲突报告
 */
export interface ConflictReport {
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  resolutions: ConflictResolution[]
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  dependency: string
  existingVersion: string
  requiredVersion: string
  severity: 'error' | 'warning' | 'info'
  description: string
}

/**
 * 冲突解决方案
 */
export interface ConflictResolution {
  type: 'upgrade' | 'downgrade' | 'replace' | 'skip'
  dependency: string
  fromVersion: string
  toVersion: string
  reason: string
}

/**
 * 依赖分析结果
 */
export interface DependencyAnalysis {
  existingDependencies: Record<string, string>
  conflicts: ConflictReport
  recommendations: DependencySpec[]
  compatibilityMatrix: CompatibilityMatrix
}

/**
 * 兼容性矩阵
 */
export interface CompatibilityMatrix {
  [framework: string]: {
    [version: string]: {
      testingLibrary: string
      vitest: string
      jsdom: string
      additionalDeps: DependencySpec[]
    }
  }
}

/**
 * 分析项目依赖版本
 */
export async function analyzeDependencyVersions(packageJson: any): Promise<Record<string, string>> {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const versions: Record<string, string> = {}

  // 直接从 package.json 获取版本信息
  for (const [name, version] of Object.entries(dependencies)) {
    if (typeof version === 'string') {
      versions[name] = version
    }
  }

  return versions
}

/**
 * 全面分析项目依赖
 */
export async function analyzeProjectDependencies(
  packageJson: any,
  techStack: TechStack,
  isTypeScript: boolean
): Promise<DependencyAnalysis> {
  const existingDependencies = await analyzeDependencyVersions(packageJson)
  const compatibilityMatrix = getCompatibilityMatrix()

  // 获取推荐的测试依赖
  const recommendations = getRecommendedDependencies(
    techStack,
    isTypeScript,
    existingDependencies,
    compatibilityMatrix
  )

  // 检测冲突
  const conflicts = detectDependencyConflicts(existingDependencies, recommendations)

  return {
    existingDependencies,
    conflicts,
    recommendations,
    compatibilityMatrix,
  }
}

/**
 * 全面分析项目依赖（使用依赖注入版本）
 */
export async function analyzeProjectDependenciesV2(
  packageJson: any,
  techStack: TechStack,
  isTypeScript: boolean,
  frameworkManager?: {
    getAllDependencies: (techStack: TechStack, version: string, isTS: boolean) => DependencySpec[]
  }
): Promise<DependencyAnalysis> {
  const existingDependencies = await analyzeDependencyVersions(packageJson)
  const compatibilityMatrix = getCompatibilityMatrix()

  // 使用新的 V3 API 获取推荐的测试依赖
  const recommendations = getRecommendedDependenciesV3(
    techStack,
    isTypeScript,
    existingDependencies,
    frameworkManager
  )

  // 检测冲突
  const conflicts = detectDependencyConflicts(existingDependencies, recommendations)

  return {
    existingDependencies,
    conflicts,
    recommendations,
    compatibilityMatrix,
  }
}

/**
 * 获取 Node.js 版本
 */
export function getNodeVersion(): string {
  return process.version
}

/**
 * 获取兼容性矩阵
 */
export function getCompatibilityMatrix(): CompatibilityMatrix {
  return {
    react: {
      '18': {
        testingLibrary: '^14.0.0',
        vitest: '^2.0.0',
        jsdom: '^25.0.0',
        additionalDeps: [
          { name: '@testing-library/react', version: '^14.0.0', dev: true },
          { name: '@testing-library/jest-dom', version: '^6.0.0', dev: true },
          { name: '@testing-library/user-event', version: '^14.0.0', dev: true },
          { name: '@types/react', version: '^18.0.0', dev: true, optional: true },
        ],
      },
      '17': {
        testingLibrary: '^12.0.0',
        vitest: '^1.0.0',
        jsdom: '^22.0.0',
        additionalDeps: [
          { name: '@testing-library/react', version: '^12.0.0', dev: true },
          { name: '@testing-library/jest-dom', version: '^5.0.0', dev: true },
          { name: '@testing-library/user-event', version: '^14.0.0', dev: true },
          { name: '@types/react', version: '^17.0.0', dev: true, optional: true },
        ],
      },
      '16': {
        testingLibrary: '^11.0.0',
        vitest: '^1.0.0',
        jsdom: '^20.0.0',
        additionalDeps: [
          { name: '@testing-library/react', version: '^11.0.0', dev: true },
          { name: '@testing-library/jest-dom', version: '^5.0.0', dev: true },
          { name: '@testing-library/user-event', version: '^13.0.0', dev: true },
          { name: '@types/react', version: '^16.0.0', dev: true, optional: true },
        ],
      },
    },
    vue: {
      '3': {
        testingLibrary: '^7.0.0',
        vitest: '^2.0.0',
        jsdom: '^25.0.0',
        additionalDeps: [
          { name: '@vue/test-utils', version: '^2.0.0', dev: true },
          { name: '@testing-library/vue', version: '^7.0.0', dev: true },
          { name: '@testing-library/jest-dom', version: '^6.0.0', dev: true },
          { name: '@testing-library/user-event', version: '^14.0.0', dev: true },
        ],
      },
      '2': {
        testingLibrary: '^5.0.0',
        vitest: '^1.0.0',
        jsdom: '^22.0.0',
        additionalDeps: [
          { name: '@vue/test-utils', version: '^1.3.0', dev: true },
          { name: '@testing-library/vue', version: '^5.0.0', dev: true },
          { name: '@testing-library/jest-dom', version: '^5.0.0', dev: true },
          { name: '@testing-library/user-event', version: '^14.0.0', dev: true },
          { name: 'vue-template-compiler', version: '^2.7.0', dev: true },
        ],
      },
    },
  }
}

/**
 * 获取推荐的测试依赖
 */
export function getRecommendedDependencies(
  techStack: TechStack,
  isTypeScript: boolean,
  existingDependencies: Record<string, string>,
  compatibilityMatrix: CompatibilityMatrix
): DependencySpec[] {
  const recommendations: DependencySpec[] = []

  // 基础测试依赖
  recommendations.push(
    { name: 'vitest', version: getCompatibleVitestVersion(existingDependencies), dev: true },
    { name: '@vitest/ui', version: '^2.0.0', dev: true }
  )

  // 根据技术栈添加特定依赖
  if (techStack === 'react') {
    const reactVersionString = existingDependencies.react || '^18.0.0'
    const reactVersion = extractMajorVersion(reactVersionString)
    const matrix = compatibilityMatrix.react?.[reactVersion] || compatibilityMatrix.react?.['18']

    if (matrix) {
      recommendations.push(...matrix.additionalDeps)
      recommendations.push({ name: 'jsdom', version: matrix.jsdom, dev: true })
    }
  } else if (techStack === 'vue2' || techStack === 'vue3') {
    const vueVersion = techStack === 'vue3' ? '3' : '2'
    const matrix = compatibilityMatrix.vue?.[vueVersion]

    if (matrix) {
      recommendations.push(...matrix.additionalDeps)
      recommendations.push({ name: 'jsdom', version: matrix.jsdom, dev: true })
    }
  }

  // TypeScript 相关依赖
  if (isTypeScript) {
    recommendations.push(
      { name: '@types/jsdom', version: '^21.0.0', dev: true },
      { name: '@types/node', version: '^20.0.0', dev: true }
    )
  }

  return recommendations
}

/**
 * 使用框架依赖管理器获取推荐依赖（新的推荐方式）
 * @deprecated 使用 getRecommendedDependenciesV3 替代，避免动态导入
 */
export async function getRecommendedDependenciesV2(
  techStack: TechStack,
  isTypeScript: boolean,
  existingDependencies: Record<string, string>
): Promise<DependencySpec[]> {
  // 动态导入框架依赖管理器以避免循环依赖
  const { FrameworkDependencyManager } = await import(
    '../../modules/testing/framework-dependency-manager'
  )

  const recommendations: DependencySpec[] = []

  // 基础测试依赖
  recommendations.push(
    { name: 'vitest', version: getCompatibleVitestVersion(existingDependencies), dev: true },
    { name: '@vitest/ui', version: '^2.0.0', dev: true },
    { name: 'jsdom', version: getCompatibleJsdomVersion(existingDependencies), dev: true }
  )

  // 获取框架版本
  const frameworkVersion = getFrameworkVersion(techStack, existingDependencies)

  // 添加框架特定依赖
  const frameworkDeps = FrameworkDependencyManager.getAllDependencies(
    techStack,
    frameworkVersion,
    isTypeScript
  )

  recommendations.push(...frameworkDeps)

  return recommendations
}

/**
 * 使用依赖注入的推荐依赖获取函数（推荐使用）
 */
export function getRecommendedDependenciesV3(
  techStack: TechStack,
  isTypeScript: boolean,
  existingDependencies: Record<string, string>,
  frameworkManager?: {
    getAllDependencies: (techStack: TechStack, version: string, isTS: boolean) => DependencySpec[]
  }
): DependencySpec[] {
  const recommendations: DependencySpec[] = []

  // 基础测试依赖
  recommendations.push(
    { name: 'vitest', version: getCompatibleVitestVersion(existingDependencies), dev: true },
    { name: '@vitest/ui', version: '^2.0.0', dev: true },
    { name: 'jsdom', version: getCompatibleJsdomVersion(existingDependencies), dev: true }
  )

  // 如果提供了框架管理器，使用它获取框架特定依赖
  if (frameworkManager) {
    const frameworkVersion = getFrameworkVersion(techStack, existingDependencies)
    const frameworkDeps = frameworkManager.getAllDependencies(
      techStack,
      frameworkVersion,
      isTypeScript
    )
    recommendations.push(...frameworkDeps)
  }

  return recommendations
}

/**
 * 获取框架版本
 */
function getFrameworkVersion(
  techStack: TechStack,
  existingDependencies: Record<string, string>
): string {
  switch (techStack) {
    case 'react':
      return existingDependencies.react || '^18.0.0'
    case 'vue2':
    case 'vue3':
      return existingDependencies.vue || (techStack === 'vue3' ? '^3.0.0' : '^2.7.0')
    default:
      return '^1.0.0'
  }
}

/**
 * 获取兼容的 JSDOM 版本
 */
function getCompatibleJsdomVersion(_existingDependencies: Record<string, string>): string {
  const nodeVersion = getNodeVersion()
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0] || '18')

  if (nodeMajor >= 18) {
    return '^25.0.0'
  } else if (nodeMajor >= 16) {
    return '^22.0.0'
  } else {
    return '^20.0.0'
  }
}

/**
 * 检测依赖冲突
 */
export function detectDependencyConflicts(
  existingDependencies: Record<string, string>,
  recommendations: DependencySpec[]
): ConflictReport {
  const conflicts: ConflictInfo[] = []
  const resolutions: ConflictResolution[] = []

  for (const rec of recommendations) {
    const existing = existingDependencies[rec.name]

    if (existing && rec.version) {
      const conflict = analyzeVersionConflict(rec.name, existing, rec.version)

      if (conflict) {
        conflicts.push(conflict)

        // 生成解决方案
        const resolution = generateConflictResolution(
          rec.name,
          existing,
          rec.version,
          conflict.severity
        )
        if (resolution) {
          resolutions.push(resolution)
        }
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    resolutions,
  }
}

/**
 * 分析版本冲突
 */
function analyzeVersionConflict(
  dependency: string,
  existingVersion: string,
  requiredVersion: string
): ConflictInfo | null {
  const existingMajor = extractMajorVersion(existingVersion)
  const requiredMajor = extractMajorVersion(requiredVersion)

  if (existingMajor !== requiredMajor) {
    return {
      dependency,
      existingVersion,
      requiredVersion,
      severity: 'error',
      description: `主版本不兼容: 现有版本 ${existingVersion}, 需要版本 ${requiredVersion}`,
    }
  }

  const existingMinor = extractMinorVersion(existingVersion)
  const requiredMinor = extractMinorVersion(requiredVersion)

  if (existingMinor < requiredMinor) {
    return {
      dependency,
      existingVersion,
      requiredVersion,
      severity: 'warning',
      description: `次版本过低: 现有版本 ${existingVersion}, 建议版本 ${requiredVersion}`,
    }
  }

  return null
}

/**
 * 生成冲突解决方案
 */
function generateConflictResolution(
  dependency: string,
  existingVersion: string,
  requiredVersion: string,
  severity: 'error' | 'warning' | 'info'
): ConflictResolution | null {
  const existingMajor = extractMajorVersion(existingVersion)
  const requiredMajor = extractMajorVersion(requiredVersion)

  if (severity === 'error' && existingMajor !== requiredMajor) {
    return {
      type: 'upgrade',
      dependency,
      fromVersion: existingVersion,
      toVersion: requiredVersion,
      reason: `主版本不兼容，需要升级到 ${requiredVersion}`,
    }
  }

  if (severity === 'warning') {
    return {
      type: 'upgrade',
      dependency,
      fromVersion: existingVersion,
      toVersion: requiredVersion,
      reason: `建议升级到更新版本以获得更好的兼容性`,
    }
  }

  return null
}

/**
 * 获取兼容的 Vitest 版本
 */
function getCompatibleVitestVersion(existingDependencies: Record<string, string>): string {
  const nodeVersion = getNodeVersion()
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0] || '18')

  // 检查是否有 Vite 依赖，确保兼容性
  const viteVersion = existingDependencies.vite
  if (viteVersion) {
    const viteMajor = extractMajorVersion(viteVersion)
    if (viteMajor >= 5) {
      return '^2.0.0'
    } else if (viteMajor >= 4) {
      return '^1.0.0'
    }
  }

  // 基于 Node.js 版本选择
  if (nodeMajor >= 18) {
    return '^2.0.0'
  } else if (nodeMajor >= 16) {
    return '^1.0.0'
  } else {
    return '^0.34.0'
  }
}

// 版本解析函数已移至 ../../utils/version-utils.ts

/**
 * 检测版本兼容性（保持向后兼容）
 */
export function checkVersionCompatibility(
  dependencyVersions: Record<string, string>
): VersionCompatibility {
  const compatibility: VersionCompatibility = {}

  // React 版本兼容性
  if (dependencyVersions.react) {
    const reactVersion = dependencyVersions.react
    compatibility.react = reactVersion

    const majorVersion = extractMajorVersion(reactVersion)
    if (majorVersion >= 18) {
      compatibility.compatibleTestingLibrary = '^14.0.0'
    } else if (majorVersion >= 17) {
      compatibility.compatibleTestingLibrary = '^12.0.0'
    } else {
      compatibility.compatibleTestingLibrary = '^11.0.0'
    }
  }

  // Vue 版本兼容性
  if (dependencyVersions.vue) {
    const vueVersion = dependencyVersions.vue
    compatibility.vue = vueVersion

    const majorVersion = extractMajorVersion(vueVersion)
    if (majorVersion >= 3) {
      compatibility.compatibleTestingLibrary = '^7.0.0'
    } else {
      compatibility.compatibleTestingLibrary = '^5.0.0'
    }
  }

  // TypeScript 版本兼容性
  if (dependencyVersions.typescript) {
    compatibility.typescript = dependencyVersions.typescript
  }

  // 推荐 Vitest 版本
  compatibility.compatibleVitest = getCompatibleVitestVersion(dependencyVersions)

  return compatibility
}
