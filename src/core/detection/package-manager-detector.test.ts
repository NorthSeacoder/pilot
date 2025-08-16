import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectPackageManager } from './package-manager-detector'

// Mock fs-extra
vi.mock('fs-extra')
vi.mock('../../utils/error-handler')

describe('Package Manager Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该检测 pnpm 包管理器', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    // Mock safeAsync 第一次调用返回 true（pnpm检测成功）
    vi.mocked(safeAsync)
      .mockResolvedValueOnce(true) // pnpm 检测
      .mockResolvedValue(false) // 其他检测

    const result = await detectPackageManager('/test/project')

    expect(result).toBe('pnpm')
    expect(safeAsync).toHaveBeenCalledTimes(1) // 只需要检测一次就找到了
  })

  it('应该检测 yarn 包管理器', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    // Mock safeAsync: pnpm false, yarn true
    vi.mocked(safeAsync)
      .mockResolvedValueOnce(false) // pnpm 检测失败
      .mockResolvedValueOnce(true) // yarn 检测成功
      .mockResolvedValue(false) // 其他检测

    const result = await detectPackageManager('/test/project')

    expect(result).toBe('yarn')
    expect(safeAsync).toHaveBeenCalledTimes(2) // pnpm + yarn
  })

  it('应该检测 npm 包管理器', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    // Mock safeAsync: pnpm false, yarn false, npm true
    vi.mocked(safeAsync)
      .mockResolvedValueOnce(false) // pnpm 检测失败
      .mockResolvedValueOnce(false) // yarn 检测失败
      .mockResolvedValueOnce(true) // npm 检测成功

    const result = await detectPackageManager('/test/project')

    expect(result).toBe('npm')
    expect(safeAsync).toHaveBeenCalledTimes(3) // pnpm + yarn + npm
  })

  it('应该优先检测 pnpm', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    // 模拟所有检测都成功，但只有第一个会被执行
    vi.mocked(safeAsync).mockResolvedValue(true)

    const result = await detectPackageManager('/test/project')

    expect(result).toBe('pnpm')
    // 应该先检查 pnpm，找到后就不检查其他的
    expect(safeAsync).toHaveBeenCalledTimes(1)
  })

  it('应该在 yarn 之前检测 pnpm', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    // pnpm 检测失败，yarn 检测成功
    vi.mocked(safeAsync)
      .mockResolvedValueOnce(false) // pnpm 检测失败
      .mockResolvedValueOnce(true) // yarn 检测成功

    const result = await detectPackageManager('/test/project')

    expect(result).toBe('yarn')
    expect(safeAsync).toHaveBeenCalledTimes(2) // pnpm + yarn
  })

  it('应该在没有锁文件时默认返回 npm', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    // 所有检测都失败
    vi.mocked(safeAsync).mockResolvedValue(false)

    const result = await detectPackageManager('/test/project')

    expect(result).toBe('npm') // 默认值
    expect(safeAsync).toHaveBeenCalledTimes(3) // pnpm + yarn + npm 都检测了
  })

  it('应该处理文件检查错误', async () => {
    // 我们需要 mock safeAsync 来模拟错误处理
    const errorHandlerModule = await import('../../utils/error-handler')
    vi.mocked(errorHandlerModule.safeAsync).mockResolvedValue(false)

    const result = await detectPackageManager('/test/project')

    // 当检查失败时，应该返回默认值
    expect(result).toBe('npm')
    // 验证 safeAsync 被调用了 3 次（pnpm, yarn, npm）
    expect(errorHandlerModule.safeAsync).toHaveBeenCalledTimes(3)
  })

  it('应该使用正确的文件路径', async () => {
    const { safeAsync } = await import('../../utils/error-handler')

    vi.mocked(safeAsync).mockResolvedValue(false)

    await detectPackageManager('/custom/project/path')

    // 验证 safeAsync 被正确调用
    expect(safeAsync).toHaveBeenCalledTimes(3)
    // 验证传递给 safeAsync 的上下文包含正确的文件路径
    expect(safeAsync).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      expect.objectContaining({ filePath: '/custom/project/path/pnpm-lock.yaml' }),
      false
    )
  })

  describe('边界条件', () => {
    it('应该处理空字符串路径', async () => {
      const { safeAsync } = await import('../../utils/error-handler')

      vi.mocked(safeAsync).mockResolvedValue(false)

      const result = await detectPackageManager('')

      expect(result).toBe('npm')
      expect(safeAsync).toHaveBeenCalledTimes(3)
    })

    it('应该处理相对路径', async () => {
      const { safeAsync } = await import('../../utils/error-handler')

      vi.mocked(safeAsync).mockResolvedValue(false)

      const result = await detectPackageManager('./relative/path')

      expect(result).toBe('npm')
      expect(safeAsync).toHaveBeenCalledTimes(3)
    })

    it('应该处理路径中的特殊字符', async () => {
      const { safeAsync } = await import('../../utils/error-handler')

      vi.mocked(safeAsync).mockResolvedValue(false)

      const result = await detectPackageManager('/path with spaces/project')

      expect(result).toBe('npm')
      expect(safeAsync).toHaveBeenCalledTimes(3)
    })
  })

  describe('检测优先级', () => {
    it('应该按正确的顺序检测包管理器', async () => {
      const { safeAsync } = await import('../../utils/error-handler')

      vi.mocked(safeAsync).mockResolvedValue(false)

      await detectPackageManager('/test/project')

      // 验证调用次数和顺序
      expect(safeAsync).toHaveBeenCalledTimes(3)
      // 验证第一次调用是 pnpm
      expect(safeAsync).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        expect.objectContaining({ operation: 'pnpm锁文件检测' }),
        false
      )
    })

    it('应该在找到匹配后停止检测', async () => {
      const { safeAsync } = await import('../../utils/error-handler')

      // pnpm 失败，yarn 成功
      vi.mocked(safeAsync)
        .mockResolvedValueOnce(false) // pnpm
        .mockResolvedValueOnce(true) // yarn

      const result = await detectPackageManager('/test/project')

      expect(result).toBe('yarn')
      expect(safeAsync).toHaveBeenCalledTimes(2) // pnpm (false) + yarn (true)
    })
  })
})
