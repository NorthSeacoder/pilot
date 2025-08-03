import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { TestSetupGenerator, generateTestSetup, type TestSetupContext } from './test-setup-generator'
import type { ProjectDetection } from '../../types'

describe('TestSetupGenerator', () => {
  let tempDir: string
  let generator: TestSetupGenerator

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
    generator = new TestSetupGenerator()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('generateSetup', () => {
    it('should generate test setup for React project', async () => {
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
        nodeVersion: 'v18.17.0'
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.content).toContain("import '@testing-library/jest-dom'")
      expect(result.content).toContain("import { cleanup } from '@testing-library/react'")
      expect(result.content).toContain('afterEach(() => {')
      expect(result.content).toContain('cleanup()')
      expect(result.content).toContain('beforeAll(() => {')
      expect(result.filePath).toBe(join(tempDir, 'src', 'test-setup.ts'))
    })

    it('should generate test setup for Vue 2 project', async () => {
      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'vue2',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0'
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.content).toContain("import { cleanup } from '@testing-library/vue'")
      expect(result.content).toContain("import Vue from 'vue'")
      expect(result.content).toContain('Vue.config.productionTip = false')
    })

    it('should generate test setup for Vue 3 project', async () => {
      const projectInfo: ProjectDetection = {
        rootDir: tempDir,
        techStack: 'vue3',
        architecture: 'single',
        isTypeScript: true,
        hasWorkspace: false,
        packageManager: 'npm',
        hasExistingTests: false,
        existingTestFrameworks: [],
        dependencyVersions: {},
        existingConfigs: [],
        currentDir: tempDir,
        nodeVersion: 'v18.17.0'
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.content).toContain("import { cleanup } from '@testing-library/vue'")
      expect(result.content).toContain('global.URL.createObjectURL')
      expect(result.content).toContain('global.URL.revokeObjectURL')
    })

    it('should handle workspace root execution context', async () => {
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
          currentLocation: 'root'
        }
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.filePath).toBe(join(tempDir, 'test-setup.ts'))
      expect(result.content).toContain("import { cleanup } from '@testing-library/react'")
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
            techStack: 'react'
          }
        }
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.filePath).toBe(join(packagePath, 'src', 'test-setup.ts'))
    })

    it('should handle existing setup with conflicts', async () => {
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
        nodeVersion: 'v18.17.0'
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.conflicts).toBeDefined()
      expect(result.conflicts!.length).toBeGreaterThan(0)
      expect(result.conflicts![0].severity).toBe('warning')
    })

    it('should merge with existing setup without conflicts', async () => {
      const existingSetup = `// Some custom setup
console.log('Custom setup loaded')`

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
        nodeVersion: 'v18.17.0'
      }

      const context: TestSetupContext = {
        projectInfo,
        options: { verbose: false },
        templateVariables: {}
      }

      const result = await generator.generateSetup(context)

      expect(result.content).toContain('Custom setup loaded')
      expect(result.content).toContain("import '@testing-library/jest-dom'")
      expect(result.content).toContain('cleanup()')
      expect(result.backup).toBeDefined()
    })
  })

  describe('validateSetup', () => {
    it('should validate correct setup', async () => {
      const setupContent = `import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

beforeAll(() => {
  // Mock setup
})`

      const setupPath = join(tempDir, 'src', 'test-setup.ts')
      await mkdir(join(tempDir, 'src'), { recursive: true })
      await writeFile(setupPath, setupContent, 'utf-8')

      const result = await generator.validateSetup(setupPath)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid setup', async () => {
      const setupContent = `// Incomplete setup
console.log('test')`

      const setupPath = join(tempDir, 'src', 'test-setup.ts')
      await mkdir(join(tempDir, 'src'), { recursive: true })
      await writeFile(setupPath, setupContent, 'utf-8')

      const result = await generator.validateSetup(setupPath)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})

describe('generateTestSetup (legacy)', () => {
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
      nodeVersion: 'v18.17.0'
    }

    await generateTestSetup(projectInfo, { verbose: false })

    const setupPath = join(tempDir, 'src', 'test-setup.ts')
    const setupContent = await readFile(setupPath, 'utf-8')
    
    expect(setupContent).toContain("import '@testing-library/jest-dom'")
    expect(setupContent).toContain("import { cleanup } from '@testing-library/react'")
    expect(setupContent).toContain('cleanup()')
  })

  it('should handle conflicts gracefully', async () => {
    const existingSetup = `import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'

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
      nodeVersion: 'v18.17.0'
    }

    // Should not throw error
    await generateTestSetup(projectInfo, { verbose: false })

    // Content should remain unchanged due to conflicts
    const finalContent = await readFile(setupPath, 'utf-8')
    expect(finalContent).toBe(existingSetup)
  })
})