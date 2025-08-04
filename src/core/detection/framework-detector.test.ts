import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

  describe('Monorepo 环境检测', () => {
    // Mock 文件系统模块
    const mockPath = {
      join: (...args: string[]) => args.join('/')
    }
    const mockFs = {
      readFile: vi.fn()
    }

    beforeEach(() => {
      vi.doMock('node:path', () => mockPath)
      vi.doMock('node:fs/promises', () => mockFs)
    })

    afterEach(() => {
      vi.clearAllMocks()
      vi.doUnmock('node:path')
      vi.doUnmock('node:fs/promises')
    })

    it('应该在子项目中检测根目录的 Vue 2 依赖', async () => {
      // 子项目的 package.json（没有框架依赖）
      const childPackageJson = {
        name: 'child-project',
        dependencies: {}
      }

      // 根目录的 package.json（有 Vue 2 依赖）
      const rootPackageJson = {
        name: 'monorepo-root',
        dependencies: { vue: '^2.7.0' }
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(rootPackageJson))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(childPackageJson, context)
      expect(result).toBe('vue2')
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/monorepo/package.json', 'utf-8')
    })

    it('应该在子项目中检测根目录的 Vue 3 依赖', async () => {
      const childPackageJson = {
        dependencies: {}
      }

      const rootPackageJson = {
        dependencies: { vue: '^3.4.0' }
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(rootPackageJson))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(childPackageJson, context)
      expect(result).toBe('vue3')
    })

    it('子项目依赖应该优先于根目录依赖', async () => {
      // 子项目有 React，根目录有 Vue
      const childPackageJson = {
        dependencies: { react: '^18.2.0' }
      }

      const rootPackageJson = {
        dependencies: { vue: '^3.4.0' }
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(rootPackageJson))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(childPackageJson, context)
      expect(result).toBe('react')
    })

    it('当根目录 package.json 读取失败时应该降级到原有逻辑', async () => {
      const childPackageJson = {
        dependencies: {}
      }

      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(childPackageJson, context)
      expect(result).toBe('react') // 默认返回 react
    })

    it('在单模块项目中应该使用原有逻辑', async () => {
      const packageJson = {
        dependencies: { vue: '^2.7.0' }
      }

      const context = {
        currentDir: '/test/project',
        rootDir: '/test/project' // 相同目录，不是 monorepo
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue2')
      expect(mockFs.readFile).not.toHaveBeenCalled()
    })

    it('应该检测 Vue 相关的构建工具', async () => {
      const childPackageJson = {
        dependencies: {}
      }

      const rootPackageJson = {
        devDependencies: { '@vue/cli-service': '^5.0.0' }
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(rootPackageJson))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(childPackageJson, context)
      expect(result).toBe('vue3')
    })
  })

  describe('node_modules 实际安装检测（搭车依赖）', () => {
    // Mock fs-extra 模块
    const mockFsExtra = {
      pathExists: vi.fn(),
      readFile: vi.fn()
    }

    beforeEach(() => {
      vi.doMock('fs-extra', () => mockFsExtra)
    })

    afterEach(() => {
      vi.clearAllMocks()
      vi.doUnmock('fs-extra')
    })

    it('应该检测 node_modules 中实际安装的 Vue 2', async () => {
      // package.json 中没有任何框架依赖
      const packageJson = {
        dependencies: {}
      }

      // 模拟根目录 package.json 也没有框架依赖
      // 在这个测试中，不需要 mockFs.readFile，因为不会调用 monorepo 检测

      // 模拟 node_modules 中存在 Vue 2
      mockFsExtra.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.includes('node_modules/vue/package.json'))
      })

      mockFsExtra.readFile.mockResolvedValue(JSON.stringify({
        name: 'vue',
        version: '2.7.14'
      }))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue2')
      expect(mockFsExtra.pathExists).toHaveBeenCalledWith(
        expect.stringContaining('node_modules/vue/package.json')
      )
    })

    it('应该检测 node_modules 中实际安装的 Vue 3', async () => {
      const packageJson = { dependencies: {} }

      mockFsExtra.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.includes('node_modules/vue/package.json'))
      })

      mockFsExtra.readFile.mockResolvedValue(JSON.stringify({
        name: 'vue',
        version: '3.4.0'
      }))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue3')
    })

    it('应该通过 vue-template-compiler 检测 Vue 2', async () => {
      const packageJson = { dependencies: {} }

      mockFsExtra.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.includes('node_modules/vue-template-compiler/package.json'))
      })

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue2')
    })

    it('应该通过 @vitejs/plugin-vue 检测 Vue 3', async () => {
      const packageJson = { dependencies: {} }

      mockFsExtra.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.includes('node_modules/@vitejs/plugin-vue/package.json'))
      })

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue3')
    })

    it('应该优先检查当前目录的 node_modules', async () => {
      const packageJson = { dependencies: {} }

      // 模拟当前目录有 Vue 3，根目录有 Vue 2
      mockFsExtra.pathExists.mockImplementation((filePath: string) => {
        if (filePath.includes('/test/monorepo/packages/child/node_modules/vue/package.json')) {
          return Promise.resolve(true)
        }
        if (filePath.includes('/test/monorepo/node_modules/vue/package.json')) {
          return Promise.resolve(true)
        }
        return Promise.resolve(false)
      })

      mockFsExtra.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('/test/monorepo/packages/child/node_modules/vue/package.json')) {
          return Promise.resolve(JSON.stringify({ name: 'vue', version: '3.4.0' }))
        }
        if (filePath.includes('/test/monorepo/node_modules/vue/package.json')) {
          return Promise.resolve(JSON.stringify({ name: 'vue', version: '2.7.14' }))
        }
        return Promise.reject(new Error('File not found'))
      })

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue3') // 应该返回当前目录的 Vue 3
    })

    it('当 node_modules 检测失败时应该降级到默认逻辑', async () => {
      const packageJson = { dependencies: {} }

      // 模拟文件系统错误
      mockFsExtra.pathExists.mockRejectedValue(new Error('Permission denied'))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('react') // 应该降级到默认的 React
    })

    it('应该在多层 node_modules 中搜索', async () => {
      const packageJson = { dependencies: {} }

      // 模拟只有上级目录有框架包
      mockFsExtra.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.includes('/test/node_modules/vue/package.json'))
      })

      mockFsExtra.readFile.mockResolvedValue(JSON.stringify({
        name: 'vue',
        version: '2.7.14'
      }))

      const context = {
        currentDir: '/test/monorepo/packages/child',
        rootDir: '/test/monorepo'
      }

      const result = await detectFramework(packageJson, context)
      expect(result).toBe('vue2')
    })
  })

  describe('代码内容分析检测', () => {
    let mockFsExtra: any
    
    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks()
      
      mockFsExtra = {
        pathExists: vi.fn(),
        readFile: vi.fn()
      }
      vi.doMock('fs-extra', () => mockFsExtra)
    })

    afterEach(() => {
      vi.doUnmock('fs-extra')
    })

    it('应该通过入口文件检测 Vue 3', async () => {
      const mainJs = `
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/main.js'))
      )
      mockFsExtra.readFile.mockResolvedValue(mainJs)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('vue3')
    })

    it('应该通过入口文件检测 Vue 2', async () => {
      const mainJs = `
import Vue from 'vue'
import App from './App.vue'

new Vue({
  render: h => h(App),
}).$mount('#app')
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/main.js'))
      )
      mockFsExtra.readFile.mockResolvedValue(mainJs)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('vue2')
    })

    it('应该通过入口文件检测 Vue 2（new Vue 在文件末尾）', async () => {
      // 构造一个 100 行的文件，new Vue 在第 99 行
      const lines = []
      for (let i = 1; i <= 98; i++) {
        lines.push(`// 注释行 ${i}`)
      }
      lines.push('new Vue({')
      lines.push('  render: h => h(App)')
      lines.push('}).$mount("#app")')
      
      const mainJs = lines.join('\n')
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/main.js'))
      )
      mockFsExtra.readFile.mockResolvedValue(mainJs)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('vue2')
    })

    it('应该通过入口文件检测 React', async () => {
      const indexJs = `
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

ReactDOM.render(<App />, document.getElementById('root'))
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/index.js'))
      )
      mockFsExtra.readFile.mockResolvedValue(indexJs)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('react')
    })

    it('应该通过入口文件检测 React 18 (createRoot)', async () => {
      const indexJs = `
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = createRoot(document.getElementById('root'))
root.render(<App />)
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/index.js'))
      )
      mockFsExtra.readFile.mockResolvedValue(indexJs)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('react')
    })

    it('应该通过 Vue 组件文件检测 Vue 3', async () => {
      const appVue = `
<template>
  <div>Hello Vue 3</div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/App.vue'))
      )
      mockFsExtra.readFile.mockResolvedValue(appVue)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('vue3')
    })

    it('应该通过 Vue 组件文件检测 Vue 2', async () => {
      const appVue = `
<template>
  <div>Hello Vue 2</div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      count: 0
    }
  }
}
</script>
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/App.vue'))
      )
      mockFsExtra.readFile.mockResolvedValue(appVue)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('vue2')
    })

    it('应该通过 React 组件文件检测 React', async () => {
      const appJsx = `
import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}

export default App
`
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/App.jsx'))
      )
      mockFsExtra.readFile.mockResolvedValue(appJsx)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('react')
    })

    it('代码分析失败时应该返回默认值', async () => {
      mockFsExtra.pathExists.mockResolvedValue(false)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('react')
    })

    it('应该处理文件读取错误', async () => {
      mockFsExtra.pathExists.mockResolvedValue(true)
      mockFsExtra.readFile.mockRejectedValue(new Error('File read error'))

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      expect(result).toBe('react')
    })

    it('应该限制大文件读取大小', async () => {
      // 创建一个超过 500KB 的文件内容
      const largeContent = 'a'.repeat(600 * 1024) + '\nnew Vue({})'
      
      mockFsExtra.pathExists.mockImplementation((path: string) => 
        Promise.resolve(path.includes('src/main.js'))
      )
      mockFsExtra.readFile.mockResolvedValue(largeContent)

      const result = await detectFramework({}, { 
        currentDir: '/test/project', 
        rootDir: '/test' 
      })
      
      // 因为截断了文件，new Vue 在截断后的部分，所以检测不到
      expect(result).toBe('react')
    })
  })
})