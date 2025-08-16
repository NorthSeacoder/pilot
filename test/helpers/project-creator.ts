import fs from 'fs-extra'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export interface ProjectTemplate {
  name: string
  packageJson: Record<string, any>
  files: Record<string, string>
  directories?: readonly string[]
}

/**
 * 测试项目创建工具
 */
export class ProjectCreator {
  private tempDir: string

  constructor() {
    // 创建唯一的临时目录，使用进程ID和时间戳确保唯一性
    const uniqueId = `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.tempDir = join(tmpdir(), `pilot-test-${uniqueId}`)
  }

  /**
   * 创建临时测试项目
   */
  async createProject(template: ProjectTemplate): Promise<string> {
    const projectPath = join(this.tempDir, template.name)

    // 清理并创建项目目录
    await fs.remove(projectPath)
    await fs.ensureDir(projectPath)

    // 创建 package.json
    await fs.writeJson(join(projectPath, 'package.json'), template.packageJson, { spaces: 2 })

    // 创建目录结构
    if (template.directories) {
      for (const dir of template.directories) {
        await fs.ensureDir(join(projectPath, dir))
      }
    }

    // 创建文件
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = join(projectPath, filePath)
      await fs.ensureDir(join(fullPath, '..'))
      await fs.writeFile(fullPath, content)
    }

    return projectPath
  }

  /**
   * 清理所有测试项目
   */
  async cleanup(): Promise<void> {
    await fs.remove(this.tempDir)
  }

  /**
   * 获取临时目录路径
   */
  getTempDir(): string {
    return this.tempDir
  }
}

/**
 * 预定义的项目模板
 */
export const projectTemplates = {
  react: {
    name: 'react-project',
    packageJson: {
      name: 'test-react-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        typescript: '^5.0.0',
      },
    },
    files: {
      'src/App.tsx': `import React from 'react'

function App() {
  return <div>Hello React</div>
}

export default App`,
      'src/index.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)`,
      'tsconfig.json': JSON.stringify(
        {
          compilerOptions: {
            target: 'es5',
            lib: ['dom', 'dom.iterable', 'es6'],
            allowJs: true,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: 'node',
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: 'react-jsx',
          },
          include: ['src'],
        },
        null,
        2
      ),
    },
    directories: ['src', 'public'],
  },

  vue3: {
    name: 'vue3-project',
    packageJson: {
      name: 'test-vue3-project',
      version: '1.0.0',
      dependencies: {
        vue: '^3.3.0',
      },
      devDependencies: {
        '@vitejs/plugin-vue': '^4.0.0',
        typescript: '^5.0.0',
        vite: '^4.0.0',
      },
    },
    files: {
      'src/App.vue': `<template>
  <div>Hello Vue 3</div>
</template>

<script setup lang="ts">
// Vue 3 Composition API
</script>`,
      'src/main.ts': `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`,
      'vite.config.ts': `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})`,
    },
    directories: ['src'],
  },

  vue2: {
    name: 'vue2-project',
    packageJson: {
      name: 'test-vue2-project',
      version: '1.0.0',
      dependencies: {
        vue: '^2.7.0',
      },
      devDependencies: {
        '@vue/cli-service': '^5.0.0',
        typescript: '^4.0.0',
      },
    },
    files: {
      'src/App.vue': `<template>
  <div>Hello Vue 2</div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'App',
})
</script>`,
      'src/main.ts': `import Vue from 'vue'
import App from './App.vue'

new Vue({
  render: h => h(App),
}).$mount('#app')`,
    },
    directories: ['src'],
  },

  monorepo: {
    name: 'monorepo-project',
    packageJson: {
      name: 'test-monorepo',
      version: '1.0.0',
      private: true,
      workspaces: ['packages/*'],
    },
    files: {
      'pnpm-workspace.yaml': `packages:
  - 'packages/*'`,
      'packages/app/package.json': JSON.stringify(
        {
          name: '@test/app',
          version: '1.0.0',
          dependencies: {
            react: '^18.2.0',
          },
        },
        null,
        2
      ),
      'packages/lib/package.json': JSON.stringify(
        {
          name: '@test/lib',
          version: '1.0.0',
          dependencies: {
            vue: '^3.3.0',
          },
        },
        null,
        2
      ),
    },
    directories: ['packages/app/src', 'packages/lib/src'],
  },
} as const
