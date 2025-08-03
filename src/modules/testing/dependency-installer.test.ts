import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import { DependencyInstaller, installDependencies } from './dependency-installer'
import type { ProjectDetection, ModuleOptions } from '../../types'

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn()
}))

// Mock fs promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn()
}))

const mockExeca = vi.mocked(await import('execa')).execa
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)

describe('dependency-installer', () => {
  let mockProjectInfo: ProjectDetection
  let mockPackageJson: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockProjectInfo = {
      techStack: 'react',
      architecture: 'single',
      rootDir: '/test/project',
      packageManager: 'npm',
      isTypeScript: false,
      hasWorkspace: false,
      hasExistingTests: false,
      existingTestFrameworks: [],
      dependencyVersions: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      existingConfigs: [],
      currentDir: '/test/project',
      nodeVersion: 'v18.17.0'
    }

    mockPackageJson = {
      name: 'test-project',
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {}
    }

    mockReadFile.mockResolvedValue(JSON.stringify(mockPackageJson, null, 2))
    mockExeca.mockResolvedValue({ stdout: '', stderr: '' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('DependencyInstaller', () => {
    describe('installDependencies', () => {
      it('should install missing dependencies', async () => {
        const installer = new DependencyInstaller(mockProjectInfo, { verbose: true })
        const result = await installer.installDependencies()

        expect(result.success).toBe(true)
        expect(result.installed.length).toBeGreaterThan(0)
        expect(result.failed).toHaveLength(0)
        expect(mockExeca).toHaveBeenCalled()
      })

      it('should skip existing dependencies in incremental mode', async () => {
        mockPackageJson.devDependencies = {
          vitest: '^2.0.0',
          '@vitest/ui': '^2.0.0',
          '@testing-library/react': '^14.0.0',
          '@testing-library/jest-dom': '^6.0.0',
          '@testing-library/user-event': '^14.0.0',
          jsdom: '^25.0.0'
        }
        mockReadFile.mockResolvedValue(JSON.stringify(mockPackageJson, null, 2))

        const installer = new DependencyInstaller(mockProjectInfo, { 
          incremental: true,
          verbose: true 
        })
        const result = await installer.installDependencies()

        expect(result.success).toBe(true)
        expect(result.skipped.length).toBeGreaterThan(0)
      })

      it('should create backup when requested', async () => {
        const installer = new DependencyInstaller(mockProjectInfo, { 
          backup: true,
          verbose: true 
        })
        await installer.installDependencies()

        expect(mockWriteFile).toHaveBeenCalledWith(
          expect.stringMatching(/package\.json\.backup\.\d+$/),
          expect.any(String),
          'utf-8'
        )
      })

      it('should handle dry run mode', async () => {
        const installer = new DependencyInstaller(mockProjectInfo, { 
          dryRun: true,
          verbose: true 
        })
        const result = await installer.installDependencies()

        expect(result.success).toBe(true)
        expect(mockExeca).not.toHaveBeenCalled()
        expect(result.installed.length).toBeGreaterThan(0)
      })

      it('should use correct package.json path for workspace projects', async () => {
        const workspaceProjectInfo: ProjectDetection = {
          ...mockProjectInfo,
          hasWorkspace: true,
          workspaceInfo: {
            type: 'pnpm',
            packages: [],
            rootPackageJson: {},
            currentLocation: 'package',
            currentPackage: {
              name: 'sub-package',
              path: '/test/project/packages/sub-package',
              packageJson: mockPackageJson,
              techStack: 'react'
            }
          }
        }

        const installer = new DependencyInstaller(workspaceProjectInfo, { verbose: true })
        await installer.installDependencies()

        expect(mockReadFile).toHaveBeenCalledWith(
          '/test/project/packages/sub-package/package.json',
          'utf-8'
        )
      })

      it('should use workspace root when specified', async () => {
        const workspaceProjectInfo: ProjectDetection = {
          ...mockProjectInfo,
          hasWorkspace: true,
          workspaceInfo: {
            type: 'pnpm',
            packages: [],
            rootPackageJson: {},
            currentLocation: 'package',
            currentPackage: {
              name: 'sub-package',
              path: '/test/project/packages/sub-package',
              packageJson: mockPackageJson,
              techStack: 'react'
            }
          }
        }

        const installer = new DependencyInstaller(workspaceProjectInfo, { 
          workspaceRoot: true,
          verbose: true 
        })
        await installer.installDependencies()

        expect(mockReadFile).toHaveBeenCalledWith(
          '/test/project/package.json',
          'utf-8'
        )
      })

      it('should handle installation failures with rollback', async () => {
        mockExeca.mockRejectedValue(new Error('Installation failed'))

        const installer = new DependencyInstaller(mockProjectInfo, { 
          backup: true,
          verbose: true 
        })
        const result = await installer.installDependencies()

        expect(result.success).toBe(false)
        expect(result.error).toContain('Failed to install dependencies')
        
        // Should attempt rollback
        expect(mockWriteFile).toHaveBeenCalledTimes(2) // backup + rollback
      })

      it('should use correct install commands for different package managers', async () => {
        // Test pnpm
        const pnpmProjectInfo = { ...mockProjectInfo, packageManager: 'pnpm' as const }
        const pnpmInstaller = new DependencyInstaller(pnpmProjectInfo)
        await pnpmInstaller.installDependencies()

        expect(mockExeca).toHaveBeenCalledWith(
          'pnpm',
          expect.arrayContaining(['add', '-D']),
          expect.any(Object)
        )

        vi.clearAllMocks()

        // Test yarn
        const yarnProjectInfo = { ...mockProjectInfo, packageManager: 'yarn' as const }
        const yarnInstaller = new DependencyInstaller(yarnProjectInfo)
        await yarnInstaller.installDependencies()

        expect(mockExeca).toHaveBeenCalledWith(
          'yarn',
          expect.arrayContaining(['add', '--dev']),
          expect.any(Object)
        )
      })

      it('should separate dev and production dependencies', async () => {
        const installer = new DependencyInstaller(mockProjectInfo, { verbose: true })
        await installer.installDependencies()

        // Should call execa for dev dependencies (most testing deps are dev)
        expect(mockExeca).toHaveBeenCalledWith(
          'npm',
          expect.arrayContaining(['install', '--save-dev']),
          expect.any(Object)
        )
      })

      it('should include TypeScript dependencies for TypeScript projects', async () => {
        const tsProjectInfo = { ...mockProjectInfo, isTypeScript: true }
        const installer = new DependencyInstaller(tsProjectInfo, { verbose: true })
        const result = await installer.installDependencies()

        expect(result.success).toBe(true)
        // Should include @types packages
        const installCall = mockExeca.mock.calls.find(call => 
          Array.isArray(call[1]) && call[1].some((arg: any) => typeof arg === 'string' && arg.includes('@types'))
        )
        expect(installCall).toBeDefined()
      })

      it('should handle Vue 2 projects correctly', async () => {
        const vue2ProjectInfo = { 
          ...mockProjectInfo, 
          techStack: 'vue2' as const,
          dependencyVersions: { vue: '^2.7.0' }
        }
        const installer = new DependencyInstaller(vue2ProjectInfo, { verbose: true })
        const result = await installer.installDependencies()

        expect(result.success).toBe(true)
        // Should include Vue 2 specific dependencies
        const installCall = mockExeca.mock.calls.find(call => 
          Array.isArray(call[1]) && call[1].some((arg: any) => typeof arg === 'string' && arg.includes('vue-template-compiler'))
        )
        expect(installCall).toBeDefined()
      })

      it('should handle Vue 3 projects correctly', async () => {
        const vue3ProjectInfo = { 
          ...mockProjectInfo, 
          techStack: 'vue3' as const,
          dependencyVersions: { vue: '^3.3.0' }
        }
        const installer = new DependencyInstaller(vue3ProjectInfo, { verbose: true })
        const result = await installer.installDependencies()

        expect(result.success).toBe(true)
        // Should include Vue 3 specific dependencies
        const installCall = mockExeca.mock.calls.find(call => 
          Array.isArray(call[1]) && call[1].some((arg: any) => typeof arg === 'string' && arg.includes('@vue/test-utils'))
        )
        expect(installCall).toBeDefined()
      })
    })
  })

  describe('installDependencies (legacy function)', () => {
    it('should work with existing interface', async () => {
      const options: ModuleOptions = { verbose: true }
      
      await expect(installDependencies(mockProjectInfo, options)).resolves.not.toThrow()
      expect(mockExeca).toHaveBeenCalled()
    })

    it('should handle dry run mode', async () => {
      const options: ModuleOptions = { dryRun: true, verbose: true }
      
      await installDependencies(mockProjectInfo, options)
      expect(mockExeca).not.toHaveBeenCalled()
    })

    it('should throw on installation failure', async () => {
      mockExeca.mockRejectedValue(new Error('Installation failed'))
      const options: ModuleOptions = { verbose: true }
      
      await expect(installDependencies(mockProjectInfo, options)).rejects.toThrow()
    })
  })
})