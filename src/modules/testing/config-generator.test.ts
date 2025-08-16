import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { generateVitestConfig, VitestConfigGenerator, type ConfigContext } from './config-generator'
import type { ProjectDetection } from '../../types'

describe('VitestConfigGenerator', () => {
  let tempDir: string
  let generator: VitestConfigGenerator

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
    generator = new VitestConfigGenerator()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('generateConfig', () => {
    it('should generate vitest config for React project', async () => {
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

      const context: ConfigContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {},
      }

      const result = await generator.generateConfig(context)

      expect(result.content).toContain("import react from '@vitejs/plugin-react'")
      expect(result.content).toContain('plugins: [react()]')
      expect(result.content).toContain("environment: 'jsdom'")
      expect(result.filePath).toBe(join(tempDir, 'vitest.config.ts'))
    })

    it('should generate vitest config for Vue 3 project', async () => {
      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'vue3',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'pnpm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
      }

      const context: ConfigContext = {
        projectInfo,
        options: { verbose: true },
        templateVariables: {},
      }

      const result = await generator.generateConfig(context)

      expect(result.content).toContain("import vue from '@vitejs/plugin-vue'")
      expect(result.content).toContain('plugins: [vue()]')
      expect(result.content).toContain("environment: 'jsdom'")
    })

    it('should generate workspace config correctly', async () => {
      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'pnpm-workspace',
        isTypeScript: true,
        hasWorkspace: true,
        packageManager: 'pnpm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0',
        workspaceInfo: {
          type: 'pnpm',
          packages: [],
          rootPackageJson: {},
          currentLocation: 'root',
        },
      }

      const context: ConfigContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {},
      }

      const result = await generator.generateConfig(context)

      expect(result.content).toContain('./test-setup.ts')
      expect(result.content).toContain("import react from '@vitejs/plugin-react'")
    })

    it('should handle existing Vite config without test configuration', async () => {
      const existingConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})`

      const configPath = join(tempDir, 'vite.config.ts')
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

      const context: ConfigContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {},
      }

      const result = await generator.generateConfig(context)

      expect(result.content).toContain('test:')
      expect(result.content).toContain('build:')
      expect(result.backup).toBeDefined()
    })

    it('should detect conflicts with existing Vitest config', async () => {
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

      const context: ConfigContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {},
      }

      const result = await generator.generateConfig(context)

      expect(result.conflicts).toBeDefined()
      expect(result.conflicts!.length).toBeGreaterThan(0)
      expect(result.conflicts![0]!.severity).toBe('warning')
    })

    it('should handle workspace package execution context', async () => {
      const packagePath = join(tempDir, 'packages', 'app')

      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'react',
        architecture: 'pnpm-workspace',
        isTypeScript: true,
        hasWorkspace: true,
        packageManager: 'pnpm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: packagePath,
        nodeVersion: 'v18.17.0',
        workspaceInfo: {
          type: 'pnpm',
          packages: [],
          rootPackageJson: {},
          currentLocation: 'package',
          currentPackage: {
            name: 'app',
            path: packagePath,
            packageJson: {},
          },
        },
      }

      const context: ConfigContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {},
      }

      const result = await generator.generateConfig(context)

      expect(result.filePath).toBe(join(packagePath, 'vitest.config.ts'))
      expect(result.content).toContain("import react from '@vitejs/plugin-react'")
    })
  })

  describe('validateConfig', () => {
    it('should validate correct config', async () => {
      const configContent = `import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom'
  }
})`

      const configPath = join(tempDir, 'vitest.config.ts')
      await writeFile(configPath, configContent, 'utf-8')

      const result = await generator.validateConfig(configPath)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid config', async () => {
      const configContent = `export default {
  plugins: []
}`

      const configPath = join(tempDir, 'vitest.config.ts')
      await writeFile(configPath, configContent, 'utf-8')

      const result = await generator.validateConfig(configPath)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('generateVitestConfig (legacy)', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should maintain backward compatibility', async () => {
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

    await generateVitestConfig(projectInfo, { verbose: false })

    const configPath = join(tempDir, 'vitest.config.ts')
    const configContent = await readFile(configPath, 'utf-8')

    expect(configContent).toContain("import react from '@vitejs/plugin-react'")
    expect(configContent).toContain('plugins: [react()]')
  })
})
