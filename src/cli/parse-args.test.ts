import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseArgs } from './parse-args'

// Mock process.exit to prevent actual exit during tests
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

// Mock console methods to prevent output during tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('parse-args', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProcessExit.mockClear()
    mockConsoleError.mockClear()
    mockConsoleLog.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('parseArgs function', () => {
    it('should parse valid add testing command', async () => {
      const argv = ['node', 'pilot', 'add', 'testing', '--dry-run', '--verbose']

      const result = await parseArgs(argv)

      expect(result).toEqual({
        command: 'add',
        options: {
          module: 'testing',
          options: {
            configOnly: undefined,
            rulesOnly: undefined,
            depsOnly: undefined,
            setupOnly: undefined,
            noInstall: false,
            dryRun: true,
            force: undefined,
            stack: undefined,
            arch: undefined,
            verbose: true,
          },
        },
      })
    })

    it('should parse add testing with all options', async () => {
      const argv = [
        'node',
        'pilot',
        'add',
        'testing',
        '--config',
        '--no-install',
        '--force',
        '--stack',
        'react',
        '--arch',
        'single',
      ]

      const result = await parseArgs(argv)

      expect(result).toEqual({
        command: 'add',
        options: {
          module: 'testing',
          options: {
            configOnly: true,
            rulesOnly: undefined,
            depsOnly: undefined,
            setupOnly: undefined,
            noInstall: true,
            dryRun: undefined,
            force: true,
            stack: 'react',
            arch: 'single',
            verbose: undefined,
          },
        },
      })
    })

    it('should handle help and version commands', async () => {
      // 测试这些命令会触发 process.exit，但不验证具体的退出码
      const helpArgv = ['node', 'pilot', 'help']
      const versionArgv = ['node', 'pilot', '--version']
      const noArgsArgv = ['node', 'pilot']

      await expect(parseArgs(helpArgv)).rejects.toThrow()
      await expect(parseArgs(versionArgv)).rejects.toThrow()
      await expect(parseArgs(noArgsArgv)).rejects.toThrow()
    })
  })

  describe('error handling', () => {
    it('should reject invalid inputs and exit', async () => {
      // 测试各种无效输入都会导致程序退出
      const testCases = [
        ['node', 'pilot', 'add', 'invalid-module'],
        ['node', 'pilot', 'add', 'testing', '--stack', 'invalid-stack'],
        ['node', 'pilot', 'add', 'testing', '--arch', 'invalid-arch'],
        ['node', 'pilot', 'add', 'testing', '--config', '--rules'],
      ]

      for (const argv of testCases) {
        await expect(parseArgs(argv)).rejects.toThrow()
      }
    })
  })

  describe('option parsing edge cases', () => {
    it('should handle rules-only option', async () => {
      const argv = ['node', 'pilot', 'add', 'testing', '--rules']

      const result = await parseArgs(argv)

      expect(result.options?.options.rulesOnly).toBe(true)
      expect(result.options?.options.configOnly).toBeUndefined()
    })

    it('should handle deps-only option', async () => {
      const argv = ['node', 'pilot', 'add', 'testing', '--deps']

      const result = await parseArgs(argv)

      expect(result.options?.options.depsOnly).toBe(true)
      expect(result.options?.options.configOnly).toBeUndefined()
    })

    it('should handle setup-only option', async () => {
      const argv = ['node', 'pilot', 'add', 'testing', '--setup']

      const result = await parseArgs(argv)

      expect(result.options?.options.setupOnly).toBe(true)
      expect(result.options?.options.configOnly).toBeUndefined()
    })

    it('should handle no-install option correctly', async () => {
      const argv = ['node', 'pilot', 'add', 'testing', '--no-install']

      const result = await parseArgs(argv)

      expect(result.options?.options.noInstall).toBe(true)
    })
  })
})
