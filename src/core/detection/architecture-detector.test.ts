import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectArchitecture, detectWorkspaceInfo } from './architecture-detector'

// Mock dependencies
vi.mock('fs-extra')
vi.mock('node:fs/promises')
vi.mock('glob')
vi.mock('js-yaml')
vi.mock('./framework-detector')
vi.mock('../../utils/error-handler')

describe('Architecture Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectArchitecture', () => {
    it('应该检测 pnpm workspace 架构', async () => {
      const { pathExists } = await import('fs-extra')
      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.endsWith('pnpm-workspace.yaml'))
      })

      const result = await detectArchitecture('/test/project')

      expect(result).toBe('pnpm-workspace')
      expect(pathExists).toHaveBeenCalledWith('/test/project/pnpm-workspace.yaml')
    })

    it('应该检测 yarn workspace 架构', async () => {
      const { pathExists } = await import('fs-extra')
      const { readFile } = await import('node:fs/promises')

      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) return Promise.resolve(false)
        if (filePath.endsWith('package.json')) return Promise.resolve(true)
        return Promise.resolve(false)
      })

      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          workspaces: ['packages/*'],
        })
      )

      const result = await detectArchitecture('/test/project')

      expect(result).toBe('yarn-workspace')
    })

    it('应该检测单模块项目架构', async () => {
      const { pathExists } = await import('fs-extra')
      const { readFile } = await import('node:fs/promises')

      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) return Promise.resolve(false)
        if (filePath.endsWith('package.json')) return Promise.resolve(true)
        return Promise.resolve(false)
      })

      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          name: 'single-project',
        })
      )

      const result = await detectArchitecture('/test/project')

      expect(result).toBe('single')
    })

    it('应该优先检测 pnpm workspace', async () => {
      const { pathExists } = await import('fs-extra')
      const { readFile } = await import('node:fs/promises')

      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          workspaces: ['packages/*'],
        })
      )

      const result = await detectArchitecture('/test/project')

      expect(result).toBe('pnpm-workspace')
      // 不应该读取 package.json，因为 pnpm-workspace.yaml 存在
      expect(readFile).not.toHaveBeenCalled()
    })

    it('应该处理 package.json 读取错误', async () => {
      const { pathExists } = await import('fs-extra')
      const { readFile } = await import('node:fs/promises')

      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) return Promise.resolve(false)
        if (filePath.endsWith('package.json')) return Promise.resolve(true)
        return Promise.resolve(false)
      })

      vi.mocked(readFile).mockRejectedValue(new Error('文件读取失败'))

      const result = await detectArchitecture('/test/project')

      expect(result).toBe('single') // 默认值
    })

    it('应该处理无效的 package.json 格式', async () => {
      const { pathExists } = await import('fs-extra')
      const { readFile } = await import('node:fs/promises')

      vi.mocked(pathExists).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) return Promise.resolve(false)
        if (filePath.endsWith('package.json')) return Promise.resolve(true)
        return Promise.resolve(false)
      })

      vi.mocked(readFile).mockResolvedValue('invalid json')

      const result = await detectArchitecture('/test/project')

      expect(result).toBe('single')
    })
  })

  describe('detectWorkspaceInfo', () => {
    const mockPackageJson = { name: 'root-package' }

    it('应该为单模块项目返回 undefined', async () => {
      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'single')

      expect(result).toBeUndefined()
    })

    it('应该检测 pnpm workspace 信息', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageJson))
      vi.mocked(safeReadFile).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) {
          return Promise.resolve('packages:\n  - "packages/*"')
        }
        if (filePath.endsWith('package.json')) {
          return Promise.resolve('{"name": "test-package"}')
        }
        return Promise.resolve(null)
      })

      vi.mocked(safeParseJSON).mockReturnValue({ name: 'test-package' })
      vi.mocked(safeAsync).mockImplementation((operation) => operation())
      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(glob).mockResolvedValue(['packages/pkg1'])

      const yaml = await import('js-yaml')
      vi.mocked(yaml.load).mockReturnValue({ packages: ['packages/*'] })

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result).toMatchObject({
        type: 'pnpm',
        currentLocation: 'root',
        rootPackageJson: mockPackageJson,
      })
    })

    it('应该检测 yarn workspace 信息', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          ...mockPackageJson,
          workspaces: ['packages/*'],
        })
      )

      vi.mocked(safeReadFile).mockResolvedValue('{"name": "test-package"}')
      vi.mocked(safeParseJSON).mockReturnValue({ name: 'test-package' })
      vi.mocked(safeAsync).mockImplementation((operation) => operation())
      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(glob).mockResolvedValue(['packages/pkg1'])

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'yarn-workspace')

      expect(result).toMatchObject({
        type: 'yarn',
        currentLocation: 'root',
      })
    })

    it('应该检测当前执行位置为包内', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageJson))
      vi.mocked(safeReadFile).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) {
          return Promise.resolve('packages:\n  - "packages/*"')
        }
        return Promise.resolve('{"name": "test-package"}')
      })

      vi.mocked(safeParseJSON).mockReturnValue({ name: 'test-package' })
      vi.mocked(safeAsync).mockImplementation((operation) => operation())
      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(glob).mockResolvedValue(['packages/frontend'])

      const yaml = await import('js-yaml')
      vi.mocked(yaml.load).mockReturnValue({ packages: ['packages/*'] })

      const result = await detectWorkspaceInfo(
        '/test/project',
        '/test/project/packages/frontend',
        'pnpm-workspace'
      )

      expect(result?.currentLocation).toBe('package')
      expect(result?.currentPackage).toMatchObject({
        name: 'test-package',
        path: 'packages/frontend',
      })
    })

    it('应该处理 workspace 配置对象格式', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          ...mockPackageJson,
          workspaces: {
            packages: ['packages/*', 'apps/*'],
          },
        })
      )

      vi.mocked(safeReadFile).mockResolvedValue('{"name": "test-package"}')
      vi.mocked(safeParseJSON).mockReturnValue({ name: 'test-package' })
      vi.mocked(safeAsync).mockImplementation((operation) => operation())
      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(glob).mockResolvedValue([])

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'yarn-workspace')

      expect(result?.packages).toHaveLength(0) // glob mock 返回空数组
    })

    it('应该处理包检测错误', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageJson))
      vi.mocked(safeReadFile).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) {
          return Promise.resolve('packages:\n  - "packages/*"')
        }
        // 模拟包 package.json 读取失败
        return Promise.resolve(null)
      })

      vi.mocked(safeParseJSON).mockReturnValue(null)
      vi.mocked(safeAsync).mockImplementation((operation) => operation())
      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(glob).mockResolvedValue(['packages/pkg1'])

      const yaml = await import('js-yaml')
      vi.mocked(yaml.load).mockReturnValue({ packages: ['packages/*'] })

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result?.packages).toHaveLength(0) // 包检测失败，但不影响整体结果
    })

    it('应该处理 pnpm-workspace.yaml 读取失败', async () => {
      const { readFile } = await import('node:fs/promises')
      const { safeReadFile } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageJson))
      vi.mocked(safeReadFile).mockResolvedValue(null) // 文件读取失败

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result?.packages).toHaveLength(0)
    })

    it('应该处理 yaml 解析失败', async () => {
      const { readFile } = await import('node:fs/promises')
      const { safeReadFile, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageJson))
      vi.mocked(safeReadFile).mockResolvedValue('invalid: yaml: content')
      vi.mocked(safeAsync).mockResolvedValue({}) // yaml 解析失败返回空对象

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result?.packages).toHaveLength(0)
    })
  })

  describe('边界条件和错误处理', () => {
    it('应该处理空的工作区模式数组', async () => {
      const { readFile } = await import('node:fs/promises')
      const { safeReadFile, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ name: 'root' }))
      vi.mocked(safeReadFile).mockResolvedValue('packages: []')
      vi.mocked(safeAsync).mockResolvedValue({ packages: [] })

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result?.packages).toHaveLength(0)
    })

    it('应该处理不存在的工作区目录', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { safeReadFile, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ name: 'root' }))
      vi.mocked(safeReadFile).mockResolvedValue('packages:\n  - "nonexistent/*"')
      vi.mocked(safeAsync).mockResolvedValue({ packages: ['nonexistent/*'] })
      vi.mocked(glob).mockResolvedValue([]) // 没有匹配的目录

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result?.packages).toHaveLength(0)
    })

    it('应该处理 package.json 中缺少 name 字段的包', async () => {
      const { readFile } = await import('node:fs/promises')
      const { glob } = await import('glob')
      const { pathExists } = await import('fs-extra')
      const { safeReadFile, safeParseJSON, safeAsync } = await import('../../utils/error-handler')

      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ name: 'root' }))
      vi.mocked(safeReadFile).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pnpm-workspace.yaml')) {
          return Promise.resolve('packages:\n  - "packages/*"')
        }
        return Promise.resolve('{}') // package.json 没有 name 字段
      })

      vi.mocked(safeParseJSON).mockReturnValue({}) // 空对象
      vi.mocked(safeAsync).mockImplementation((operation) => operation())
      vi.mocked(pathExists).mockResolvedValue(true as any)
      vi.mocked(glob).mockResolvedValue(['packages/unnamed-pkg'])

      const yaml = await import('js-yaml')
      vi.mocked(yaml.load).mockReturnValue({ packages: ['packages/*'] })

      const result = await detectWorkspaceInfo('/test/project', '/test/project', 'pnpm-workspace')

      expect(result?.packages[0]?.name).toBe('unnamed-pkg') // 使用目录名作为后备
    })
  })
})
