import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { ConfigConflictResolver, resolveConflicts } from './config-conflict-resolver'
import type {
  ConfigConflict,
  ConflictDetectionContext,
  ConflictResolutionOptions,
} from '../../types'
import type { ProjectDetection } from '../../types'

describe('ConfigConflictResolver', () => {
  let tempDir: string
  let resolver: ConfigConflictResolver

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
    resolver = new ConfigConflictResolver()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('detectConflicts', () => {
    it('should detect Vitest config conflicts', async () => {
      const existingConfig = `import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node'
  }
})`

      const configPath = join(tempDir, 'vitest.config.ts')
      await writeFile(configPath, existingConfig, 'utf-8')

      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConflictDetectionContext = {
        projectInfo,
        options: { verbose: false },
        targetFiles: [configPath],
        newConfigs: {
          'vitest.config.ts': {
            test: {
              environment: 'jsdom',
              globals: true,
            },
          },
        },
      }

      const conflicts = await resolver.detectConflicts(context)

      expect(conflicts.length).toBeGreaterThan(0)
      expect(conflicts.some((c) => c.type === 'config-exists')).toBe(true)
      expect(conflicts.some((c) => c.id === 'vitest-config-exists')).toBe(true)
    })

    it('should detect test setup conflicts', async () => {
      const existingSetup = `import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})`

      const setupPath = join(tempDir, 'src', 'test-setup.ts')
      await mkdir(join(tempDir, 'src'), { recursive: true })
      await writeFile(setupPath, existingSetup, 'utf-8')

      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConflictDetectionContext = {
        projectInfo,
        options: { verbose: false },
        targetFiles: [setupPath],
        newConfigs: {
          'test-setup.ts': 'new setup content',
        },
      }

      const conflicts = await resolver.detectConflicts(context)

      expect(conflicts.length).toBeGreaterThan(0)
      expect(conflicts.some((c) => c.type === 'setup-conflict')).toBe(true)
      expect(conflicts.some((c) => c.id === 'testing-library-exists')).toBe(true)
    })

    it('should detect package.json conflicts', async () => {
      const existingPackage = {
        name: 'test-project',
        scripts: {
          test: 'jest',
          build: 'webpack',
        },
        devDependencies: {
          jest: '^28.0.0',
          webpack: '^5.0.0',
        },
      }

      const packagePath = join(tempDir, 'package.json')
      await writeFile(packagePath, JSON.stringify(existingPackage, null, 2), 'utf-8')

      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: existingPackage.devDependencies,
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConflictDetectionContext = {
        projectInfo,
        options: { verbose: false },
        targetFiles: [packagePath],
        newConfigs: {
          'package.json': {
            scripts: {
              test: 'vitest',
              'test:ui': 'vitest --ui',
            },
            devDependencies: {
              vitest: '^1.0.0',
              jest: '^29.0.0',
            },
          },
        },
      }

      const conflicts = await resolver.detectConflicts(context)

      expect(conflicts.length).toBeGreaterThan(0)
      expect(conflicts.some((c) => c.id === 'script-conflict-test')).toBe(true)
      expect(conflicts.some((c) => c.id === 'dependency-conflict-jest')).toBe(true)
    })

    it('should detect framework version incompatibility', async () => {
      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {
          react: '^15.0.0', // Incompatible version
        },
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConflictDetectionContext = {
        projectInfo,
        options: { verbose: false },
        targetFiles: [],
        newConfigs: {},
      }

      const conflicts = await resolver.detectConflicts(context)

      expect(conflicts.some((c) => c.type === 'version-incompatible')).toBe(true)
      expect(conflicts.some((c) => c.id === 'react-version-incompatible')).toBe(true)
    })
  })

  describe('resolveConflict', () => {
    it('should merge Vitest configuration', async () => {
      const existingConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})`

      const configPath = join(tempDir, 'vitest.config.ts')
      await writeFile(configPath, existingConfig, 'utf-8')

      const conflict: ConfigConflict = {
        id: 'vitest-config-merge',
        type: 'config-exists',
        severity: 'warning',
        filePath: configPath,
        description: '需要合并 Vitest 配置',
        existingValue: existingConfig,
        newValue: {
          test: {
            environment: 'jsdom',
            globals: true,
          },
        },
        suggestedStrategy: 'merge',
        availableStrategies: ['merge', 'replace', 'backup'],
      }

      const options: ConflictResolutionOptions = {
        strategy: 'merge',
        backupOriginal: true,
        preserveComments: true,
      }

      const result = await resolver.resolveConflict(conflict, options)

      expect(result.resolved).toBe(true)
      expect(result.strategy).toBe('merge')
      expect(result.backupPath).toBeDefined()

      const mergedContent = await readFile(configPath, 'utf-8')
      expect(mergedContent).toContain('test:')
      expect(mergedContent).toContain('build:')
    })

    it('should replace configuration', async () => {
      const existingConfig = `export default { old: 'config' }`
      const configPath = join(tempDir, 'test.config.ts')
      await writeFile(configPath, existingConfig, 'utf-8')

      const conflict: ConfigConflict = {
        id: 'config-replace',
        type: 'config-exists',
        severity: 'warning',
        filePath: configPath,
        description: '需要替换配置',
        existingValue: existingConfig,
        newValue: 'export default { new: "config" }',
        suggestedStrategy: 'replace',
        availableStrategies: ['replace', 'backup'],
      }

      const options: ConflictResolutionOptions = {
        strategy: 'replace',
        backupOriginal: true,
        preserveComments: true,
      }

      const result = await resolver.resolveConflict(conflict, options)

      expect(result.resolved).toBe(true)
      expect(result.backupPath).toBeDefined()

      const newContent = await readFile(configPath, 'utf-8')
      expect(newContent).toContain('new: "config"')
      expect(newContent).not.toContain('old: "config"')
    })

    it('should skip configuration', async () => {
      const existingConfig = `export default { existing: 'config' }`
      const configPath = join(tempDir, 'test.config.ts')
      await writeFile(configPath, existingConfig, 'utf-8')

      const conflict: ConfigConflict = {
        id: 'config-skip',
        type: 'config-exists',
        severity: 'info',
        filePath: configPath,
        description: '跳过配置',
        existingValue: existingConfig,
        newValue: 'new config',
        suggestedStrategy: 'skip',
        availableStrategies: ['skip', 'merge'],
      }

      const options: ConflictResolutionOptions = {
        strategy: 'skip',
        backupOriginal: false,
        preserveComments: true,
      }

      const result = await resolver.resolveConflict(conflict, options)

      expect(result.resolved).toBe(true)
      expect(result.strategy).toBe('skip')

      const unchangedContent = await readFile(configPath, 'utf-8')
      expect(unchangedContent).toBe(existingConfig)
    })

    it('should handle manual resolution', async () => {
      const conflict: ConfigConflict = {
        id: 'manual-conflict',
        type: 'version-incompatible',
        severity: 'error',
        filePath: join(tempDir, 'package.json'),
        description: '需要手动解决',
        existingValue: 'old value',
        newValue: 'new value',
        suggestedStrategy: 'manual',
        availableStrategies: ['manual'],
      }

      const options: ConflictResolutionOptions = {
        strategy: 'manual',
        backupOriginal: false,
        preserveComments: true,
      }

      const result = await resolver.resolveConflict(conflict, options)

      expect(result.resolved).toBe(false)
      expect(result.strategy).toBe('manual')
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('batch resolution', () => {
    it('should resolve multiple conflicts', async () => {
      const conflicts: ConfigConflict[] = [
        {
          id: 'conflict-1',
          type: 'config-exists',
          severity: 'warning',
          filePath: join(tempDir, 'config1.ts'),
          description: 'First conflict',
          existingValue: 'old1',
          newValue: 'new1',
          suggestedStrategy: 'skip',
          availableStrategies: ['skip'],
        },
        {
          id: 'conflict-2',
          type: 'setup-conflict',
          severity: 'info',
          filePath: join(tempDir, 'config2.ts'),
          description: 'Second conflict',
          existingValue: 'old2',
          newValue: 'new2',
          suggestedStrategy: 'skip',
          availableStrategies: ['skip'],
        },
      ]

      const options: ConflictResolutionOptions = {
        strategy: 'skip',
        backupOriginal: false,
        preserveComments: true,
      }

      const results = await resolveConflicts(conflicts, options)

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.resolved)).toBe(true)
      expect(results.every((r) => r.strategy === 'skip')).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle file read errors', async () => {
      const nonExistentPath = join(tempDir, 'nonexistent.ts')

      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConflictDetectionContext = {
        projectInfo,
        options: { verbose: false },
        targetFiles: [nonExistentPath],
        newConfigs: {
          'nonexistent.ts': 'new config',
        },
      }

      const conflicts = await resolver.detectConflicts(context)

      // Should not throw error, should return empty conflicts for non-existent files
      expect(conflicts).toHaveLength(0)
    })

    it('should handle invalid JSON in package.json', async () => {
      const invalidJson = '{ invalid json content'
      const packagePath = join(tempDir, 'package.json')
      await writeFile(packagePath, invalidJson, 'utf-8')

      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConflictDetectionContext = {
        projectInfo,
        options: { verbose: false },
        targetFiles: [packagePath],
        newConfigs: {
          'package.json': { scripts: { test: 'vitest' } },
        },
      }

      const conflicts = await resolver.detectConflicts(context)

      expect(conflicts.some((c) => c.id === 'package-json-parse-error')).toBe(true)
      expect(conflicts.some((c) => c.severity === 'error')).toBe(true)
    })
  })
})
