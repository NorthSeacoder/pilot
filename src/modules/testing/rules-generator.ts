import path from 'node:path'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { pathExists } from 'fs-extra'
import { fileURLToPath } from 'node:url'
import type { ProjectDetection, ModuleOptions, TechStack } from '../../types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 生成 Cursor AI 测试规则文件
 */
export async function generateCursorRules(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const { rootDir, techStack } = projectInfo
  const cursorDir = path.join(rootDir, '.cursor')
  const rulesPath = path.join(cursorDir, 'testing-strategy.mdc')
  
  // 检查是否已存在规则文件
  if (await pathExists(rulesPath)) {
    if (options.verbose) {
      console.log('发现已存在的 testing-strategy.mdc 文件，跳过生成')
    }
    return
  }

  // 确保 .cursor 目录存在
  if (!(await pathExists(cursorDir))) {
    await mkdir(cursorDir, { recursive: true })
  }

  // 获取项目名称
  const projectName = await getProjectName(rootDir)

  // 生成规则内容
  const rulesContent = await getTestingStrategyTemplate(techStack, projectName)
  
  // 写入规则文件
  await writeFile(rulesPath, rulesContent, 'utf-8')
  
  if (options.verbose) {
    console.log(`已生成 AI 测试策略文件: ${rulesPath}`)
  }
}

/**
 * 获取项目名称
 */
async function getProjectName(rootDir: string): Promise<string> {
  try {
    const packageJsonPath = path.join(rootDir, 'package.json')
    if (await pathExists(packageJsonPath)) {
      const packageContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)
      return packageJson.name || 'unknown-project'
    }
  } catch (error) {
    console.warn('读取项目名称失败:', error)
  }
  return 'unknown-project'
}

/**
 * 生成测试策略文档模板
 */
async function getTestingStrategyTemplate(
  techStack: TechStack,
  projectName: string
): Promise<string> {
  try {
    // 读取模板文件 - 兼容开发和构建环境
    let templatePath = path.join(__dirname, 'templates', 'testing-strategy.yaml')
    
    // 如果在构建环境中，调整路径
    if (__dirname.includes('dist/cli')) {
      templatePath = path.join(path.dirname(__dirname), 'modules/testing/templates/testing-strategy.yaml')
    }
    
    const templateContent = await readFile(templatePath, 'utf-8')
    
    // 替换占位符
    const content = templateContent
      .replace(/{project}/g, projectName)
      .replace(/{tech_stack}/g, getTechStackName(techStack))
      .replace(/{ui_library}/g, getUILibrary(techStack))
      .replace(/{testing_library}/g, getTestingLibrary(techStack))
    
    return content
  } catch (error) {
    console.warn('读取模板文件失败，使用默认内容:', error)
    // 如果读取失败，返回简化的默认内容
    return getDefaultTestingStrategy(techStack, projectName)
  }
}

/**
 * 获取技术栈显示名称
 */
function getTechStackName(techStack: TechStack): string {
  switch (techStack) {
    case 'react':
      return 'React'
    case 'vue3':
      return 'Vue 3'
    case 'vue2':
      return 'Vue 2'
    default:
      return techStack
  }
}

/**
 * 根据技术栈推荐UI库
 */
function getUILibrary(techStack: TechStack): string {
  switch (techStack) {
    case 'react':
      return 'antd'
    case 'vue3':
      return 'element-plus'
    case 'vue2':
      return 'element-ui'
    default:
      return 'antd'
  }
}

/**
 * 获取测试库名称
 */
function getTestingLibrary(techStack: TechStack): string {
  switch (techStack) {
    case 'react':
      return 'react'
    case 'vue3':
    case 'vue2':
      return 'vue'
    default:
      return 'react'
  }
}

/**
 * 默认测试策略内容（作为备用）
 */
function getDefaultTestingStrategy(techStack: TechStack, projectName: string): string {
  const techStackName = getTechStackName(techStack)
  
  return `---
description: Testing strategy and requirements for ${projectName}
globs: 
alwaysApply: false
---

# 测试策略配置

## 项目信息
- 项目名称: ${projectName}
- 技术栈: ${techStackName}
- UI库: ${getUILibrary(techStack)}
- 测试库: @testing-library/${getTestingLibrary(techStack)}

## 核心原则
- 专注测试项目增量功能，不重复测试第三方库本身
- 根据组件/模块类型采用差异化测试策略
- 最小化Mock，仅Mock外部依赖
- 优先测试用户交互和业务流程
- 统一使用Vitest + @testing-library

## 覆盖率目标
- 工具函数: 90%+
- UI组件: 75%+
- 业务组件: 80%+
- 页面组件: 70%+
`
}