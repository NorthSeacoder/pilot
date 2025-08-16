/**
 * 统一的错误处理工具
 */
import type { ErrorContext } from '../types'

/**
 * 安全执行异步操作，统一错误处理
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  fallback: T
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.warn(`[${context.operation}] 操作失败:`, {
      error: error instanceof Error ? error.message : String(error),
      filePath: context.filePath,
      details: context.details,
    })
    return fallback
  }
}

/**
 * 安全执行同步操作，统一错误处理
 */
export function safeSync<T>(operation: () => T, context: ErrorContext, fallback: T): T {
  try {
    return operation()
  } catch (error) {
    console.warn(`[${context.operation}] 操作失败:`, {
      error: error instanceof Error ? error.message : String(error),
      filePath: context.filePath,
      details: context.details,
    })
    return fallback
  }
}

/**
 * 安全的文件读取操作
 */
export async function safeReadFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string | null> {
  return safeAsync(
    async () => {
      const { readFile } = await import('node:fs/promises')
      return await readFile(filePath, encoding)
    },
    { operation: '文件读取', filePath },
    null
  )
}

/**
 * 安全的 JSON 解析操作
 */
export function safeParseJSON<T = any>(content: string, context: ErrorContext): T | null {
  return safeSync(
    () => JSON.parse(content),
    { ...context, operation: `${context.operation} - JSON解析` },
    null
  )
}

/**
 * 批量安全执行操作
 */
export async function safeBatch<T>(
  operations: Array<{
    operation: () => Promise<T>
    context: ErrorContext
    fallback: T
  }>
): Promise<T[]> {
  return Promise.all(
    operations.map(({ operation, context, fallback }) => safeAsync(operation, context, fallback))
  )
}
