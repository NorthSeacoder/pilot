import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner'
import { ProjectCreator, projectTemplates } from '../helpers/project-creator'
import fs from 'fs-extra'
import { join } from 'node:path'

describe('Add Testing Command E2E Tests', () => {
  let cli: CLIRunner
  let projectCreator: ProjectCreator
  let testProjectPath: string

  beforeEach(async () => {
    projectCreator = new ProjectCreator()
    cli = new CLIRunner()
  })

  afterEach(async () => {
    await projectCreator.cleanup()
  })

  describe('React Project Testing Setup', () => {
    beforeEach(async () => {
      testProjectPath = await projectCreator.createProject(projectTemplates.react)
      cli.setCwd(testProjectPath)
    })

    it('should detect React project and configure testing in dry-run mode', async () => {
      const result = await cli.addTesting({ dryRun: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('react')
      expect(result.stdout).toContain('🔍 预览模式')
    })

    it('should generate vitest config for React project in dry-run', async () => {
      const result = await cli.addTesting({ dryRun: true, configOnly: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vitest.config.ts')
      expect(result.stdout).toContain('react')
    })

    it('should show testing dependencies for React project', async () => {
      const result = await cli.addTesting({ dryRun: true, depsOnly: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('@testing-library/react')
      expect(result.stdout).toContain('@testing-library/jest-dom')
      expect(result.stdout).toContain('vitest')
    })

    it('should generate test setup file for React', async () => {
      const result = await cli.addTesting({ dryRun: true, setupOnly: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test-setup.ts')
      expect(result.stdout).toContain('react')
    })
  })

  describe('Vue 3 Project Testing Setup', () => {
    beforeEach(async () => {
      testProjectPath = await projectCreator.createProject(projectTemplates.vue3)
      cli.setCwd(testProjectPath)
    })

    it('should detect Vue 3 project and configure testing', async () => {
      const result = await cli.addTesting({ dryRun: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
      expect(result.stdout).toContain('3')
    })

    it('should show Vue 3 specific dependencies', async () => {
      const result = await cli.addTesting({ dryRun: true, depsOnly: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('@vue/test-utils')
      expect(result.stdout).toContain('vitest')
    })
  })

  describe('Vue 2 Project Testing Setup', () => {
    beforeEach(async () => {
      testProjectPath = await projectCreator.createProject(projectTemplates.vue2)
      cli.setCwd(testProjectPath)
    })

    it('should detect Vue 2 project and configure testing', async () => {
      const result = await cli.addTesting({ dryRun: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
      expect(result.stdout).toContain('2')
    })
  })

  describe('Monorepo Project Testing Setup', () => {
    beforeEach(async () => {
      testProjectPath = await projectCreator.createProject(projectTemplates.monorepo)
      cli.setCwd(testProjectPath)
    })

    it('should detect monorepo structure', async () => {
      const result = await cli.addTesting({ dryRun: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('workspace') // 应该检测到工作区
    })

    it('should handle pnpm workspace configuration', async () => {
      const result = await cli.addTesting({ dryRun: true, arch: 'pnpm-workspace' })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('pnpm')
      expect(result.stdout).toContain('workspace')
    })
  })

  describe('Stack Override', () => {
    beforeEach(async () => {
      // 使用一个基础项目，然后强制指定技术栈
      testProjectPath = await projectCreator.createProject({
        name: 'basic-project',
        packageJson: {
          name: 'basic-project',
          version: '1.0.0',
        },
        files: {},
      })
      cli.setCwd(testProjectPath)
    })

    it('should force React stack when specified', async () => {
      const result = await cli.addTesting({ dryRun: true, stack: 'react' })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('react')
    })

    it('should force Vue 3 stack when specified', async () => {
      const result = await cli.addTesting({ dryRun: true, stack: 'vue3' })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
      expect(result.stdout).toContain('3')
    })

    it('should force Vue 2 stack when specified', async () => {
      const result = await cli.addTesting({ dryRun: true, stack: 'vue2' })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
      expect(result.stdout).toContain('2')
    })
  })

  describe('Configuration Generation', () => {
    beforeEach(async () => {
      testProjectPath = await projectCreator.createProject(projectTemplates.react)
      cli.setCwd(testProjectPath)
    })

    it('should generate AI rules file', async () => {
      const result = await cli.addTesting({ dryRun: true, rulesOnly: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('.cursor/rules')
      expect(result.stdout).toContain('testing-strategy.mdc')
    })

    it('should handle verbose mode output', async () => {
      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('🚀 Pilot')
      expect(result.stdout).toContain('版本:')
      expect(result.stdout).toContain('详细')
    })
  })

  describe('Error Scenarios', () => {
    it('should handle non-existent project directory', async () => {
      // 创建一个存在但没有 package.json 的目录
      const emptyDir = join(projectCreator.getTempDir(), 'no-package-json')
      await fs.ensureDir(emptyDir)
      cli.setCwd(emptyDir)

      const result = await cli.addTesting({ dryRun: true })

      // 应该优雅地处理错误
      expect(result.exitCode).toBe(1)
    })

    it('should handle project without package.json', async () => {
      const emptyProjectPath = join(projectCreator.getTempDir(), 'empty-project')
      await fs.ensureDir(emptyProjectPath)
      cli.setCwd(emptyProjectPath)

      const result = await cli.addTesting({ dryRun: true })

      // 应该提示缺少 package.json
      expect(result.exitCode).toBe(1)
    })
  })
})
