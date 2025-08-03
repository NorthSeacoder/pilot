import type { VersionCompatibility } from '../../types'

/**
 * 分析项目依赖版本
 */
export async function analyzeDependencyVersions(packageJson: any): Promise<Record<string, string>> {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const versions: Record<string, string> = {}

  // 直接从 package.json 获取版本信息
  for (const [name, version] of Object.entries(dependencies)) {
    if (typeof version === 'string') {
      versions[name] = version
    }
  }

  return versions
}

/**
 * 获取 Node.js 版本
 */
export function getNodeVersion(): string {
  return process.version
}

/**
 * 检测版本兼容性
 */
export function checkVersionCompatibility(
  dependencyVersions: Record<string, string>
): VersionCompatibility {
  const compatibility: VersionCompatibility = {}

  // React 版本兼容性
  if (dependencyVersions.react) {
    const reactVersion = dependencyVersions.react
    compatibility.react = reactVersion
    
    // 推荐兼容的 testing-library 版本
    if (reactVersion.includes('18.') || reactVersion.includes('^18') || reactVersion.includes('~18')) {
      compatibility.compatibleTestingLibrary = '^14.0.0'
    } else if (reactVersion.includes('17.') || reactVersion.includes('^17') || reactVersion.includes('~17')) {
      compatibility.compatibleTestingLibrary = '^12.0.0'
    } else {
      compatibility.compatibleTestingLibrary = '^14.0.0' // 默认最新
    }
  }

  // Vue 版本兼容性
  if (dependencyVersions.vue) {
    const vueVersion = dependencyVersions.vue
    compatibility.vue = vueVersion
    
    // 推荐兼容的 testing-library 版本
    if (vueVersion.includes('3.') || vueVersion.includes('^3') || vueVersion.includes('~3')) {
      compatibility.compatibleTestingLibrary = '^7.0.0'
    } else if (vueVersion.includes('2.') || vueVersion.includes('^2') || vueVersion.includes('~2')) {
      compatibility.compatibleTestingLibrary = '^5.0.0'
    }
  }

  // TypeScript 版本兼容性
  if (dependencyVersions.typescript) {
    compatibility.typescript = dependencyVersions.typescript
  }

  // 推荐 Vitest 版本（基于 Node.js 版本）
  const nodeVersion = getNodeVersion()
  const versionPart = nodeVersion.slice(1).split('.')[0]
  const nodeMajor = versionPart ? parseInt(versionPart) : 18
  
  if (nodeMajor >= 18) {
    compatibility.compatibleVitest = '^2.0.0'
  } else if (nodeMajor >= 16) {
    compatibility.compatibleVitest = '^1.0.0'
  } else {
    compatibility.compatibleVitest = '^0.34.0'
  }

  return compatibility
}