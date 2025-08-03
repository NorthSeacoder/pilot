import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  safeAsync, 
  safeSync, 
  safeReadFile, 
  safeParseJSON, 
  safeBatch 
} from './error-handler'

describe('Error Handler Utils', () => {
  // Mock console.warn to avoid cluttering test output
  const originalWarn = console.warn
  beforeEach(() => {
    console.warn = vi.fn()
  })

  afterEach(() => {
    console.warn = originalWarn
    vi.restoreAllMocks()
  })

  describe('safeAsync', () => {
    it('应该成功执行异步操作', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const context = { operation: '测试操作' }
      
      const result = await safeAsync(operation, context, 'fallback')
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledOnce()
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('应该在错误时返回fallback值', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('测试错误'))
      const context = { operation: '测试操作', filePath: '/test/file.txt' }
      
      const result = await safeAsync(operation, context, 'fallback')
      
      expect(result).toBe('fallback')
      expect(console.warn).toHaveBeenCalledWith(
        '[测试操作] 操作失败:',
        expect.objectContaining({
          error: '测试错误',
          filePath: '/test/file.txt'
        })
      )
    })

    it('应该处理非Error类型的异常', async () => {
      const operation = vi.fn().mockRejectedValue('字符串错误')
      const context = { operation: '测试操作' }
      
      const result = await safeAsync(operation, context, 'fallback')
      
      expect(result).toBe('fallback')
      expect(console.warn).toHaveBeenCalledWith(
        '[测试操作] 操作失败:',
        expect.objectContaining({
          error: '字符串错误'
        })
      )
    })

    it('应该包含详细信息在错误日志中', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('错误'))
      const context = {
        operation: '测试操作',
        filePath: '/test/file.txt',
        details: { key: 'value' }
      }
      
      await safeAsync(operation, context, 'fallback')
      
      expect(console.warn).toHaveBeenCalledWith(
        '[测试操作] 操作失败:',
        expect.objectContaining({
          details: { key: 'value' }
        })
      )
    })
  })

  describe('safeSync', () => {
    it('应该成功执行同步操作', () => {
      const operation = vi.fn().mockReturnValue('success')
      const context = { operation: '同步测试' }
      
      const result = safeSync(operation, context, 'fallback')
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledOnce()
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('应该在错误时返回fallback值', () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('同步错误')
      })
      const context = { operation: '同步测试' }
      
      const result = safeSync(operation, context, 'fallback')
      
      expect(result).toBe('fallback')
      expect(console.warn).toHaveBeenCalledWith(
        '[同步测试] 操作失败:',
        expect.objectContaining({
          error: '同步错误'
        })
      )
    })
  })

  describe('safeReadFile', () => {
    it('应该成功读取文件', async () => {
      // Mock node:fs/promises
      const mockReadFile = vi.fn().mockResolvedValue('文件内容')
      vi.doMock('node:fs/promises', () => ({
        readFile: mockReadFile
      }))

      const result = await safeReadFile('/test/file.txt')
      
      expect(result).toBe('文件内容')
      expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8')
    })

    it('应该在文件读取失败时返回null', async () => {
      const mockReadFile = vi.fn().mockRejectedValue(new Error('文件不存在'))
      vi.doMock('node:fs/promises', () => ({
        readFile: mockReadFile
      }))

      const result = await safeReadFile('/test/nonexistent.txt')
      
      expect(result).toBe(null)
      expect(console.warn).toHaveBeenCalledWith(
        '[文件读取] 操作失败:',
        expect.objectContaining({
          error: '文件不存在',
          filePath: '/test/nonexistent.txt'
        })
      )
    })

    it('应该支持自定义编码', async () => {
      const mockReadFile = vi.fn().mockResolvedValue('内容')
      vi.doMock('node:fs/promises', () => ({
        readFile: mockReadFile
      }))

      await safeReadFile('/test/file.txt', 'ascii')
      
      expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', 'ascii')
    })
  })

  describe('safeParseJSON', () => {
    it('应该成功解析有效的JSON', () => {
      const jsonString = '{"key": "value"}'
      const context = { operation: 'JSON解析测试' }
      
      const result = safeParseJSON(jsonString, context)
      
      expect(result).toEqual({ key: 'value' })
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('应该在JSON解析失败时返回null', () => {
      const invalidJson = '{ invalid json }'
      const context = { operation: 'JSON解析测试', filePath: '/test/config.json' }
      
      const result = safeParseJSON(invalidJson, context)
      
      expect(result).toBe(null)
      expect(console.warn).toHaveBeenCalledWith(
        '[JSON解析测试 - JSON解析] 操作失败:',
        expect.objectContaining({
          filePath: '/test/config.json'
        })
      )
    })

    it('应该处理复杂的JSON结构', () => {
      const complexJson = JSON.stringify({
        array: [1, 2, 3],
        nested: { deep: { value: true } },
        nullValue: null
      })
      const context = { operation: '复杂JSON解析' }
      
      const result = safeParseJSON(complexJson, context)
      
      expect(result).toEqual({
        array: [1, 2, 3],
        nested: { deep: { value: true } },
        nullValue: null
      })
    })

    it('应该支持泛型类型', () => {
      interface TestType {
        name: string
        age: number
      }
      
      const jsonString = '{"name": "test", "age": 25}'
      const context = { operation: '类型化JSON解析' }
      
      const result = safeParseJSON<TestType>(jsonString, context)
      
      expect(result?.name).toBe('test')
      expect(result?.age).toBe(25)
    })
  })

  describe('safeBatch', () => {
    it('应该并行执行多个操作', async () => {
      const operations = [
        {
          operation: vi.fn().mockResolvedValue('result1'),
          context: { operation: '操作1' },
          fallback: 'fallback1'
        },
        {
          operation: vi.fn().mockResolvedValue('result2'),
          context: { operation: '操作2' },
          fallback: 'fallback2'
        }
      ]
      
      const results = await safeBatch(operations)
      
      expect(results).toEqual(['result1', 'result2'])
      expect(operations[0].operation).toHaveBeenCalledOnce()
      expect(operations[1].operation).toHaveBeenCalledOnce()
    })

    it('应该处理部分操作失败的情况', async () => {
      const operations = [
        {
          operation: vi.fn().mockResolvedValue('success'),
          context: { operation: '成功操作' },
          fallback: 'fallback1'
        },
        {
          operation: vi.fn().mockRejectedValue(new Error('失败')),
          context: { operation: '失败操作' },
          fallback: 'fallback2'
        }
      ]
      
      const results = await safeBatch(operations)
      
      expect(results).toEqual(['success', 'fallback2'])
      expect(console.warn).toHaveBeenCalledWith(
        '[失败操作] 操作失败:',
        expect.objectContaining({
          error: '失败'
        })
      )
    })

    it('应该处理空操作数组', async () => {
      const results = await safeBatch([])
      
      expect(results).toEqual([])
    })

    it('应该保持操作结果的顺序', async () => {
      const operations = [
        {
          operation: () => new Promise(resolve => setTimeout(() => resolve('slow'), 100)),
          context: { operation: '慢操作' },
          fallback: 'fallback1'
        },
        {
          operation: () => Promise.resolve('fast'),
          context: { operation: '快操作' },
          fallback: 'fallback2'
        }
      ]
      
      const results = await safeBatch(operations)
      
      expect(results).toEqual(['slow', 'fast'])
    })
  })
})