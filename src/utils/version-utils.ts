/**
 * 版本工具库 - 提供统一的版本解析和比较功能
 */

/**
 * 提取主版本号
 * @param version 版本字符串，如 '^18.2.0', '~16.14.0', '1.0.0'
 * @returns 主版本号数字
 */
export function extractMajorVersion(version: string): number {
  const match = version.match(/(\d+)/)
  return match ? parseInt(match[1]!) : 0
}

/**
 * 提取次版本号
 * @param version 版本字符串，如 '^18.2.0', '~16.14.0', '1.0.0'
 * @returns 次版本号数字
 */
export function extractMinorVersion(version: string): number {
  const match = version.match(/\d+\.(\d+)/)
  return match ? parseInt(match[1]!) : 0
}

/**
 * 提取修订版本号
 * @param version 版本字符串，如 '^18.2.0', '~16.14.0', '1.0.0'
 * @returns 修订版本号数字
 */
export function extractPatchVersion(version: string): number {
  const match = version.match(/\d+\.\d+\.(\d+)/)
  return match ? parseInt(match[1]!) : 0
}

/**
 * 比较两个版本
 * @param v1 第一个版本
 * @param v2 第二个版本
 * @returns 如果 v1 > v2 返回 1，v1 < v2 返回 -1，相等返回 0
 */
export function compareVersions(v1: string, v2: string): number {
  const major1 = extractMajorVersion(v1)
  const major2 = extractMajorVersion(v2)

  if (major1 !== major2) {
    return major1 > major2 ? 1 : -1
  }

  const minor1 = extractMinorVersion(v1)
  const minor2 = extractMinorVersion(v2)

  if (minor1 !== minor2) {
    return minor1 > minor2 ? 1 : -1
  }

  const patch1 = extractPatchVersion(v1)
  const patch2 = extractPatchVersion(v2)

  if (patch1 !== patch2) {
    return patch1 > patch2 ? 1 : -1
  }

  return 0
}

/**
 * 检查版本是否兼容
 * @param existingVersion 现有版本
 * @param requiredVersion 需要的版本
 * @returns 是否兼容
 */
export function isVersionCompatible(existingVersion: string, requiredVersion: string): boolean {
  const existingMajor = extractMajorVersion(existingVersion)
  const requiredMajor = extractMajorVersion(requiredVersion)

  // 主版本必须相同
  if (existingMajor !== requiredMajor) {
    return false
  }

  const existingMinor = extractMinorVersion(existingVersion)
  const requiredMinor = extractMinorVersion(requiredVersion)

  // 次版本必须大于等于需要的版本
  return existingMinor >= requiredMinor
}

/**
 * 解析版本范围类型
 * @param version 版本字符串
 * @returns 版本范围类型
 */
export function parseVersionRange(version: string): {
  type: 'exact' | 'caret' | 'tilde' | 'range'
  version: string
} {
  if (version.startsWith('^')) {
    return { type: 'caret', version: version.slice(1) }
  }

  if (version.startsWith('~')) {
    return { type: 'tilde', version: version.slice(1) }
  }

  if (
    version.includes(' - ') ||
    version.includes(' || ') ||
    version.includes('>=') ||
    version.includes('<=') ||
    version.includes('<') ||
    version.includes('>')
  ) {
    return { type: 'range', version }
  }

  return { type: 'exact', version }
}

/**
 * 检查版本是否满足范围要求
 * @param version 要检查的版本
 * @param range 版本范围要求
 * @returns 是否满足
 */
export function satisfiesVersionRange(version: string, range: string): boolean {
  const { type, version: rangeVersion } = parseVersionRange(range)

  switch (type) {
    case 'exact':
      return compareVersions(version, rangeVersion) === 0

    case 'caret':
      // ^1.2.3 允许 1.x.x，但不允许 2.x.x
      return (
        extractMajorVersion(version) === extractMajorVersion(rangeVersion) &&
        compareVersions(version, rangeVersion) >= 0
      )

    case 'tilde':
      // ~1.2.3 允许 1.2.x，但不允许 1.3.x
      return (
        extractMajorVersion(version) === extractMajorVersion(rangeVersion) &&
        extractMinorVersion(version) === extractMinorVersion(rangeVersion) &&
        compareVersions(version, rangeVersion) >= 0
      )

    default:
      // 对于复杂范围，简单比较主版本
      return extractMajorVersion(version) === extractMajorVersion(rangeVersion)
  }
}

/**
 * 获取推荐的版本字符串
 * @param version 基础版本
 * @param type 版本类型偏好
 * @returns 格式化的版本字符串
 */
export function formatVersionString(
  version: string,
  type: 'exact' | 'caret' | 'tilde' = 'caret'
): string {
  const cleanVersion = version.replace(/^[\^~]/, '')

  switch (type) {
    case 'exact':
      return cleanVersion
    case 'tilde':
      return `~${cleanVersion}`
    case 'caret':
    default:
      return `^${cleanVersion}`
  }
}
