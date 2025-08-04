import path from 'node:path'
// import { pathExists } from 'fs-extra' // 暂时不需要
import { readFile } from 'node:fs/promises'
import { glob } from 'glob'
import type { ExistingConfig } from '../../types'

/**
 * 检查 vite.config 文件是否真的包含 vitest 配置
 */
async function hasVitestConfig(content: string): Promise<boolean> {
  // 检查是否包含 vitest 相关的配置关键字
  const vitestKeywords = [
    'test:',           // test: { ... }
    'vitest',          // import { vitest } 或其他 vitest 引用
    '"test"',          // "test": { ... }
    "'test'",          // 'test': { ... }
    'environment:',    // test.environment
    'globals:',        // test.globals
    'setupFiles:',     // test.setupFiles
  ]
  
  // 检查是否包含任何 vitest 相关关键字
  return vitestKeywords.some(keyword => content.includes(keyword))
}

/**
 * 检测现有的测试配置和框架
 */
export async function detectExistingTests(currentDir: string, packageJson: any): Promise<{
  hasExistingTests: boolean
  existingTestFrameworks: string[]
  existingConfigs: ExistingConfig[]
}> {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const existingTestFrameworks: string[] = []
  const existingConfigs: ExistingConfig[] = []

  // 检测测试框架依赖
  const testFrameworks = {
    vitest: 'vitest',
    jest: 'jest',
    '@testing-library/react': 'testing-library',
    '@testing-library/vue': 'testing-library',
    '@testing-library/jest-dom': 'testing-library',
    mocha: 'mocha',
    jasmine: 'jasmine',
    karma: 'karma',
    cypress: 'cypress',
    playwright: 'playwright',
    '@playwright/test': 'playwright',
  }

  for (const [dep, framework] of Object.entries(testFrameworks)) {
    if (dependencies[dep] && !existingTestFrameworks.includes(framework)) {
      existingTestFrameworks.push(framework)
    }
  }

  // 检测配置文件
  const configFiles = [
    { pattern: 'vitest.config.*', type: 'vitest' as const },
    { pattern: 'vite.config.*', type: 'vitest' as const },
    { pattern: 'jest.config.*', type: 'jest' as const },
    { pattern: 'jest.setup.*', type: 'jest' as const },
    { pattern: 'test-setup.*', type: 'custom' as const },
    { pattern: 'setupTests.*', type: 'custom' as const },
  ]

  for (const { pattern, type } of configFiles) {
    const files = await glob(pattern, { cwd: currentDir })
    for (const file of files) {
      const filePath = path.join(currentDir, file)
      try {
        const content = await readFile(filePath, 'utf-8')
        
        // 特殊处理 vite.config.* 文件
        if (pattern === 'vite.config.*') {
          // 只有真正包含 vitest 配置的 vite.config 才被识别为 vitest
          if (await hasVitestConfig(content)) {
            existingConfigs.push({
              type,
              filePath,
              content,
              conflicts: [], // Will be populated later during conflict analysis
            })
          }
          // 如果不包含 vitest 配置，跳过此文件
        } else {
          // 其他配置文件直接按文件名判断
          existingConfigs.push({
            type,
            filePath,
            content,
            conflicts: [], // Will be populated later during conflict analysis
          })
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // 检测 package.json 中的内联配置
  if (packageJson.vitest) {
    existingConfigs.push({
      type: 'vitest',
      filePath: path.join(currentDir, 'package.json'),
      content: packageJson.vitest,
      conflicts: [],
    })
  }

  if (packageJson.jest) {
    existingConfigs.push({
      type: 'jest',
      filePath: path.join(currentDir, 'package.json'),
      content: packageJson.jest,
      conflicts: [],
    })
  }

  // 检测测试文件
  const testPatterns = [
    '**/*.test.*',
    '**/*.spec.*',
    '**/test/**/*.*',
    '**/tests/**/*.*',
    '**/__tests__/**/*.*',
  ]

  let hasTestFiles = false
  for (const pattern of testPatterns) {
    const files = await glob(pattern, { 
      cwd: currentDir,
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    })
    if (files.length > 0) {
      hasTestFiles = true
      break
    }
  }

  const hasExistingTests = existingTestFrameworks.length > 0 || existingConfigs.length > 0 || hasTestFiles
  return {
    hasExistingTests,
    existingTestFrameworks,
    existingConfigs,
  }
}