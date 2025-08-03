import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectProject } from './project-detector'
import type { ModuleOptions } from '../../types'

// Mock the file system operations
vi.mock('find-up')
vi.mock('node:fs/promises')
vi.mock('fs-extra')
vi.mock('./framework-detector')
vi.mock('./architecture-detector')
vi.mock('./package-manager-detector')
vi.mock('./typescript-detector')
vi.mock('./existing-tests-detector')
vi.mock('./dependency-analyzer')

describe('Enhanced Project Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect a React TypeScript project with existing tests', async () => {
    // Mock implementations
    const { findUp } = await import('find-up')
    const { readFile } = await import('node:fs/promises')
    const { detectFramework } = await import('./framework-detector')
    const { detectArchitecture, detectWorkspaceInfo } = await import('./architecture-detector')
    const { detectPackageManager } = await import('./package-manager-detector')
    const { detectTypeScript } = await import('./typescript-detector')
    const { detectExistingTests } = await import('./existing-tests-detector')
    const { analyzeDependencyVersions, getNodeVersion } = await import('./dependency-analyzer')

    vi.mocked(findUp).mockResolvedValue('/test/project/package.json')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      name: 'test-project',
      dependencies: { react: '^18.2.0' },
      devDependencies: { typescript: '^5.0.0', vitest: '^2.0.0' }
    }))
    vi.mocked(detectFramework).mockResolvedValue('react')
    vi.mocked(detectArchitecture).mockResolvedValue('single')
    vi.mocked(detectPackageManager).mockResolvedValue('npm')
    vi.mocked(detectTypeScript).mockResolvedValue(true)
    vi.mocked(detectExistingTests).mockResolvedValue({
      hasExistingTests: true,
      existingTestFrameworks: ['vitest'],
      existingConfigs: []
    })
    vi.mocked(analyzeDependencyVersions).mockResolvedValue({
      react: '^18.2.0',
      typescript: '^5.0.0',
      vitest: '^2.0.0'
    })
    vi.mocked(detectWorkspaceInfo).mockResolvedValue(undefined)
    vi.mocked(getNodeVersion).mockReturnValue('v18.17.1')

    const options: ModuleOptions = {}
    const result = await detectProject(options)

    expect(result).toMatchObject({
      techStack: 'react',
      architecture: 'single',
      packageManager: 'npm',
      isTypeScript: true,
      hasExistingTests: true,
      existingTestFrameworks: ['vitest'],
      nodeVersion: 'v18.17.1'
    })
  })

  it('should handle workspace projects correctly', async () => {
    const { findUp } = await import('find-up')
    const { readFile } = await import('node:fs/promises')
    const { detectFramework } = await import('./framework-detector')
    const { detectArchitecture, detectWorkspaceInfo } = await import('./architecture-detector')
    const { detectPackageManager } = await import('./package-manager-detector')
    const { detectTypeScript } = await import('./typescript-detector')
    const { detectExistingTests } = await import('./existing-tests-detector')
    const { analyzeDependencyVersions, getNodeVersion } = await import('./dependency-analyzer')

    vi.mocked(findUp).mockResolvedValue('/test/workspace/package.json')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      name: 'workspace-root',
      workspaces: ['packages/*']
    }))
    vi.mocked(detectFramework).mockResolvedValue('react')
    vi.mocked(detectArchitecture).mockResolvedValue('yarn-workspace')
    vi.mocked(detectPackageManager).mockResolvedValue('yarn')
    vi.mocked(detectTypeScript).mockResolvedValue(false)
    vi.mocked(detectExistingTests).mockResolvedValue({
      hasExistingTests: false,
      existingTestFrameworks: [],
      existingConfigs: []
    })
    vi.mocked(analyzeDependencyVersions).mockResolvedValue({})
    vi.mocked(detectWorkspaceInfo).mockResolvedValue({
      type: 'yarn',
      packages: [],
      rootPackageJson: { name: 'workspace-root' },
      currentLocation: 'root',
      currentPackage: undefined
    })
    vi.mocked(getNodeVersion).mockReturnValue('v18.17.1')

    const options: ModuleOptions = {}
    const result = await detectProject(options)

    expect(result).toMatchObject({
      techStack: 'react',
      architecture: 'yarn-workspace',
      packageManager: 'yarn',
      isTypeScript: false,
      hasExistingTests: false,
      workspaceInfo: {
        type: 'yarn',
        currentLocation: 'root'
      }
    })
  })

  it('should respect override options', async () => {
    const { findUp } = await import('find-up')
    const { readFile } = await import('node:fs/promises')
    const { detectFramework } = await import('./framework-detector')
    const { detectArchitecture, detectWorkspaceInfo } = await import('./architecture-detector')
    const { detectPackageManager } = await import('./package-manager-detector')
    const { detectTypeScript } = await import('./typescript-detector')
    const { detectExistingTests } = await import('./existing-tests-detector')
    const { analyzeDependencyVersions, getNodeVersion } = await import('./dependency-analyzer')

    vi.mocked(findUp).mockResolvedValue('/test/project/package.json')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({
      name: 'test-project',
      dependencies: { vue: '^3.0.0' }
    }))
    vi.mocked(detectArchitecture).mockResolvedValue('single')
    vi.mocked(detectPackageManager).mockResolvedValue('npm')
    vi.mocked(detectTypeScript).mockResolvedValue(false)
    vi.mocked(detectExistingTests).mockResolvedValue({
      hasExistingTests: false,
      existingTestFrameworks: [],
      existingConfigs: []
    })
    vi.mocked(analyzeDependencyVersions).mockResolvedValue({ vue: '^3.0.0' })
    vi.mocked(detectWorkspaceInfo).mockResolvedValue(undefined)
    vi.mocked(getNodeVersion).mockReturnValue('v18.17.1')

    const options: ModuleOptions = {
      stack: 'react', // Override detected Vue with React
      arch: 'pnpm-workspace' // Override detected single with workspace
    }
    const result = await detectProject(options)

    expect(result.techStack).toBe('react')
    expect(result.architecture).toBe('pnpm-workspace')
    expect(vi.mocked(detectFramework)).not.toHaveBeenCalled()
  })
})