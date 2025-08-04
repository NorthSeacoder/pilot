import type { TechStack } from '../../types'
import path from 'node:path'

/**
 * 框架检测上下文信息
 */
interface FrameworkDetectionContext {
  currentDir?: string
  rootDir?: string
}

/**
 * 检测项目使用的前端框架
 * @param packageJson 项目的 package.json 内容
 * @param context 可选的检测上下文，支持 monorepo 环境检测
 */
export async function detectFramework(
  packageJson: any,
  context?: FrameworkDetectionContext
): Promise<TechStack> {
  // 第一层：尝试 monorepo 环境的依赖合并检测
  let dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  // 在 monorepo 环境中，尝试合并根目录依赖
  if (context?.currentDir && context?.rootDir) {
    const mergedDependencies = await getMergedDependencies(packageJson, context)
    if (mergedDependencies) {
      dependencies = mergedDependencies
    }
  }

  // 使用合并后的依赖进行框架检测
  const dependencyResult = await detectFrameworkFromDependencies(dependencies)
  
  // 如果检测到非默认框架，直接返回
  if (dependencyResult !== 'react') {
    return dependencyResult
  }
  
  // 第二层：node_modules 实际安装检测（解决"搭车"依赖问题）
  if (context?.currentDir && context?.rootDir) {
    const nodeModulesResult = await detectFrameworkFromNodeModules(
      context.rootDir,
      context.currentDir
    )
    
    if (nodeModulesResult && nodeModulesResult !== 'react') {
      return nodeModulesResult
    }
  }

  // 第三层：代码内容分析（新增 - 仅在 package.json 方法都失败时启用）
  if (context?.currentDir) {
    const codeAnalysisResult = await detectFrameworkByCodeAnalysis(context.currentDir)
    if (codeAnalysisResult && codeAnalysisResult !== 'react') {
      return codeAnalysisResult
    }
  }

  // 默认返回 React
  return 'react'
}

/**
 * 检测是否为 monorepo 环境
 */
function isMonorepoEnvironment(currentDir: string, rootDir: string): boolean {
  // 当前目录不是根目录时，可能是 monorepo 子项目
  return currentDir !== rootDir
}

/**
 * 安全读取根目录的 package.json
 */
