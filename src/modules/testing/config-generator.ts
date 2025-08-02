import path from 'node:path'
import { writeFile, readFile } from 'node:fs/promises'
import { pathExists } from 'fs-extra'
import { fileURLToPath } from 'node:url'
import type { ProjectDetection, ModuleOptions, TechStack, ProjectArchitecture } from '../../types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 生成 Vitest 配置文件
 */
export async function generateVitestConfig(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const { rootDir, techStack, architecture } = projectInfo
  
  // 检查是否已存在配置文件
  const configFiles = [
    'vitest.config.ts',
    'vitest.config.js',
    'vite.config.ts',
    'vite.config.js',
  ]
  
  for (const configFile of configFiles) {
    if (await pathExists(path.join(rootDir, configFile))) {
      if (options.verbose) {
        console.log(`发现已存在的配置文件: ${configFile}，跳过配置生成`)
      }
      return
    }
  }

  // 生成配置内容
  const configContent = await getVitestConfigTemplate(techStack, architecture)
  const configPath = path.join(rootDir, 'vitest.config.ts')
  
  // 写入配置文件
  await writeFile(configPath, configContent, 'utf-8')
  
  if (options.verbose) {
    console.log(`已生成 Vitest 配置文件: ${configPath}`)
  }

  // 生成测试设置文件
  const setupContent = await getTestSetupTemplate(techStack)
  const setupPath = path.join(rootDir, 'src', 'test-setup.ts')
  
  // 确保 src 目录存在
  const srcDir = path.dirname(setupPath)
  if (!(await pathExists(srcDir))) {
    await writeFile(setupPath.replace('src/', ''), setupContent, 'utf-8')
  } else {
    await writeFile(setupPath, setupContent, 'utf-8')
  }
  
  if (options.verbose) {
    console.log(`已生成测试设置文件: ${setupPath}`)
  }
}

/**
 * 生成 Vitest 配置模板
 */
async function getVitestConfigTemplate(
  techStack: TechStack,
  architecture: ProjectArchitecture
): Promise<string> {
  try {
    // 读取模板文件 - 兼容开发和构建环境
    let templatePath = path.join(__dirname, 'templates', 'vitest.config.template')
    
    // 如果在构建环境中，调整路径
    if (__dirname.includes('dist/cli')) {
      templatePath = path.join(path.dirname(__dirname), 'modules/testing/templates/vitest.config.template')
    }
    
    const templateContent = await readFile(templatePath, 'utf-8')
    
    // 根据技术栈生成配置内容
    let imports = ''
    let plugins = ''
    let setupFiles = ''

    // 根据技术栈添加相应的插件和配置
    switch (techStack) {
      case 'react':
        imports = `\nimport react from '@vitejs/plugin-react'`
        plugins = `  plugins: [react()],`
        setupFiles = `\n    setupFiles: ['src/test-setup.ts'],`
        break
        
      case 'vue3':
        imports = `\nimport vue from '@vitejs/plugin-vue'`
        plugins = `  plugins: [vue()],`
        setupFiles = `\n    setupFiles: ['src/test-setup.ts'],`
        break
        
      case 'vue2':
        imports = `\nimport { createVuePlugin } from 'vite-plugin-vue2'`
        plugins = `  plugins: [createVuePlugin()],`
        setupFiles = `\n    setupFiles: ['src/test-setup.ts'],`
        break
    }

    // 替换占位符
    const content = templateContent
      .replace(/{imports}/g, imports)
      .replace(/{plugins}/g, plugins)
      .replace(/{setupFiles}/g, setupFiles)
    
    return content
  } catch (error) {
    console.warn('读取 Vitest 配置模板失败，使用默认内容:', error)
    return getDefaultVitestConfig(techStack)
  }
}

/**
 * 生成测试设置文件内容
 */
async function getTestSetupTemplate(techStack: TechStack): Promise<string> {
  try {
    // 读取模板文件
    let templatePath = path.join(__dirname, 'templates', 'test-setup.template')
    
    // 如果在构建环境中，调整路径
    if (__dirname.includes('dist/cli')) {
      templatePath = path.join(path.dirname(__dirname), 'modules/testing/templates/test-setup.template')
    }
    
    const templateContent = await readFile(templatePath, 'utf-8')
    
    let techSpecificSetup = ''

    switch (techStack) {
      case 'react':
        techSpecificSetup = `
// React 测试环境设置
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// 每个测试后清理
afterEach(() => {
  cleanup()
})`
        break
        
      case 'vue3':
      case 'vue2':
        techSpecificSetup = `
// Vue 测试环境设置
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

// 每个测试后清理
afterEach(() => {
  cleanup()
})`
        break
    }

    // 替换占位符
    const content = templateContent.replace(/{tech_specific_setup}/g, techSpecificSetup)
    
    return content
  } catch (error) {
    console.warn('读取测试设置模板失败，使用默认内容:', error)
    return getDefaultTestSetup(techStack)
  }
}

/**
 * 默认 Vitest 配置（作为备用）
 */
function getDefaultVitestConfig(techStack: TechStack): string {
  return `import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/**',
      ],
    },
  },
})`
}

/**
 * 默认测试设置（作为备用）
 */
function getDefaultTestSetup(techStack: TechStack): string {
  return `import '@testing-library/jest-dom'

// 基础测试环境设置
import { afterEach } from 'vitest'

// 每个测试后清理
afterEach(() => {
  // 清理逻辑
})`
}