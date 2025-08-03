import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectTypeScript, getTypeScriptConfig } from './typescript-detector'

// Mock dependencies
vi.mock('fs-extra')
vi.mock('../../utils/error-handler')

describe('TypeScript Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectTypeScript', () => {
    it('应该通过 typescript 依赖检测 TypeScript 项目', async () => {
      const packageJson = {
        devDependencies: { typescript: '^5.0.0' }
      }
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
    })

    it('应该通过 @types/node 依赖检测 TypeScript 项目', async () => {
      const packageJson = {
        devDependencies: { '@types/node': '^20.0.0' }
      }
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
    })

    it('应该检查生产依赖中的 TypeScript', async () => {
      const packageJson = {
        dependencies: { typescript: '^5.0.0' }
      }
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
    })

    it('应该通过 tsconfig.json 检测 TypeScript 项目', async () => {
      const { pathExists } = await import('fs-extra')
      vi.mocked(pathExists).mockResolvedValue(true)

      const packageJson = {}
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
      expect(pathExists).toHaveBeenCalledWith('/test/project/tsconfig.json')
    })

    it('应该通过常见的 TypeScript 文件检测项目', async () => {
      const { pathExists } = await import('fs-extra')
      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.endsWith('src/index.ts'))
      })

      const packageJson = {}
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
    })

    it('应该检查多个 TypeScript 文件位置', async () => {
      const { pathExists } = await import('fs-extra')
      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.endsWith('src/App.tsx'))
      })

      const packageJson = {}
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
    })

    it('当没有 TypeScript 标识时应该返回 false', async () => {
      const { pathExists } = await import('fs-extra')
      vi.mocked(pathExists).mockResolvedValue(false)

      const packageJson = {}
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(false)
    })

    it('应该优先检查依赖而不是文件系统', async () => {
      const { pathExists } = await import('fs-extra')
      // 不调用 pathExists，因为依赖检查应该先命中
      
      const packageJson = {
        devDependencies: { typescript: '^5.0.0' }
      }
      
      const result = await detectTypeScript('/test/project', packageJson)
      expect(result).toBe(true)
      expect(pathExists).not.toHaveBeenCalled()
    })
  })

  describe('getTypeScriptConfig', () => {
    it('应该读取并解析 tsconfig.json', async () => {
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON } = await import('../../utils/error-handler')
      
      vi.mocked(pathExists).mockResolvedValue(true)
      vi.mocked(safeReadFile).mockResolvedValue('{"compilerOptions": {"strict": true}}')
      vi.mocked(safeParseJSON).mockReturnValue({ compilerOptions: { strict: true } })

      const result = await getTypeScriptConfig('/test/project')
      
      expect(pathExists).toHaveBeenCalledWith('/test/project/tsconfig.json')
      expect(safeReadFile).toHaveBeenCalledWith('/test/project/tsconfig.json')
      expect(safeParseJSON).toHaveBeenCalledWith(
        '{"compilerOptions": {"strict": true}}',
        { operation: 'TypeScript配置解析', filePath: '/test/project/tsconfig.json' }
      )
      expect(result).toEqual({ compilerOptions: { strict: true } })
    })

    it('当 tsconfig.json 不存在时应该返回 null', async () => {
      const { pathExists } = await import('fs-extra')
      vi.mocked(pathExists).mockResolvedValue(false)

      const result = await getTypeScriptConfig('/test/project')
      
      expect(result).toBe(null)
    })

    it('当文件读取失败时应该返回 null', async () => {
      const { pathExists } = await import('fs-extra')
      const { safeReadFile } = await import('../../utils/error-handler')
      
      vi.mocked(pathExists).mockResolvedValue(true)
      vi.mocked(safeReadFile).mockResolvedValue(null)

      const result = await getTypeScriptConfig('/test/project')
      
      expect(result).toBe(null)
    })

    it('当 JSON 解析失败时应该返回 null', async () => {
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON } = await import('../../utils/error-handler')
      
      vi.mocked(pathExists).mockResolvedValue(true)
      vi.mocked(safeReadFile).mockResolvedValue('invalid json')
      vi.mocked(safeParseJSON).mockReturnValue(null)

      const result = await getTypeScriptConfig('/test/project')
      
      expect(result).toBe(null)
    })
  })
})