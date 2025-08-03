import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectExistingTests } from './existing-tests-detector'

// Mock dependencies
vi.mock('fs-extra')
vi.mock('node:fs/promises')
vi.mock('glob')

describe('Existing Tests Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('测试框架依赖检测', () => {
    it('应该检测 Vitest 框架', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        devDependencies: { vitest: '^2.0.0' }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingTestFrameworks).toContain('vitest')
    })

    it('应该检测 Jest 框架', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        devDependencies: { jest: '^29.0.0' }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingTestFrameworks).toContain('jest')
    })

    it('应该检测 Testing Library 框架', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        devDependencies: { '@testing-library/react': '^14.0.0' }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingTestFrameworks).toContain('testing-library')
    })

    it('应该检测多个测试框架', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        devDependencies: {
          vitest: '^2.0.0',
          '@testing-library/vue': '^7.0.0',
          cypress: '^13.0.0'
        }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingTestFrameworks).toContain('vitest')
      expect(result.existingTestFrameworks).toContain('testing-library')
      expect(result.existingTestFrameworks).toContain('cypress')
    })

    it('应该去重相同的测试框架', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        devDependencies: {
          '@testing-library/react': '^14.0.0',
          '@testing-library/jest-dom': '^6.0.0'
        }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.existingTestFrameworks.filter(f => f === 'testing-library')).toHaveLength(1)
    })

    it('应该检查生产依赖中的测试框架', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        dependencies: { vitest: '^2.0.0' }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingTestFrameworks).toContain('vitest')
    })
  })

  describe('配置文件检测', () => {
    it('应该检测 Vitest 配置文件', async () => {
      const { glob } = await import('glob')
      const { readFile } = await import('node:fs/promises')
      
      vi.mocked(glob).mockImplementation((pattern: string | string[]) => {
        if (pattern === 'vitest.config.*') {
          return Promise.resolve(['vitest.config.ts'])
        }
        return Promise.resolve([])
      })
      vi.mocked(readFile).mockResolvedValue('export default defineConfig({})')

      const result = await detectExistingTests('/test/project', {})
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingConfigs).toHaveLength(1)
      expect(result.existingConfigs[0]?.type).toBe('vitest')
      expect(result.existingConfigs[0]?.filePath).toBe('/test/project/vitest.config.ts')
    })

    it('应该检测 Jest 配置文件', async () => {
      const { glob } = await import('glob')
      const { readFile } = await import('node:fs/promises')
      
      vi.mocked(glob).mockImplementation((pattern: string | string[]) => {
        if (pattern === 'jest.config.*') {
          return Promise.resolve(['jest.config.js'])
        }
        return Promise.resolve([])
      })
      vi.mocked(readFile).mockResolvedValue('module.exports = {}')

      const result = await detectExistingTests('/test/project', {})
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingConfigs).toHaveLength(1)
      expect(result.existingConfigs[0]?.type).toBe('jest')
    })

    it('应该处理文件读取错误', async () => {
      const { glob } = await import('glob')
      const { readFile } = await import('node:fs/promises')
      
      vi.mocked(glob).mockResolvedValue(['vitest.config.ts'])
      vi.mocked(readFile).mockRejectedValue(new Error('File not readable'))

      const result = await detectExistingTests('/test/project', {})
      
      // 即使文件读取失败，也应该继续处理
      expect(result.existingConfigs).toHaveLength(0)
    })
  })

  describe('内联配置检测', () => {
    it('应该检测 package.json 中的 Vitest 配置', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        vitest: {
          globals: true,
          environment: 'jsdom'
        }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingConfigs).toHaveLength(1)
      expect(result.existingConfigs[0]?.type).toBe('vitest')
      expect(result.existingConfigs[0]?.filePath).toBe('/test/project/package.json')
      expect(result.existingConfigs[0]?.content).toEqual({
        globals: true,
        environment: 'jsdom'
      })
    })

    it('应该检测 package.json 中的 Jest 配置', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const packageJson = {
        jest: {
          testEnvironment: 'node',
          collectCoverage: true
        }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingConfigs).toHaveLength(1)
      expect(result.existingConfigs[0]?.type).toBe('jest')
      expect(result.existingConfigs[0]?.content).toEqual({
        testEnvironment: 'node',
        collectCoverage: true
      })
    })
  })

  describe('测试文件检测', () => {
    it('应该检测 .test. 模式的测试文件', async () => {
      const { glob } = await import('glob')
      
      vi.mocked(glob).mockImplementation((pattern: string | string[]) => {
        if (pattern === '**/*.test.*') {
          return Promise.resolve(['src/utils.test.ts', 'tests/api.test.js'])
        }
        return Promise.resolve([])
      })

      const result = await detectExistingTests('/test/project', {})
      
      expect(result.hasExistingTests).toBe(true)
    })

    it('应该检测 .spec. 模式的测试文件', async () => {
      const { glob } = await import('glob')
      
      vi.mocked(glob).mockImplementation((pattern: string | string[]) => {
        if (pattern === '**/*.spec.*') {
          return Promise.resolve(['src/component.spec.ts'])
        }
        return Promise.resolve([])
      })

      const result = await detectExistingTests('/test/project', {})
      
      expect(result.hasExistingTests).toBe(true)
    })

    it('应该检测 __tests__ 目录中的文件', async () => {
      const { glob } = await import('glob')
      
      vi.mocked(glob).mockImplementation((pattern: string | string[]) => {
        if (pattern === '**/__tests__/**/*.*') {
          return Promise.resolve(['src/__tests__/helper.js'])
        }
        return Promise.resolve([])
      })

      const result = await detectExistingTests('/test/project', {})
      
      expect(result.hasExistingTests).toBe(true)
    })

    it('应该忽略 node_modules 和构建目录', async () => {
      const { glob } = await import('glob')
      
      vi.mocked(glob).mockImplementation((_pattern: string | string[], options: any) => {
        if (options?.ignore) {
          expect(options.ignore).toContain('node_modules/**')
          expect(options.ignore).toContain('dist/**')
          expect(options.ignore).toContain('build/**')
        }
        return Promise.resolve([])
      })

      await detectExistingTests('/test/project', {})
    })
  })

  describe('综合检测', () => {
    it('当没有测试相关内容时应该返回 false', async () => {
      const { glob } = await import('glob')
      vi.mocked(glob).mockResolvedValue([])

      const result = await detectExistingTests('/test/project', {})
      
      expect(result.hasExistingTests).toBe(false)
      expect(result.existingTestFrameworks).toHaveLength(0)
      expect(result.existingConfigs).toHaveLength(0)
    })

    it('应该正确组合多种检测结果', async () => {
      const { glob } = await import('glob')
      const { readFile } = await import('node:fs/promises')
      
      vi.mocked(glob).mockImplementation((pattern: string | string[]) => {
        if (pattern === 'vitest.config.*') {
          return Promise.resolve(['vitest.config.ts'])
        }
        if (pattern === '**/*.test.*') {
          return Promise.resolve(['src/app.test.ts'])
        }
        return Promise.resolve([])
      })
      vi.mocked(readFile).mockResolvedValue('export default {}')

      const packageJson = {
        devDependencies: { vitest: '^2.0.0' },
        vitest: { globals: true }
      }
      
      const result = await detectExistingTests('/test/project', packageJson)
      
      expect(result.hasExistingTests).toBe(true)
      expect(result.existingTestFrameworks).toContain('vitest')
      expect(result.existingConfigs).toHaveLength(2) // 文件配置 + 内联配置
    })
  })
})