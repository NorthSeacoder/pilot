import { describe, it, expect } from 'vitest'
import { FrameworkDependencyManager } from './framework-dependency-manager'
import type { DependencySpec } from '../../types'

describe('FrameworkDependencyManager', () => {
  describe('getReactDependencies', () => {
    it('should return React 18 dependencies', () => {
      const dependencies = FrameworkDependencyManager.getReactDependencies('^18.2.0', false)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@testing-library/react', version: '^14.0.0' }),
          expect.objectContaining({ name: '@testing-library/jest-dom', version: '^6.0.0' }),
          expect.objectContaining({ name: '@testing-library/user-event', version: '^14.0.0' }),
        ])
      )

      // Should not include TypeScript dependencies
      expect(dependencies.find((dep) => dep.name === '@types/react')).toBeUndefined()
    })

    it('should return React 17 dependencies', () => {
      const dependencies = FrameworkDependencyManager.getReactDependencies('^17.0.0', false)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@testing-library/react', version: '^12.0.0' }),
          expect.objectContaining({ name: '@testing-library/jest-dom', version: '^5.0.0' }),
        ])
      )
    })

    it('should include TypeScript dependencies for TypeScript projects', () => {
      const dependencies = FrameworkDependencyManager.getReactDependencies('^18.2.0', true)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@types/react', version: '^18.0.0' }),
          expect.objectContaining({ name: '@types/react-dom', version: '^18.0.0' }),
        ])
      )
    })

    it('should handle React 16 dependencies', () => {
      const dependencies = FrameworkDependencyManager.getReactDependencies('^16.14.0', false)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@testing-library/react', version: '^11.0.0' }),
          expect.objectContaining({ name: '@testing-library/jest-dom', version: '^5.0.0' }),
        ])
      )
    })
  })

  describe('getVue2Dependencies', () => {
    it('should return Vue 2 dependencies', () => {
      const dependencies = FrameworkDependencyManager.getVue2Dependencies('^2.7.0', false)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@vue/test-utils', version: '^1.3.0' }),
          expect.objectContaining({ name: '@testing-library/vue', version: '^5.0.0' }),
          expect.objectContaining({ name: '@testing-library/jest-dom', version: '^5.0.0' }),
          expect.objectContaining({ name: 'vue-template-compiler', version: '^2.7.0' }),
        ])
      )
    })

    it('should include TypeScript dependencies for TypeScript projects', () => {
      const dependencies = FrameworkDependencyManager.getVue2Dependencies('^2.7.0', true)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@types/vue', version: '^2.0.0' }),
          expect.objectContaining({ name: 'vue-class-component', version: '^7.0.0' }),
        ])
      )
    })
  })

  describe('getVue3Dependencies', () => {
    it('should return Vue 3 dependencies', () => {
      const dependencies = FrameworkDependencyManager.getVue3Dependencies('^3.3.0', false)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@vue/test-utils', version: '^2.0.0' }),
          expect.objectContaining({ name: '@testing-library/vue', version: '^7.0.0' }),
          expect.objectContaining({ name: '@testing-library/jest-dom', version: '^6.0.0' }),
        ])
      )

      // Should not include vue-template-compiler for Vue 3
      expect(dependencies.find((dep) => dep.name === 'vue-template-compiler')).toBeUndefined()
    })

    it('should include TypeScript dependencies for TypeScript projects', () => {
      const dependencies = FrameworkDependencyManager.getVue3Dependencies('^3.3.0', true)

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@vue/tsconfig', version: '^0.4.0' }),
        ])
      )
    })
  })

  describe('getTypeScriptDependencies', () => {
    it('should return TypeScript testing dependencies', () => {
      const dependencies = FrameworkDependencyManager.getTypeScriptDependencies()

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@types/jsdom', version: '^21.0.0' }),
          expect.objectContaining({ name: '@types/node', version: '^20.0.0' }),
          expect.objectContaining({ name: 'typescript', version: '^5.0.0' }),
        ])
      )

      // All should be dev dependencies
      dependencies.forEach((dep) => {
        expect(dep.dev).toBe(true)
      })
    })
  })

  describe('getFrameworkDependencies', () => {
    it('should return React dependencies for react techstack', () => {
      const dependencies = FrameworkDependencyManager.getFrameworkDependencies(
        'react',
        '^18.2.0',
        false
      )

      expect(dependencies).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: '@testing-library/react' })])
      )
    })

    it('should return Vue 2 dependencies for vue2 techstack', () => {
      const dependencies = FrameworkDependencyManager.getFrameworkDependencies(
        'vue2',
        '^2.7.0',
        false
      )

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@vue/test-utils', version: '^1.3.0' }),
          expect.objectContaining({ name: 'vue-template-compiler' }),
        ])
      )
    })

    it('should return Vue 3 dependencies for vue3 techstack', () => {
      const dependencies = FrameworkDependencyManager.getFrameworkDependencies(
        'vue3',
        '^3.3.0',
        false
      )

      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@vue/test-utils', version: '^2.0.0' }),
          expect.objectContaining({ name: '@testing-library/vue', version: '^7.0.0' }),
        ])
      )
    })
  })

  describe('getAllDependencies', () => {
    it('should combine framework and TypeScript dependencies', () => {
      const dependencies = FrameworkDependencyManager.getAllDependencies('react', '^18.2.0', true)

      // Should include React dependencies
      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@testing-library/react' }),
          expect.objectContaining({ name: '@types/react' }),
        ])
      )

      // Should include TypeScript dependencies
      expect(dependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@types/jsdom' }),
          expect.objectContaining({ name: '@types/node' }),
        ])
      )
    })

    it('should not include TypeScript dependencies for non-TypeScript projects', () => {
      const dependencies = FrameworkDependencyManager.getAllDependencies('react', '^18.2.0', false)

      // Should not include general TypeScript dependencies
      expect(dependencies.find((dep) => dep.name === '@types/jsdom')).toBeUndefined()
      expect(dependencies.find((dep) => dep.name === '@types/node')).toBeUndefined()

      // Should not include React TypeScript dependencies
      expect(dependencies.find((dep) => dep.name === '@types/react')).toBeUndefined()
    })
  })

  describe('isDependencyCompatible', () => {
    it('should validate React Testing Library compatibility', () => {
      // React 18 with Testing Library 14 - compatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/react',
          '^14.0.0',
          'react',
          '^18.2.0'
        )
      ).toBe(true)

      // React 18 with Testing Library 12 - incompatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/react',
          '^12.0.0',
          'react',
          '^18.2.0'
        )
      ).toBe(false)

      // React 17 with Testing Library 12 - compatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/react',
          '^12.0.0',
          'react',
          '^17.0.0'
        )
      ).toBe(true)

      // React 16 with Testing Library 14 - incompatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/react',
          '^14.0.0',
          'react',
          '^16.14.0'
        )
      ).toBe(false)
    })

    it('should validate Vue Test Utils compatibility', () => {
      // Vue 3 with Test Utils 2 - compatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@vue/test-utils',
          '^2.0.0',
          'vue3',
          '^3.3.0'
        )
      ).toBe(true)

      // Vue 3 with Test Utils 1 - incompatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@vue/test-utils',
          '^1.3.0',
          'vue3',
          '^3.3.0'
        )
      ).toBe(false)

      // Vue 2 with Test Utils 1 - compatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@vue/test-utils',
          '^1.3.0',
          'vue2',
          '^2.7.0'
        )
      ).toBe(true)

      // Vue 2 with Test Utils 2 - incompatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@vue/test-utils',
          '^2.0.0',
          'vue2',
          '^2.7.0'
        )
      ).toBe(false)
    })

    it('should validate Vue Testing Library compatibility', () => {
      // Vue 3 with Testing Library 7 - compatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/vue',
          '^7.0.0',
          'vue3',
          '^3.3.0'
        )
      ).toBe(true)

      // Vue 3 with Testing Library 5 - incompatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/vue',
          '^5.0.0',
          'vue3',
          '^3.3.0'
        )
      ).toBe(false)

      // Vue 2 with Testing Library 5 - compatible
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          '@testing-library/vue',
          '^5.0.0',
          'vue2',
          '^2.7.0'
        )
      ).toBe(true)
    })

    it('should return true for unknown dependencies', () => {
      expect(
        FrameworkDependencyManager.isDependencyCompatible(
          'unknown-package',
          '^1.0.0',
          'react',
          '^18.2.0'
        )
      ).toBe(true)
    })
  })

  describe('validateDependencyConfiguration', () => {
    it('should validate React dependency configuration', () => {
      const dependencies: DependencySpec[] = [
        { name: '@testing-library/react', version: '^14.0.0', dev: true },
        { name: '@testing-library/jest-dom', version: '^6.0.0', dev: true },
      ]

      const result = FrameworkDependencyManager.validateDependencyConfiguration(
        dependencies,
        'react',
        '^18.2.0'
      )

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect missing required dependencies', () => {
      const dependencies: DependencySpec[] = [
        { name: '@testing-library/react', version: '^14.0.0', dev: true },
        // Missing @testing-library/jest-dom
      ]

      const result = FrameworkDependencyManager.validateDependencyConfiguration(
        dependencies,
        'react',
        '^18.2.0'
      )

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('缺少必需的依赖: @testing-library/jest-dom')
    })

    it('should detect incompatible versions', () => {
      const dependencies: DependencySpec[] = [
        { name: '@testing-library/react', version: '^12.0.0', dev: true }, // Incompatible with React 18
        { name: '@testing-library/jest-dom', version: '^6.0.0', dev: true },
      ]

      const result = FrameworkDependencyManager.validateDependencyConfiguration(
        dependencies,
        'react',
        '^18.2.0'
      )

      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues[0]).toContain('@testing-library/react')
      expect(result.issues[0]).toContain('不兼容')
    })

    it('should validate Vue 2 dependency configuration', () => {
      const dependencies: DependencySpec[] = [
        { name: '@vue/test-utils', version: '^1.3.0', dev: true },
        { name: '@testing-library/vue', version: '^5.0.0', dev: true },
        { name: 'vue-template-compiler', version: '^2.7.0', dev: true },
      ]

      const result = FrameworkDependencyManager.validateDependencyConfiguration(
        dependencies,
        'vue2',
        '^2.7.0'
      )

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect missing Vue template compiler for Vue 2', () => {
      const dependencies: DependencySpec[] = [
        { name: '@vue/test-utils', version: '^1.3.0', dev: true },
        { name: '@testing-library/vue', version: '^5.0.0', dev: true },
        // Missing vue-template-compiler
      ]

      const result = FrameworkDependencyManager.validateDependencyConfiguration(
        dependencies,
        'vue2',
        '^2.7.0'
      )

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('缺少必需的依赖: vue-template-compiler')
    })
  })
})
