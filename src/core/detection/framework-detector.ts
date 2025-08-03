import type { TechStack } from '../../types'

/**
 * 检测项目使用的前端框架
 */
export async function detectFramework(packageJson: any): Promise<TechStack> {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  // 检测 React
  if (dependencies.react) {
    return 'react'
  }

  // 检测 Vue
  if (dependencies.vue) {
    const vueVersion = dependencies.vue
    
    // Vue 3.x
    if (vueVersion.startsWith('^3.') || vueVersion.startsWith('~3.') || vueVersion.includes('3.')) {
      return 'vue3'
    }
    
    // Vue 2.x
    if (vueVersion.startsWith('^2.') || vueVersion.startsWith('~2.') || vueVersion.includes('2.')) {
      return 'vue2'
    }
    
    // 默认假设是 Vue 3
    return 'vue3'
  }

  // 检查是否有 Vue CLI 或 Vite Vue 插件
  if (dependencies['@vue/cli-service'] || dependencies['@vitejs/plugin-vue']) {
    return 'vue3'
  }

  // 检查是否有 Vue 2 相关包
  if (dependencies['vue-template-compiler'] || dependencies['@vue/composition-api']) {
    return 'vue2'
  }

  // 默认假设是 React（大多数情况）
  return 'react'
}