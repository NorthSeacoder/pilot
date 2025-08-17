import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { installTestingModule } from './installer'

describe('Testing Module Integration', () => {
  let tempDir: string
  let projectInfo: ProjectDetection

  beforeEach(async () => {
    // 创建真实的临时项目
    tempDir = await fs.mkdtemp(join(tmpdir(), 'pilot-integration-'))

    // 创建基本的 package.json
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
    }

    await fs.writeFile(join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2))

    // 设置项目信息
    projectInfo = {
      techStack: 'react',
      architecture: 'single',
      packageManager: 'npm',
      isTypeScript: false,
      hasWorkspace: false,
      hasExistingTests: false,
      existingTestFrameworks: [],
      rootDir: tempDir,
      currentDir: tempDir,
      nodeVersion: '18.0.0',
      dependencyVersions: {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
      existingConfigs: [],
    }

    // 切换到临时目录
    process.chdir(tempDir)
  })

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('Complete Installation', () => {
    it('should generate all required files for React project', async () => {
      const options: ModuleOptions = {
        configOnly: false,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true, // 跳过实际的 npm install
        dryRun: false,
        force: false,
        verbose: false,
      }

      await installTestingModule(projectInfo, options)

      // 验证生成的文件
      const expectedFiles = [
        'vitest.config.ts',
        'src/test-setup.ts', // 实际路径是 src/test-setup.ts
        '.cursor/rules/testing-strategy.mdc',
      ]

      for (const file of expectedFiles) {
        const filePath = join(tempDir, file)
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(true)
      }
    })

    it('should generate correct Vitest config for React', async () => {
      const options: ModuleOptions = {
        configOnly: true,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: false,
        force: false,
        verbose: false,
      }

      await installTestingModule(projectInfo, options)

      const configPath = join(tempDir, 'vitest.config.ts')
      const configContent = await fs.readFile(configPath, 'utf-8')

      // 验证配置内容
      expect(configContent).toContain('jsdom')
      expect(configContent).toContain('setupFiles')
      expect(configContent).toContain('./src/test-setup.ts')
    })

    it('should generate correct test setup for React', async () => {
      const options: ModuleOptions = {
        configOnly: false,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: true,
        noInstall: true,
        dryRun: false,
        force: false,
        verbose: false,
      }

      await installTestingModule(projectInfo, options)

      const setupPath = join(tempDir, 'src/test-setup.ts')
      const setupExists = await fs
        .access(setupPath)
        .then(() => true)
        .catch(() => false)
      expect(setupExists).toBe(true)

      if (setupExists) {
        const setupContent = await fs.readFile(setupPath, 'utf-8')
        // 验证设置内容
        expect(setupContent).toContain('@testing-library/jest-dom')
        expect(setupContent).toContain('cleanup')
      }
    })

    it('should generate AI rules file', async () => {
      const options: ModuleOptions = {
        configOnly: false,
        rulesOnly: true,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: false,
        force: false,
        verbose: false,
      }

      await installTestingModule(projectInfo, options)

      const rulesPath = join(tempDir, '.cursor/rules/testing-strategy.mdc')
      const rulesContent = await fs.readFile(rulesPath, 'utf-8')

      // 验证规则内容
      expect(rulesContent).toContain('测试策略')
      expect(rulesContent).toContain('Vitest')
      expect(rulesContent).toContain('@testing-library')
    })
  })

  describe('TypeScript Projects', () => {
    it('should handle TypeScript projects correctly', async () => {
      // 创建 tsconfig.json
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          jsx: 'react-jsx',
        },
      }

      await fs.writeFile(join(tempDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2))

      const tsProjectInfo: ProjectDetection = {
        ...projectInfo,
        isTypeScript: true,
      }

      const options: ModuleOptions = {
        configOnly: true,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: false,
        force: false,
        verbose: false,
      }

      await installTestingModule(tsProjectInfo, options)

      const configPath = join(tempDir, 'vitest.config.ts')
      const configContent = await fs.readFile(configPath, 'utf-8')

      // 验证 TypeScript 相关配置
      expect(configContent).toContain('react')
      expect(configContent).toContain('jsdom')
    })
  })

  describe('Vue Projects', () => {
    it('should generate correct config for Vue3 project', async () => {
      const vueProjectInfo: ProjectDetection = {
        ...projectInfo,
        techStack: 'vue3',
        dependencyVersions: {
          vue: '^3.0.0',
        },
      }

      const options: ModuleOptions = {
        configOnly: true,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: false,
        force: false,
        verbose: false,
      }

      await installTestingModule(vueProjectInfo, options)

      const configPath = join(tempDir, 'vitest.config.ts')
      const configContent = await fs.readFile(configPath, 'utf-8')

      // 验证 Vue 相关配置
      expect(configContent).toContain('vue')
      expect(configContent).toContain('jsdom')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing package.json gracefully', async () => {
      // 删除 package.json
      await fs.unlink(join(tempDir, 'package.json'))

      const options: ModuleOptions = {
        configOnly: true,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: false,
        force: false,
        verbose: false,
      }

      // 应该优雅处理或正常执行（不抛出错误）
      await expect(installTestingModule(projectInfo, options)).resolves.not.toThrow()
    })
  })

  describe('Dry Run Mode', () => {
    it('should not create files in dry run mode', async () => {
      const options: ModuleOptions = {
        configOnly: false,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: true,
        force: false,
        verbose: false,
      }

      await installTestingModule(projectInfo, options)

      // 在 dry run 模式下不应该创建文件
      const configExists = await fs
        .access(join(tempDir, 'vitest.config.ts'))
        .then(() => true)
        .catch(() => false)

      expect(configExists).toBe(false)
    })
  })
})
