import path from 'node:path'
import { pathExists } from 'fs-extra'
import { safeReadFile, safeParseJSON } from '../../utils/error-handler'

/**
 * 检测项目是否使用 TypeScript
 */
export async function detectTypeScript(currentDir: string, packageJson: any): Promise<boolean> {
  // 检查 package.json 中的 TypeScript 依赖
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  if (dependencies.typescript || dependencies['@types/node']) {
    return true
  }

  // 检查是否存在 tsconfig.json
  const tsconfigPath = path.join(currentDir, 'tsconfig.json')
  if (await pathExists(tsconfigPath)) {
    return true
  }

  // 检查是否存在 .ts 或 .tsx 文件
  const commonTsFiles = [
    'src/index.ts',
    'src/main.ts',
    'src/app.ts',
    'index.ts',
    'main.ts',
    'src/index.tsx',
    'src/main.tsx',
    'src/App.tsx',
  ]

  for (const file of commonTsFiles) {
    if (await pathExists(path.join(currentDir, file))) {
      return true
    }
  }

  return false
}

/**
 * 获取 TypeScript 配置信息
 */
export async function getTypeScriptConfig(currentDir: string): Promise<any | null> {
  const tsconfigPath = path.join(currentDir, 'tsconfig.json')
  
  if (await pathExists(tsconfigPath)) {
    const content = await safeReadFile(tsconfigPath)
    if (content) {
      return safeParseJSON(content, { 
        operation: 'TypeScript配置解析', 
        filePath: tsconfigPath 
      })
    }
  }

  return null
}