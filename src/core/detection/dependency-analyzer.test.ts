import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeDependencyVersions, getNodeVersion, checkVersionCompatibility } from './dependency-analyzer'
import type { VersionCompatibility } from '../../types'

describe('Dependency Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeDependencyVersions', () => {
    it('应该提取生产依赖版本', async () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0',
          vue: '^3.4.0'
        }
      }
      
      const result = await analyzeDependencyVersions(packageJson)
      
      expect(result).toEqual({
        react: '^18.2.0',
        vue: '^3.4.0'
      })
    })

    it('应该提取开发依赖版本', async () => {
      const packageJson = {
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^2.0.0'
        }
      }
      
      const result = await analyzeDependencyVersions(packageJson)
      
      expect(result).toEqual({
        typescript: '^5.0.0',
        vitest: '^2.0.0'
      })
    })

    it('应该合并生产依赖和开发依赖', async () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0'
        },
        devDependencies: {
          typescript: '^5.0.0'
        }
      }
      
      const result = await analyzeDependencyVersions(packageJson)
      
      expect(result).toEqual({
        react: '^18.2.0',
        typescript: '^5.0.0'
      })
    })

    it('应该处理空的依赖对象', async () => {
      const packageJson = {}
      
      const result = await analyzeDependencyVersions(packageJson)
      
      expect(result).toEqual({})
    })

    it('应该忽略非字符串版本值', async () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0',
          invalid: null,
          another: 123
        }
      }
      
      const result = await analyzeDependencyVersions(packageJson)
      
      expect(result).toEqual({
        react: '^18.2.0'
      })
    })
  })

  describe('getNodeVersion', () => {
    it('应该返回当前 Node.js 版本', () => {
      const originalVersion = process.version
      
      const result = getNodeVersion()
      
      expect(result).toBe(originalVersion)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^v\d+\.\d+\.\d+/)
    })
  })

  describe('checkVersionCompatibility', () => {
    it('应该为 React 18 推荐兼容的 testing-library 版本', () => {
      const dependencyVersions = {
        react: '^18.2.0'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.react).toBe('^18.2.0')
      expect(result.compatibleTestingLibrary).toBe('^14.0.0')
    })

    it('应该为 React 17 推荐兼容的 testing-library 版本', () => {
      const dependencyVersions = {
        react: '^17.0.0'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.react).toBe('^17.0.0')
      expect(result.compatibleTestingLibrary).toBe('^12.0.0')
    })

    it('应该为 Vue 3 推荐兼容的 testing-library 版本', () => {
      const dependencyVersions = {
        vue: '^3.4.0'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.vue).toBe('^3.4.0')
      expect(result.compatibleTestingLibrary).toBe('^7.0.0')
    })

    it('应该为 Vue 2 推荐兼容的 testing-library 版本', () => {
      const dependencyVersions = {
        vue: '^2.7.0'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.vue).toBe('^2.7.0')
      expect(result.compatibleTestingLibrary).toBe('^5.0.0')
    })

    it('应该处理 TypeScript 版本', () => {
      const dependencyVersions = {
        typescript: '^5.0.0'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.typescript).toBe('^5.0.0')
    })

    it('应该基于 Node.js 版本推荐 Vitest 版本', () => {
      // Mock Node.js 版本
      const originalVersion = process.version
      Object.defineProperty(process, 'version', { value: 'v18.17.1' })
      
      const result = checkVersionCompatibility({})
      
      expect(result.compatibleVitest).toBe('^2.0.0')
      
      // 恢复原始版本
      Object.defineProperty(process, 'version', { value: originalVersion })
    })

    it('应该为 Node.js 16 推荐较低的 Vitest 版本', () => {
      const originalVersion = process.version
      Object.defineProperty(process, 'version', { value: 'v16.20.1' })
      
      const result = checkVersionCompatibility({})
      
      expect(result.compatibleVitest).toBe('^1.0.0')
      
      Object.defineProperty(process, 'version', { value: originalVersion })
    })

    it('应该为较低的 Node.js 版本推荐兼容的 Vitest 版本', () => {
      const originalVersion = process.version
      Object.defineProperty(process, 'version', { value: 'v14.21.3' })
      
      const result = checkVersionCompatibility({})
      
      expect(result.compatibleVitest).toBe('^0.34.0')
      
      Object.defineProperty(process, 'version', { value: originalVersion })
    })

    it('应该处理版本字符串中的波浪号前缀', () => {
      const dependencyVersions = {
        react: '~18.2.0'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.compatibleTestingLibrary).toBe('^14.0.0')
    })

    it('应该为默认情况推荐最新版本', () => {
      const dependencyVersions = {
        react: 'latest'
      }
      
      const result = checkVersionCompatibility(dependencyVersions)
      
      expect(result.compatibleTestingLibrary).toBe('^14.0.0')
    })

    it('应该返回正确的类型', () => {
      const result = checkVersionCompatibility({})
      
      // 验证返回类型符合 VersionCompatibility 接口
      const typed: VersionCompatibility = result
      expect(typed).toBeDefined()
    })

    it('应该处理无效的 Node.js 版本格式', () => {
      const originalVersion = process.version
      Object.defineProperty(process, 'version', { value: 'invalid' })
      
      const result = checkVersionCompatibility({})
      
      expect(result.compatibleVitest).toBe('^0.34.0') // 使用默认的后备值
      
      Object.defineProperty(process, 'version', { value: originalVersion })
    })
  })
})