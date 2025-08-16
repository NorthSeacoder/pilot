import { describe, it, expect, beforeAll } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner'

describe('CLI E2E Tests', () => {
  let cli: CLIRunner

  beforeAll(async () => {
    cli = new CLIRunner()
    // 确保项目已构建
    // 注意：在实际测试中，我们假设项目已经构建好了
  })

  describe('Basic Commands', () => {
    it('should show version', async () => {
      const result = await cli.version()

      expect(result.exitCode).toBe(0)
      expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/) // 版本号格式
    })

    it('should show help', async () => {
      const result = await cli.help()

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('🚀 可扩展的前端项目开发体验增强平台')
      expect(result.stdout).toContain('Usage:')
      expect(result.stdout).toContain('pilot')
    })

    it('should show help when no arguments provided', async () => {
      const result = await cli.run([])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('🚀 Pilot')
      expect(result.stdout).toContain('用法:')
    })
  })

  describe('Add Command Validation', () => {
    it('should reject invalid module names', async () => {
      const result = await cli.run(['add', 'invalid-module'])

      expect(result.exitCode).toBe(9)
      expect(result.stderr).toContain('无效的模块名')
      expect(result.stderr).toContain('invalid-module')
    })

    it('should reject invalid stack option', async () => {
      const result = await cli.run(['add', 'testing', '--stack', 'invalid-stack'])

      expect(result.exitCode).toBe(9)
      expect(result.stderr).toContain('无效的技术栈')
      expect(result.stderr).toContain('invalid-stack')
    })

    it('should reject invalid architecture option', async () => {
      const result = await cli.run(['add', 'testing', '--arch', 'invalid-arch'])

      expect(result.exitCode).toBe(9)
      expect(result.stderr).toContain('无效的项目架构')
      expect(result.stderr).toContain('invalid-arch')
    })

    it('should reject conflicting exclusive options', async () => {
      const result = await cli.run(['add', 'testing', '--config', '--rules'])

      expect(result.exitCode).toBe(9)
      expect(result.stderr).toContain('不能同时使用')
    })
  })

  describe('Dry Run Mode', () => {
    it('should execute dry run without making changes', async () => {
      const result = await cli.addTesting({ dryRun: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('预览模式') // 应该包含预览模式的提示
    })

    it('should show verbose output in dry run', async () => {
      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('🚀 Pilot')
      expect(result.stdout).toContain('版本:')
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown options gracefully', async () => {
      const result = await cli.run(['--unknown-option'])

      expect(result.exitCode).toBe(1)
      // Commander.js 会处理未知选项
    })

    it('should provide helpful error messages for missing arguments', async () => {
      const result = await cli.run(['add']) // 缺少模块名

      expect(result.exitCode).toBe(1)
      // Commander.js 会要求提供必需的参数
    })
  })

  describe('Help System', () => {
    it('should show general help', async () => {
      const result = await cli.run(['help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('🚀 Pilot')
      expect(result.stdout).toContain('支持的模块:')
      expect(result.stdout).toContain('testing')
    })

    it('should show add command help', async () => {
      const result = await cli.run(['help', 'add'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('📦 pilot add')
      expect(result.stdout).toContain('添加功能模块')
    })

    it('should show testing module help', async () => {
      const result = await cli.run(['help', 'testing'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('🧪 Testing 模块')
      expect(result.stdout).toContain('测试环境配置')
    })
  })
})
