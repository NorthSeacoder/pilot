import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CLIRunner } from '../helpers/cli-runner'
import { ProjectCreator } from '../helpers/project-creator'
// import fs from 'fs-extra'
// import { join } from 'node:path'

describe('Project Detection E2E Tests', () => {
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

  describe('Framework Detection', () => {
    it('should detect React from dependencies', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'react-deps-test',
        packageJson: {
          name: 'react-deps-test',
          dependencies: { react: '^18.0.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('react')
    })

    it('should detect React from devDependencies', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'react-devdeps-test',
        packageJson: {
          name: 'react-devdeps-test',
          devDependencies: { react: '^18.0.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('react')
    })

    it('should detect Vue 3 from version', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'vue3-test',
        packageJson: {
          name: 'vue3-test',
          dependencies: { vue: '^3.2.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
    })

    it('should detect Vue 2 from version', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'vue2-test',
        packageJson: {
          name: 'vue2-test',
          dependencies: { vue: '^2.6.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
    })

    it('should detect Vue through CLI service', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'vue-cli-test',
        packageJson: {
          name: 'vue-cli-test',
          devDependencies: { '@vue/cli-service': '^5.0.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('vue')
    })
  })

  describe('Architecture Detection', () => {
    it('should detect pnpm workspace', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'pnpm-workspace-test',
        packageJson: {
          name: 'pnpm-workspace-test',
          private: true,
        },
        files: {
          'pnpm-workspace.yaml': 'packages:\n  - "packages/*"',
        },
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('pnpm')
    })

    it('should detect yarn workspace', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'yarn-workspace-test',
        packageJson: {
          name: 'yarn-workspace-test',
          private: true,
          workspaces: ['packages/*'],
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('workspace')
    })

    it('should detect single module project', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'single-module-test',
        packageJson: {
          name: 'single-module-test',
          dependencies: { react: '^18.0.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      // 应该不包含 workspace 相关信息
      expect(result.stdout).not.toContain('workspace')
    })
  })

  describe('TypeScript Detection', () => {
    it('should detect TypeScript from dependencies', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'ts-deps-test',
        packageJson: {
          name: 'ts-deps-test',
          dependencies: { react: '^18.0.0' },
          devDependencies: { typescript: '^5.0.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('TypeScript: 是')
    })

    it('should detect TypeScript from tsconfig.json', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'ts-config-test',
        packageJson: {
          name: 'ts-config-test',
          dependencies: { react: '^18.0.0' },
        },
        files: {
          'tsconfig.json': JSON.stringify({
            compilerOptions: {
              target: 'es5',
              strict: true,
            },
          }),
        },
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('TypeScript: 是')
    })
  })

  describe('Existing Tests Detection', () => {
    it('should detect existing Vitest configuration', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'existing-vitest-test',
        packageJson: {
          name: 'existing-vitest-test',
          dependencies: { react: '^18.0.0' },
          devDependencies: { vitest: '^1.0.0' },
        },
        files: {
          'vitest.config.ts': 'export default {}',
        },
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('检测到现有测试配置') // 应该提示已存在配置
    })

    it('should detect existing Jest configuration', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'existing-jest-test',
        packageJson: {
          name: 'existing-jest-test',
          dependencies: { react: '^18.0.0' },
          devDependencies: { jest: '^29.0.0' },
        },
        files: {
          'jest.config.js': 'module.exports = {}',
        },
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('jest') // 应该检测到 Jest
    })
  })

  describe('Package Manager Detection', () => {
    it('should detect pnpm from lock file', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'pnpm-lock-test',
        packageJson: {
          name: 'pnpm-lock-test',
          dependencies: { react: '^18.0.0' },
        },
        files: {
          'pnpm-lock.yaml': '# pnpm lock file',
        },
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('pnpm')
    })

    it('should detect yarn from lock file', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'yarn-lock-test',
        packageJson: {
          name: 'yarn-lock-test',
          dependencies: { react: '^18.0.0' },
        },
        files: {
          'yarn.lock': '# yarn lock file',
        },
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('yarn')
    })

    it('should default to npm when no lock file found', async () => {
      testProjectPath = await projectCreator.createProject({
        name: 'npm-default-test',
        packageJson: {
          name: 'npm-default-test',
          dependencies: { react: '^18.0.0' },
        },
        files: {},
      })
      cli.setCwd(testProjectPath)

      const result = await cli.addTesting({ dryRun: true, verbose: true })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('npm')
    })
  })
})
