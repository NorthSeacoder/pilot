import type { TechStack, DependencySpec } from '../../types'
import { extractMajorVersion } from '../../utils/version-utils'

/**
 * 框架特定依赖管理器
 */
export class FrameworkDependencyManager {
  /**
   * 获取 React 项目的测试依赖
   */
  static getReactDependencies(reactVersion: string, isTypeScript: boolean): DependencySpec[] {
    const dependencies: DependencySpec[] = []

    // 基础 React 测试依赖
    dependencies.push(
      {
        name: '@testing-library/react',
        version: this.getReactTestingLibraryVersion(reactVersion),
        dev: true,
      },
      {
        name: '@testing-library/jest-dom',
        version: this.getJestDomVersion(reactVersion),
        dev: true,
      },
      { name: '@testing-library/user-event', version: '^14.0.0', dev: true }
    )

    // TypeScript 相关依赖
    if (isTypeScript) {
      dependencies.push(
        {
          name: '@types/react',
          version: this.getReactTypesVersion(reactVersion),
          dev: true,
          optional: true,
        },
        {
          name: '@types/react-dom',
          version: this.getReactTypesVersion(reactVersion),
          dev: true,
          optional: true,
        }
      )
    }

    return dependencies
  }

  /**
   * 获取 Vue 2 项目的测试依赖
   */
  static getVue2Dependencies(vueVersion: string, isTypeScript: boolean): DependencySpec[] {
    const dependencies: DependencySpec[] = []

    // Vue 2 特定测试依赖
    dependencies.push(
      { name: '@vue/test-utils', version: '^1.3.0', dev: true },
      { name: '@testing-library/vue', version: '^5.0.0', dev: true },
      { name: '@testing-library/jest-dom', version: '^5.0.0', dev: true },
      { name: '@testing-library/user-event', version: '^14.0.0', dev: true },
      {
        name: 'vue-template-compiler',
        version: this.getVueTemplateCompilerVersion(vueVersion),
        dev: true,
      }
    )

    // TypeScript 相关依赖
    if (isTypeScript) {
      dependencies.push(
        { name: '@types/vue', version: '^2.0.0', dev: true, optional: true },
        { name: 'vue-class-component', version: '^7.0.0', dev: true, optional: true }
      )
    }

    return dependencies
  }

  /**
   * 获取 Vue 3 项目的测试依赖
   */
  static getVue3Dependencies(_vueVersion: string, isTypeScript: boolean): DependencySpec[] {
    const dependencies: DependencySpec[] = []

    // Vue 3 特定测试依赖
    dependencies.push(
      { name: '@vue/test-utils', version: '^2.0.0', dev: true },
      { name: '@testing-library/vue', version: '^7.0.0', dev: true },
      { name: '@testing-library/jest-dom', version: '^6.0.0', dev: true },
      { name: '@testing-library/user-event', version: '^14.0.0', dev: true }
    )

    // TypeScript 相关依赖
    if (isTypeScript) {
      dependencies.push({ name: '@vue/tsconfig', version: '^0.4.0', dev: true, optional: true })
    }

    return dependencies
  }

  /**
   * 获取通用 TypeScript 测试依赖
   */
  static getTypeScriptDependencies(): DependencySpec[] {
    return [
      { name: '@types/jsdom', version: '^21.0.0', dev: true },
      { name: '@types/node', version: '^20.0.0', dev: true },
      { name: 'typescript', version: '^5.0.0', dev: true, optional: true },
    ]
  }

  /**
   * 根据技术栈获取框架特定依赖
   */
  static getFrameworkDependencies(
    techStack: TechStack,
    frameworkVersion: string,
    isTypeScript: boolean
  ): DependencySpec[] {
    switch (techStack) {
      case 'react':
        return this.getReactDependencies(frameworkVersion, isTypeScript)
      case 'vue2':
        return this.getVue2Dependencies(frameworkVersion, isTypeScript)
      case 'vue3':
        return this.getVue3Dependencies(frameworkVersion, isTypeScript)
      default:
        return []
    }
  }

