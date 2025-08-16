import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  analyzeDependencyVersions,
  analyzeProjectDependencies,
  getCompatibilityMatrix,
  getRecommendedDependencies,
  getRecommendedDependenciesV3,
  detectDependencyConflicts,
  checkVersionCompatibility,
  getNodeVersion,
  type DependencySpec,
  type CompatibilityMatrix,
} from './dependency-analyzer'
// import type { TechStack } from '../../types' // 暂时不需要导入

describe('dependency-analyzer', () => {
  beforeEach(() => {
    // Mock Node.js version
    vi.spyOn(process, 'version', 'get').mockReturnValue('v18.17.0')
  })

  describe('analyzeDependencyVersions', () => {
    it('should extract versions from package.json dependencies', async () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
      }

      const result = await analyzeDependencyVersions(packageJson)

      expect(result).toEqual({
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      })
    })

    it('should handle missing dependencies sections', async () => {
      const packageJson = {}
      const result = await analyzeDependencyVersions(packageJson)
      expect(result).toEqual({})
    })

    it('should filter out non-string versions', async () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0',
          'local-package': 'file:../local',
          'git-package': { git: 'https://github.com/user/repo.git' },
        },
      }

      const result = await analyzeDependencyVersions(packageJson)
      expect(result).toEqual({
        react: '^18.2.0',
        'local-package': 'file:../local',
      })
    })
  })

  describe('getCompatibilityMatrix', () => {
    it('should return comprehensive compatibility matrix', () => {
      const matrix = getCompatibilityMatrix()

      expect(matrix).toHaveProperty('react')
      expect(matrix).toHaveProperty('vue')

      // Check React 18 compatibility
      expect(matrix.react?.['18']).toEqual({
        testingLibrary: '^14.0.0',
        vitest: '^2.0.0',
        jsdom: '^25.0.0',
        additionalDeps: expect.arrayContaining([
          expect.objectContaining({ name: '@testing-library/react' }),
          expect.objectContaining({ name: '@testing-library/jest-dom' }),
          expect.objectContaining({ name: '@testing-library/user-event' }),
        ]),
      })

      // Check Vue 3 compatibility
      expect(matrix.vue?.['3']).toEqual({
        testingLibrary: '^7.0.0',
        vitest: '^2.0.0',
        jsdom: '^25.0.0',
        additionalDeps: expect.arrayContaining([
          expect.objectContaining({ name: '@vue/test-utils' }),
          expect.objectContaining({ name: '@testing-library/vue' }),
        ]),
      })
    })
  })

  describe('getRecommendedDependencies', () => {
    let compatibilityMatrix: CompatibilityMatrix

    beforeEach(() => {
      compatibilityMatrix = getCompatibilityMatrix()
    })

    it('should recommend React testing dependencies', () => {
      const existingDependencies = { react: '^18.2.0' }
      const recommendations = getRecommendedDependencies(
        'react',
        false,
        existingDependencies,
        compatibilityMatrix
      )

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'vitest' }),
          expect.objectContaining({ name: '@vitest/ui' }),
          expect.objectContaining({ name: '@testing-library/react' }),
          expect.objectContaining({ name: '@testing-library/jest-dom' }),
          expect.objectContaining({ name: 'jsdom' }),
        ])
      )
    })

    it('should recommend Vue 3 testing dependencies', () => {
      const existingDependencies = { vue: '^3.3.0' }
      const recommendations = getRecommendedDependencies(
        'vue3',
        false,
        existingDependencies,
        compatibilityMatrix
      )

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'vitest' }),
          expect.objectContaining({ name: '@vue/test-utils' }),
          expect.objectContaining({ name: '@testing-library/vue' }),
          expect.objectContaining({ name: 'jsdom' }),
        ])
      )
    })

    it('should recommend Vue 2 testing dependencies', () => {
      const existingDependencies = { vue: '^2.7.0' }
      const recommendations = getRecommendedDependencies(
        'vue2',
        false,
        existingDependencies,
        compatibilityMatrix
      )

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@vue/test-utils' }),
          expect.objectContaining({ name: 'vue-template-compiler' }),
        ])
      )
    })

    it('should include TypeScript dependencies when isTypeScript is true', () => {
      const existingDependencies = { react: '^18.2.0', typescript: '^5.0.0' }
      const recommendations = getRecommendedDependencies(
        'react',
        true,
        existingDependencies,
        compatibilityMatrix
      )

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@types/jsdom' }),
          expect.objectContaining({ name: '@types/node' }),
        ])
      )
    })

    it('should choose compatible Vitest version based on existing Vite', () => {
      const existingDependencies = { react: '^18.2.0', vite: '^5.0.0' }
      const recommendations = getRecommendedDependencies(
        'react',
        false,
        existingDependencies,
        compatibilityMatrix
      )

      const vitestDep = recommendations.find((dep) => dep.name === 'vitest')
      expect(vitestDep?.version).toBe('^2.0.0')
    })
  })

  describe('detectDependencyConflicts', () => {
    it('should detect major version conflicts', () => {
      const existingDependencies = { vitest: '^1.0.0' }
      const recommendations: DependencySpec[] = [{ name: 'vitest', version: '^2.0.0', dev: true }]

      const result = detectDependencyConflicts(existingDependencies, recommendations)

      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0]).toEqual({
        dependency: 'vitest',
        existingVersion: '^1.0.0',
        requiredVersion: '^2.0.0',
        severity: 'error',
        description: expect.stringContaining('主版本不兼容'),
      })
    })

    it('should detect minor version warnings', () => {
      const existingDependencies = { '@testing-library/react': '^12.0.0' }
      const recommendations: DependencySpec[] = [
        { name: '@testing-library/react', version: '^14.0.0', dev: true },
      ]

      const result = detectDependencyConflicts(existingDependencies, recommendations)

      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts[0]?.severity).toBe('error') // Major version difference
    })

    it('should not report conflicts for compatible versions', () => {
      const existingDependencies = { vitest: '^2.1.0' }
      const recommendations: DependencySpec[] = [{ name: 'vitest', version: '^2.0.0', dev: true }]

      const result = detectDependencyConflicts(existingDependencies, recommendations)

      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should generate conflict resolutions', () => {
      const existingDependencies = { vitest: '^1.0.0' }
      const recommendations: DependencySpec[] = [{ name: 'vitest', version: '^2.0.0', dev: true }]

      const result = detectDependencyConflicts(existingDependencies, recommendations)

      expect(result.resolutions).toHaveLength(1)
      expect(result.resolutions[0]).toEqual({
        type: 'upgrade',
        dependency: 'vitest',
        fromVersion: '^1.0.0',
        toVersion: '^2.0.0',
        reason: expect.stringContaining('主版本不兼容'),
      })
    })
  })

  describe('analyzeProjectDependencies', () => {
    it('should perform comprehensive dependency analysis', async () => {
      const packageJson = {
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
      }

      const result = await analyzeProjectDependencies(packageJson, 'react', true)

      expect(result).toHaveProperty('existingDependencies')
      expect(result).toHaveProperty('conflicts')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('compatibilityMatrix')

      expect(result.existingDependencies).toEqual({
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      })

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'vitest' }),
          expect.objectContaining({ name: '@testing-library/react' }),
          expect.objectContaining({ name: '@types/jsdom' }), // TypeScript project
        ])
      )

      // Should detect Vitest version conflict
      expect(result.conflicts.hasConflicts).toBe(true)
    })
  })

  describe('checkVersionCompatibility', () => {
    it('should determine React compatibility', () => {
      const dependencies = { react: '^18.2.0' }
      const result = checkVersionCompatibility(dependencies)

      expect(result).toEqual({
        react: '^18.2.0',
        compatibleTestingLibrary: '^14.0.0',
        compatibleVitest: '^2.0.0',
      })
    })

    it('should determine Vue compatibility', () => {
      const dependencies = { vue: '^3.3.0' }
      const result = checkVersionCompatibility(dependencies)

      expect(result).toEqual({
        vue: '^3.3.0',
        compatibleTestingLibrary: '^7.0.0',
        compatibleVitest: '^2.0.0',
      })
    })

    it('should handle older React versions', () => {
      const dependencies = { react: '^16.14.0' }
      const result = checkVersionCompatibility(dependencies)

      expect(result.compatibleTestingLibrary).toBe('^11.0.0')
    })

    it('should handle Vue 2', () => {
      const dependencies = { vue: '^2.7.0' }
      const result = checkVersionCompatibility(dependencies)

      expect(result.compatibleTestingLibrary).toBe('^5.0.0')
    })
  })

  describe('getNodeVersion', () => {
    it('should return current Node.js version', () => {
      const version = getNodeVersion()
      expect(version).toBe('v18.17.0')
    })
  })

  describe('getRecommendedDependenciesV3', () => {
    it('should return basic dependencies without framework manager', () => {
      const existingDependencies = { react: '^18.2.0' }
      const recommendations = getRecommendedDependenciesV3('react', false, existingDependencies)

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'vitest' }),
          expect.objectContaining({ name: '@vitest/ui' }),
          expect.objectContaining({ name: 'jsdom' }),
        ])
      )

      // Should not include framework-specific dependencies without manager
      expect(recommendations.find((dep) => dep.name === '@testing-library/react')).toBeUndefined()
    })

    it('should include framework dependencies when manager is provided', () => {
      const existingDependencies = { react: '^18.2.0' }
      const mockFrameworkManager = {
        getAllDependencies: vi.fn().mockReturnValue([
          { name: '@testing-library/react', version: '^14.0.0', dev: true },
          { name: '@testing-library/jest-dom', version: '^6.0.0', dev: true },
        ]),
      }

      const recommendations = getRecommendedDependenciesV3(
        'react',
        false,
        existingDependencies,
        mockFrameworkManager
      )

      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'vitest' }),
          expect.objectContaining({ name: '@testing-library/react' }),
          expect.objectContaining({ name: '@testing-library/jest-dom' }),
        ])
      )

      expect(mockFrameworkManager.getAllDependencies).toHaveBeenCalledWith(
        'react',
        '^18.2.0',
        false
      )
    })

    it('should handle TypeScript projects correctly', () => {
      const existingDependencies = { react: '^18.2.0' }
      const mockFrameworkManager = {
        getAllDependencies: vi.fn().mockReturnValue([
          { name: '@testing-library/react', version: '^14.0.0', dev: true },
          { name: '@types/react', version: '^18.0.0', dev: true },
        ]),
      }

      const recommendations = getRecommendedDependenciesV3(
        'react',
        true,
        existingDependencies,
        mockFrameworkManager
      )

      expect(mockFrameworkManager.getAllDependencies).toHaveBeenCalledWith('react', '^18.2.0', true)
      expect(recommendations).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: '@types/react' })])
      )
    })
  })
})
