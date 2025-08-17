import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PilotOptions, ProjectDetection, ModuleOptions } from '../types'
import { addModule } from './module-manager'

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    gray: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    green: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    red: vi.fn((text) => text),
    cyan: vi.fn((text) => text),
    bold: vi.fn((text) => text),
  },
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('./detection/project-detector', () => ({
  detectProject: vi.fn(),
}))

vi.mock('../modules/testing/installer', () => ({
  installTestingModule: vi.fn(),
}))

vi.mock('../cli/success-messages', () => ({
  showGenericSuccessMessage: vi.fn(),
}))

// Mock console methods to prevent output during tests
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('module-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('addModule', () => {
    const mockProjectInfo: ProjectDetection = {
      techStack: 'react',
      architecture: 'single',
      packageManager: 'npm',
      isTypeScript: false,
      hasWorkspace: false,
      hasExistingTests: false,
      existingTestFrameworks: [],
      rootDir: '/test/project',
      currentDir: '/test/project',
      nodeVersion: '18.0.0',
      dependencyVersions: {},
      existingConfigs: [],
    }

    const mockOptions: ModuleOptions = {
      configOnly: false,
      rulesOnly: false,
      depsOnly: false,
      setupOnly: false,
      noInstall: false,
      dryRun: false,
      force: false,
      verbose: false,
    }

    it('should successfully add testing module', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      vi.mocked(detectProject).mockResolvedValue(mockProjectInfo)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: mockOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(mockOptions)
      expect(installTestingModule).toHaveBeenCalledWith(mockProjectInfo, mockOptions)
    })

    it('should handle project detection errors', async () => {
      const { detectProject } = await import('./detection/project-detector')

      const detectionError = new Error('Project detection failed')
      vi.mocked(detectProject).mockRejectedValue(detectionError)

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: mockOptions,
      }

      await expect(addModule(pilotOptions)).rejects.toThrow('Project detection failed')
    })

    it('should handle module installation errors', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      vi.mocked(detectProject).mockResolvedValue(mockProjectInfo)

      const installError = new Error('Installation failed')
      vi.mocked(installTestingModule).mockRejectedValue(installError)

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: mockOptions,
      }

      await expect(addModule(pilotOptions)).rejects.toThrow('Installation failed')
    })

    it('should handle verbose mode', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      vi.mocked(detectProject).mockResolvedValue(mockProjectInfo)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const verboseOptions: ModuleOptions = {
        ...mockOptions,
        verbose: true,
      }

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: verboseOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(verboseOptions)
      expect(installTestingModule).toHaveBeenCalledWith(mockProjectInfo, verboseOptions)
    })

    it('should handle dry-run mode', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      vi.mocked(detectProject).mockResolvedValue(mockProjectInfo)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const dryRunOptions: ModuleOptions = {
        ...mockOptions,
        dryRun: true,
      }

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: dryRunOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(dryRunOptions)
      // In dry-run mode, installTestingModule should NOT be called
      expect(installTestingModule).not.toHaveBeenCalled()
    })

    it('should handle force mode', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      vi.mocked(detectProject).mockResolvedValue(mockProjectInfo)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const forceOptions: ModuleOptions = {
        ...mockOptions,
        force: true,
      }

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: forceOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(forceOptions)
      expect(installTestingModule).toHaveBeenCalledWith(mockProjectInfo, forceOptions)
    })

    it('should handle different project types', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      const vueProject: ProjectDetection = {
        ...mockProjectInfo,
        techStack: 'vue3',
        isTypeScript: true,
        hasWorkspace: true,
        hasExistingTests: true,
        existingTestFrameworks: ['jest'],
      }

      vi.mocked(detectProject).mockResolvedValue(vueProject)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: mockOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(mockOptions)
      expect(installTestingModule).toHaveBeenCalledWith(vueProject, mockOptions)
    })

    it('should handle different package managers', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      const pnpmProject: ProjectDetection = {
        ...mockProjectInfo,
        packageManager: 'pnpm',
        architecture: 'pnpm-workspace',
      }

      vi.mocked(detectProject).mockResolvedValue(pnpmProject)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: mockOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(mockOptions)
      expect(installTestingModule).toHaveBeenCalledWith(pnpmProject, mockOptions)
    })

    it('should handle all option combinations', async () => {
      const { detectProject } = await import('./detection/project-detector')
      const { installTestingModule } = await import('../modules/testing/installer')

      vi.mocked(detectProject).mockResolvedValue(mockProjectInfo)
      vi.mocked(installTestingModule).mockResolvedValue(undefined)

      const allOptions: ModuleOptions = {
        configOnly: true,
        rulesOnly: false,
        depsOnly: false,
        setupOnly: false,
        noInstall: true,
        dryRun: true, // This will cause early return
        force: true,
        verbose: true,
      }

      const pilotOptions: PilotOptions = {
        module: 'testing',
        options: allOptions,
      }

      await addModule(pilotOptions)

      expect(detectProject).toHaveBeenCalledWith(allOptions)
      // In dry-run mode, installTestingModule should NOT be called
      expect(installTestingModule).not.toHaveBeenCalled()
    })
  })
})
