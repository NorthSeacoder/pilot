import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { generateVitestConfig } from './config-generator'
import type { ProjectDetection } from '../../types'

describe('generateVitestConfig', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

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
      nodeVersion: 'v18.17.0'
    }

    await generateVitestConfig(projectInfo, { verbose: false })

    // Check config file
    const configPath = join(tempDir, 'vitest.config.ts')
    const configContent = await readFile(configPath, 'utf-8')
    
    expect(configContent).toContain("import react from '@vitejs/plugin-react'")
    expect(configContent).toContain('plugins: [react()]')

    // Check setup file
    const setupPath = join(tempDir, 'src', 'test-setup.ts')
    const setupContent = await readFile(setupPath, 'utf-8')
    
    expect(setupContent).toContain("import { cleanup } from '@testing-library/react'")
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
      nodeVersion: 'v18.17.0'
    }

    await generateVitestConfig(projectInfo, { verbose: true })

    // Check config file
    const configPath = join(tempDir, 'vitest.config.ts')
    const configContent = await readFile(configPath, 'utf-8')
    
    expect(configContent).toContain("import vue from '@vitejs/plugin-vue'")
    expect(configContent).toContain('plugins: [vue()]')

    // Check setup file
    const setupPath = join(tempDir, 'src', 'test-setup.ts')
    const setupContent = await readFile(setupPath, 'utf-8')
    
    expect(setupContent).toContain("import { cleanup } from '@testing-library/vue'")
  })

  it('should handle workspace projects correctly', async () => {
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
      nodeVersion: 'v18.17.0'
    }

    await generateVitestConfig(projectInfo, { verbose: false })

    // Check config file uses workspace template
    const configPath = join(tempDir, 'vitest.config.ts')
    const configContent = await readFile(configPath, 'utf-8')
    
    expect(configContent).toContain('./test-setup.ts')

    // Check setup file is in root for workspace
    const setupPath = join(tempDir, 'test-setup.ts')
    const setupContent = await readFile(setupPath, 'utf-8')
    
    expect(setupContent).toContain("import { cleanup } from '@testing-library/react'")
  })

  it('should skip generation if config already exists', async () => {
    // Create existing config file
    const existingConfigPath = join(tempDir, 'vitest.config.ts')
    await require('fs/promises').writeFile(existingConfigPath, 'export default {}', 'utf-8')

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

    await generateVitestConfig(projectInfo, { verbose: false })

    // Config should remain unchanged
    const configContent = await readFile(existingConfigPath, 'utf-8')
    expect(configContent).toBe('export default {}')
  })
})