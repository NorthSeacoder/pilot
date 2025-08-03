import { describe, it, expect } from 'vitest'
import { detectFramework } from './framework-detector'

describe('Framework Detection', () => {

  describe('基于依赖的检测', () => {
    it('应该检测 React 项目', async () => {
      const packageJson = {
        dependencies: { react: '^18.2.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('react')
    })

    it('应该检测 Vue 3 项目', async () => {
      const packageJson = {
        dependencies: { vue: '^3.2.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue3')
    })

    it('应该检测 Vue 2 项目', async () => {
      const packageJson = {
        dependencies: { vue: '^2.6.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue2')
    })

    it('应该通过开发依赖检测框架', async () => {
      const packageJson = {
        devDependencies: { react: '^18.2.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('react')
    })

    it('应该通过 Vue CLI 检测 Vue 3', async () => {
      const packageJson = {
        devDependencies: { '@vue/cli-service': '^5.0.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue3')
    })

    it('应该通过 Vite Vue 插件检测 Vue 3', async () => {
      const packageJson = {
        devDependencies: { '@vitejs/plugin-vue': '^4.0.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue3')
    })

    it('应该通过 Vue 2 相关包检测 Vue 2', async () => {
      const packageJson = {
        devDependencies: { 'vue-template-compiler': '^2.6.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue2')
    })
  })

  it('当没有框架依赖时应该默认返回 React', async () => {
    const packageJson = {}
    const result = await detectFramework(packageJson)
    expect(result).toBe('react')
  })

  describe('版本解析', () => {
    it('应该正确解析带 ^ 前缀的 Vue 版本', async () => {
      const packageJson = {
        dependencies: { vue: '^3.4.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue3')
    })

    it('应该正确解析带 ~ 前缀的 Vue 版本', async () => {
      const packageJson = {
        dependencies: { vue: '~2.7.0' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue2')
    })

    it('应该正确解析包含数字的 Vue 版本', async () => {
      const packageJson = {
        dependencies: { vue: '3.4.0-beta.1' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue3')
    })

    it('当 Vue 版本不明确时应该默认返回 Vue 3', async () => {
      const packageJson = {
        dependencies: { vue: 'latest' }
      }
      
      const result = await detectFramework(packageJson)
      expect(result).toBe('vue3')
    })
  })
})