async function safeReadRootPackageJson(rootDir: string): Promise<any | null> {
  try {
    const path = await import('node:path')
    const fs = await import('node:fs/promises')
    
    const rootPackageJsonPath = path.join(rootDir, 'package.json')
    const content = await fs.readFile(rootPackageJsonPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    // 根目录 package.json 读取失败时返回 null，降级到原有逻辑
    return null
  }
}

/**
 * 合并子项目和根目录的依赖（子项目优先）
 */
function mergeDependencies(childPackageJson: any, rootPackageJson: any): any {
  return {
    ...rootPackageJson.dependencies,
    ...rootPackageJson.devDependencies,
    ...childPackageJson.dependencies,
    ...childPackageJson.devDependencies,
  }
}

/**
 * 获取合并后的依赖
 */
async function getMergedDependencies(
  packageJson: any,
  context: FrameworkDetectionContext
): Promise<any | null> {
  if (!isMonorepoEnvironment(context.currentDir!, context.rootDir!)) {
    return null
  }

  const rootPackageJson = await safeReadRootPackageJson(context.rootDir!)
  if (!rootPackageJson) {
    return null
  }

  return mergeDependencies(packageJson, rootPackageJson)
}

/**
 * 检测 node_modules 中实际安装的框架（解决"搭车"依赖问题）
 */
async function detectFrameworkFromNodeModules(
  rootDir: string, 
  currentDir: string
): Promise<TechStack | null> {
  // 定义搜索路径：当前目录 -> 根目录 -> 向上遍历
  const searchPaths: string[] = []
  
  // 添加当前目录的 node_modules
  if (currentDir !== rootDir) {
    searchPaths.push(path.join(currentDir, 'node_modules'))
  }
  
  // 添加根目录的 node_modules
  searchPaths.push(path.join(rootDir, 'node_modules'))
  
  // 向上遍历查找 node_modules（处理嵌套项目场景）
  let parentDir = path.dirname(rootDir)
  let maxLevels = 3 // 最多向上查找3层，避免无限递归
  
  while (maxLevels > 0 && parentDir !== path.dirname(parentDir)) {
    searchPaths.push(path.join(parentDir, 'node_modules'))
    parentDir = path.dirname(parentDir)
    maxLevels--
  }

  // 按优先级检查每个路径
  for (const nodeModulesPath of searchPaths) {
    const framework = await checkFrameworkInNodeModules(nodeModulesPath)
    if (framework && framework !== 'react') {
      // 优先返回非 React 框架，因为 React 是默认值
      return framework
    }
  }
  
  return null
}

/**
 * 检查指定 node_modules 目录中的框架包
 */
async function checkFrameworkInNodeModules(nodeModulesPath: string): Promise<TechStack | null> {
  try {
    const { pathExists, readFile } = await import('fs-extra')
    
    // 检查 Vue（优先检查，因为更容易被误判为 React）
    const vuePackagePath = path.join(nodeModulesPath, 'vue', 'package.json')
    if (await pathExists(vuePackagePath)) {
      const vuePackageContent = await readFile(vuePackagePath, 'utf-8')
      const vuePackage = JSON.parse(vuePackageContent)
      return detectVueVersionFromPackage(vuePackage.version)
    }
    
    // 检查 Vue 2 特有的包
    const vueTemplateCompilerPath = path.join(nodeModulesPath, 'vue-template-compiler', 'package.json')
    if (await pathExists(vueTemplateCompilerPath)) {
      return 'vue2'
    }
    
    // 检查 Vue 3 特有的包
    const vitejsPluginVuePath = path.join(nodeModulesPath, '@vitejs', 'plugin-vue', 'package.json')
    if (await pathExists(vitejsPluginVuePath)) {
      return 'vue3'
    }
    
    // 检查 React
    const reactPackagePath = path.join(nodeModulesPath, 'react', 'package.json')
    if (await pathExists(reactPackagePath)) {
      return 'react'
    }
    
  } catch (error) {
    // 文件系统错误时优雅降级，不影响检测流程
    return null
  }
  
  return null
}

/**
 * 从 Vue package.json 的版本信息检测 Vue 版本
 */
function detectVueVersionFromPackage(version: string): TechStack {
  if (!version) return 'vue3' // 默认 Vue 3
  
  // Vue 3.x
  if (version.startsWith('3.') || version.startsWith('^3.') || version.startsWith('~3.')) {
    return 'vue3'
  }
  
  // Vue 2.x  
  if (version.startsWith('2.') || version.startsWith('^2.') || version.startsWith('~2.')) {
    return 'vue2'
  }
  
  // 包含数字的版本检测
  if (version.includes('3.')) {
    return 'vue3'
  }
  
  if (version.includes('2.')) {
    return 'vue2'
  }
  
  // 默认假设是 Vue 3
  return 'vue3'
}

/**
 * 从依赖对象中检测框架
 */
async function detectFrameworkFromDependencies(dependencies: any): Promise<TechStack> {
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

  // 默认假设是 React
  return 'react'
}

/**
 * 代码内容分析检测
 */
async function detectFrameworkByCodeAnalysis(currentDir: string): Promise<TechStack | null> {
  // 检测入口文件
  const entryResult = await analyzeEntryFiles(currentDir)
  if (entryResult) return entryResult
  
  // 检测组件文件特征
  const componentResult = await analyzeComponentFiles(currentDir)
  if (componentResult) return componentResult
  
  return null
}

/**
 * 入口文件分析（全文件扫描）
 */
async function analyzeEntryFiles(currentDir: string): Promise<TechStack | null> {
  try {
    const { pathExists, readFile } = await import('fs-extra')
    
    const entryFiles = [
      'src/main.js', 
      'src/main.ts', 
      'src/index.js', 
      'src/index.ts',
      'main.js',
      'index.js'
    ]
    
    for (const entryFile of entryFiles) {
      const filePath = path.join(currentDir, entryFile)
      if (await pathExists(filePath)) {
        try {
          let content = await readFile(filePath, 'utf-8')

          // 若文件过大，限制读取 500KB，避免性能问题
          if (content.length > 500 * 1024) {
            content = content.slice(0, 500 * 1024)
          }

          // 使用正则检测（忽略空白与换行，支持全文搜索）
          if (/createApp\s*\(/m.test(content)) {
            return 'vue3'
          }
          
          if (/new\s+Vue\s*\(/m.test(content)) {
            return 'vue2'
          }
          
          if (/ReactDOM\.render|createRoot|React\.createElement/m.test(content)) {
            return 'react'
          }
          
        } catch (error) {
          // 忽略读取错误，继续检测其他文件
          continue
        }
      }
    }
    
  } catch (error) {
    // 动态导入 fs-extra 失败时降级
    return null
  }
  
  return null
}

/**
 * 组件文件特征分析（轻量级）
 */
async function analyzeComponentFiles(currentDir: string): Promise<TechStack | null> {
  try {
    const { pathExists, readFile } = await import('fs-extra')
    
    // 查找 src 目录下的几个典型文件
    const typicalFiles = [
      'src/App.vue',
      'src/App.js', 
      'src/App.jsx',
      'src/App.tsx',
      'src/components/index.js'
    ]
    
    for (const file of typicalFiles) {
      const filePath = path.join(currentDir, file)
      if (await pathExists(filePath)) {
        try {
          const content = await readFile(filePath, 'utf-8')
          
          // Vue 文件特征
          if (file.endsWith('.vue') || 
              content.includes('<template>') || 
              content.includes('<script>')) {
            
            // 通过组件语法区分 Vue 2/3
            if (content.includes('defineComponent') || 
                content.includes('setup(') ||
                content.includes('<script setup>')) {
              return 'vue3'
            }
            
            // Vue 2 特征
            if (content.includes('export default {') ||
                content.includes('Vue.component')) {
              return 'vue2'
            }
            
            // 无法确定版本，但确定是 Vue，默认较新版本
            return 'vue3'
          }
          
          // React 文件特征
          if (content.includes('React.Component') ||
              content.includes('useState') ||
              content.includes('useEffect') ||
              content.includes('function App()') ||
              content.includes('const App =')) {
            return 'react'
          }
          
        } catch (error) {
          continue
        }
      }
    }
    
  } catch (error) {
    // 动态导入 fs-extra 失败或其他错误时降级
  }
  
  return null
}