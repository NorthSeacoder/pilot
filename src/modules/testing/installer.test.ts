import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { installTestingModule } from './installer'

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    gray: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    green: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    red: vi.fn((text) => text),
  },
}))

vi.mock('./dependency-installer', () => ({
  installDependencies: vi.fn(),
}))

vi.mock('./config-generator', () => ({
  generateVitestConfig: vi.fn(),
}))

vi.mock('./test-setup-generator', () => ({
  generateTestSetup: vi.fn(),
}))

vi.mock('./rules-generator', () => ({
  generateCursorRules: vi.fn(),
}))

vi.mock('../../cli/progress-tracker', () => ({
  createProgressTracker: vi.fn(() => ({
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    update: vi.fn(),
    setSteps: vi.fn(),
    startStep: vi.fn(),
    completeStep: vi.fn(),
    showSummary: vi.fn(),
  })),
}))

vi.mock('../../cli/success-messages', () => ({
  showTestingSuccessMessage: vi.fn(),
  showStepSuccessMessage: vi.fn(),
}))

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('installer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('installTestingModule', () => {
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

    it('should install complete testing module', async () => {
      const { installDependencies } = await import('./dependency-installer')
      const { generateVitestConfig } = await import('./config-generator')
      const { generateTestSetup } = await import('./test-setup-generator')
      const { generateCursorRules } = await import('./rules-generator')

      vi.mocked(installDependencies).mockResolvedValue(undefined)
      vi.mocked(generateVitestConfig).mockResolvedValue(undefined)
      vi.mocked(generateTestSetup).mockResolvedValue(undefined)
      vi.mocked(generateCursorRules).mockResolvedValue(undefined)

      await installTestingModule(mockProjectInfo, mockOptions)

      expect(generateCursorRules).toHaveBeenCalled()
      expect(generateVitestConfig).toHaveBeenCalled()
      expect(generateTestSetup).toHaveBeenCalled()
      expect(installDependencies).toHaveBeenCalled()
    })

    it('should handle rules-only installation', async () => {
      const { generateCursorRules } = await import('./rules-generator')

      vi.mocked(generateCursorRules).mockResolvedValue(undefined)

      const rulesOnlyOptions: ModuleOptions = {
        ...mockOptions,
        rulesOnly: true,
      }

      await installTestingModule(mockProjectInfo, rulesOnlyOptions)

      expect(generateCursorRules).toHaveBeenCalled()
    })

    it('should handle config-only installation', async () => {
      const { generateVitestConfig } = await import('./config-generator')

      vi.mocked(generateVitestConfig).mockResolvedValue(undefined)

      const configOnlyOptions: ModuleOptions = {
        ...mockOptions,
        configOnly: true,
      }

      await installTestingModule(mockProjectInfo, configOnlyOptions)

      expect(generateVitestConfig).toHaveBeenCalled()
    })

    it('should handle deps-only installation', async () => {
      const { installDependencies } = await import('./dependency-installer')

      vi.mocked(installDependencies).mockResolvedValue(undefined)

      const depsOnlyOptions: ModuleOptions = {
        ...mockOptions,
        depsOnly: true,
      }

      await installTestingModule(mockProjectInfo, depsOnlyOptions)

      expect(installDependencies).toHaveBeenCalled()
    })

    it('should handle setup-only installation', async () => {
      const { generateTestSetup } = await import('./test-setup-generator')

      vi.mocked(generateTestSetup).mockResolvedValue(undefined)

      const setupOnlyOptions: ModuleOptions = {
        ...mockOptions,
        setupOnly: true,
      }

      await installTestingModule(mockProjectInfo, setupOnlyOptions)

      expect(generateTestSetup).toHaveBeenCalled()
    })

    it('should handle verbose mode', async () => {
      const { installDependencies } = await import('./dependency-installer')
      const { generateVitestConfig } = await import('./config-generator')
      const { generateTestSetup } = await import('./test-setup-generator')
      const { generateCursorRules } = await import('./rules-generator')

      vi.mocked(installDependencies).mockResolvedValue(undefined)
      vi.mocked(generateVitestConfig).mockResolvedValue(undefined)
      vi.mocked(generateTestSetup).mockResolvedValue(undefined)
      vi.mocked(generateCursorRules).mockResolvedValue(undefined)

      const verboseOptions: ModuleOptions = {
        ...mockOptions,
        verbose: true,
      }

      await installTestingModule(mockProjectInfo, verboseOptions)

      // All functions should be called in verbose mode
      expect(generateCursorRules).toHaveBeenCalled()
      expect(generateVitestConfig).toHaveBeenCalled()
      expect(generateTestSetup).toHaveBeenCalled()
      expect(installDependencies).toHaveBeenCalled()
    })

    it('should handle error scenarios', async () => {
      const { generateCursorRules } = await import('./rules-generator')

      const rulesError = new Error('Rules generation failed')
      vi.mocked(generateCursorRules).mockRejectedValue(rulesError)

      const rulesOnlyOptions: ModuleOptions = {
        ...mockOptions,
        rulesOnly: true,
      }

      await expect(installTestingModule(mockProjectInfo, rulesOnlyOptions)).rejects.toThrow(
        'Rules generation failed'
      )
    })

    it('should handle different project types', async () => {
      const { installDependencies } = await import('./dependency-installer')
      const { generateVitestConfig } = await import('./config-generator')
      const { generateTestSetup } = await import('./test-setup-generator')
      const { generateCursorRules } = await import('./rules-generator')

      vi.mocked(installDependencies).mockResolvedValue(undefined)
      vi.mocked(generateVitestConfig).mockResolvedValue(undefined)
      vi.mocked(generateTestSetup).mockResolvedValue(undefined)
      vi.mocked(generateCursorRules).mockResolvedValue(undefined)

      const vueProject: ProjectDetection = {
        ...mockProjectInfo,
        techStack: 'vue3',
        isTypeScript: true,
      }

      await installTestingModule(vueProject, mockOptions)

      // All functions should be called with Vue project info
      expect(generateCursorRules).toHaveBeenCalled()
      expect(generateVitestConfig).toHaveBeenCalled()
      expect(generateTestSetup).toHaveBeenCalled()
      expect(installDependencies).toHaveBeenCalled()
    })

    it('should handle monorepo projects', async () => {
      const { installDependencies } = await import('./dependency-installer')
      const { generateVitestConfig } = await import('./config-generator')
      const { generateTestSetup } = await import('./test-setup-generator')
      const { generateCursorRules } = await import('./rules-generator')

      vi.mocked(installDependencies).mockResolvedValue(undefined)
      vi.mocked(generateVitestConfig).mockResolvedValue(undefined)
      vi.mocked(generateTestSetup).mockResolvedValue(undefined)
      vi.mocked(generateCursorRules).mockResolvedValue(undefined)

      const monorepoProject: ProjectDetection = {
        ...mockProjectInfo,
        architecture: 'pnpm-workspace',
        hasWorkspace: true,
      }

      await installTestingModule(monorepoProject, mockOptions)

      // All functions should be called with monorepo project info
      expect(generateCursorRules).toHaveBeenCalled()
      expect(generateVitestConfig).toHaveBeenCalled()
      expect(generateTestSetup).toHaveBeenCalled()
      expect(installDependencies).toHaveBeenCalled()
    })
  })
})