  /**
   * 获取所有框架和 TypeScript 依赖
   */
  static getAllDependencies(
    techStack: TechStack,
    frameworkVersion: string,
    isTypeScript: boolean
  ): DependencySpec[] {
    const dependencies: DependencySpec[] = []

    // 添加框架特定依赖
    dependencies.push(...this.getFrameworkDependencies(techStack, frameworkVersion, isTypeScript))

    // 添加 TypeScript 依赖
    if (isTypeScript) {
      dependencies.push(...this.getTypeScriptDependencies())
    }

    return dependencies
  }

  /**
   * 检查依赖是否与框架兼容
   */
  static isDependencyCompatible(
    dependency: string,
    version: string,
    techStack: TechStack,
    frameworkVersion: string
  ): boolean {
    // React 兼容性检查
    if (techStack === 'react') {
      const reactMajor = extractMajorVersion(frameworkVersion)

      if (dependency === '@testing-library/react') {
        const depMajor = extractMajorVersion(version)
        if (reactMajor >= 18 && depMajor < 14) return false
        if (reactMajor === 17 && (depMajor < 12 || depMajor > 13)) return false
        if (reactMajor === 16 && depMajor > 11) return false
      }
    }

    // Vue 兼容性检查
    if (techStack === 'vue2' || techStack === 'vue3') {
      const vueMajor = techStack === 'vue3' ? 3 : 2

      if (dependency === '@vue/test-utils') {
        const depMajor = extractMajorVersion(version)
        if (vueMajor === 3 && depMajor < 2) return false
        if (vueMajor === 2 && depMajor >= 2) return false
      }

      if (dependency === '@testing-library/vue') {
        const depMajor = extractMajorVersion(version)
        if (vueMajor === 3 && depMajor < 7) return false
        if (vueMajor === 2 && depMajor >= 6) return false
      }
    }

    return true
  }

  /**
   * 获取 React Testing Library 版本
   */
  private static getReactTestingLibraryVersion(reactVersion: string): string {
    const major = extractMajorVersion(reactVersion)
    if (major >= 18) return '^14.0.0'
    if (major === 17) return '^12.0.0'
    return '^11.0.0'
  }

  /**
   * 获取 Jest DOM 版本
   */
  private static getJestDomVersion(reactVersion: string): string {
    const major = extractMajorVersion(reactVersion)
    if (major >= 18) return '^6.0.0'
    return '^5.0.0'
  }

  /**
   * 获取 React Types 版本
   */
  private static getReactTypesVersion(reactVersion: string): string {
    const major = extractMajorVersion(reactVersion)
    return `^${major}.0.0`
  }

  /**
   * 获取 Vue Template Compiler 版本
   */
  private static getVueTemplateCompilerVersion(vueVersion: string): string {
    // Vue Template Compiler 版本应该与 Vue 版本匹配
    return vueVersion || '^2.7.0'
  }

  // 版本解析函数已移至 ../../utils/version-utils.ts

  /**
   * 验证依赖配置
   */
  static validateDependencyConfiguration(
    dependencies: DependencySpec[],
    techStack: TechStack,
    frameworkVersion: string
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    // 检查必需的依赖
    const requiredDeps = this.getRequiredDependencies(techStack)
    for (const required of requiredDeps) {
      const found = dependencies.find((dep) => dep.name === required)
      if (!found) {
        issues.push(`缺少必需的依赖: ${required}`)
      }
    }

    // 检查版本兼容性
    for (const dep of dependencies) {
      if (
        dep.version &&
        !this.isDependencyCompatible(dep.name, dep.version, techStack, frameworkVersion)
      ) {
        issues.push(`依赖 ${dep.name}@${dep.version} 与 ${techStack} ${frameworkVersion} 不兼容`)
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  /**
   * 获取必需的依赖列表
   */
  private static getRequiredDependencies(techStack: TechStack): string[] {
    switch (techStack) {
      case 'react':
        return ['@testing-library/react', '@testing-library/jest-dom']
      case 'vue2':
        return ['@vue/test-utils', '@testing-library/vue', 'vue-template-compiler']
      case 'vue3':
        return ['@vue/test-utils', '@testing-library/vue']
      default:
        return []
    }
  }
}
