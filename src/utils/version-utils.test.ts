import { describe, it, expect } from 'vitest'
import {
  extractMajorVersion,
  extractMinorVersion,
  extractPatchVersion,
  compareVersions,
  isVersionCompatible,
  parseVersionRange,
  satisfiesVersionRange,
  formatVersionString,
} from './version-utils'

describe('version-utils', () => {
  describe('extractMajorVersion', () => {
    it('should extract major version from various formats', () => {
      expect(extractMajorVersion('^18.2.0')).toBe(18)
      expect(extractMajorVersion('~16.14.0')).toBe(16)
      expect(extractMajorVersion('1.0.0')).toBe(1)
      expect(extractMajorVersion('2')).toBe(2)
    })

    it('should handle edge cases', () => {
      expect(extractMajorVersion('')).toBe(0)
      expect(extractMajorVersion('abc')).toBe(0)
      expect(extractMajorVersion('v18.2.0')).toBe(18)
    })
  })

  describe('extractMinorVersion', () => {
    it('should extract minor version correctly', () => {
      expect(extractMinorVersion('^18.2.0')).toBe(2)
      expect(extractMinorVersion('~16.14.0')).toBe(14)
      expect(extractMinorVersion('1.0.0')).toBe(0)
    })

    it('should handle missing minor version', () => {
      expect(extractMinorVersion('18')).toBe(0)
      expect(extractMinorVersion('')).toBe(0)
    })
  })

  describe('extractPatchVersion', () => {
    it('should extract patch version correctly', () => {
      expect(extractPatchVersion('^18.2.5')).toBe(5)
      expect(extractPatchVersion('~16.14.10')).toBe(10)
      expect(extractPatchVersion('1.0.0')).toBe(0)
    })

    it('should handle missing patch version', () => {
      expect(extractPatchVersion('18.2')).toBe(0)
      expect(extractPatchVersion('18')).toBe(0)
    })
  })

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('18.2.0', '17.0.0')).toBe(1)
      expect(compareVersions('16.14.0', '18.2.0')).toBe(-1)
      expect(compareVersions('18.2.0', '18.2.0')).toBe(0)
    })

    it('should handle version prefixes', () => {
      expect(compareVersions('^18.2.0', '^17.0.0')).toBe(1)
      expect(compareVersions('~16.14.0', '^18.2.0')).toBe(-1)
    })

    it('should compare minor versions when major is same', () => {
      expect(compareVersions('18.3.0', '18.2.0')).toBe(1)
      expect(compareVersions('18.1.0', '18.2.0')).toBe(-1)
    })

    it('should compare patch versions when major and minor are same', () => {
      expect(compareVersions('18.2.1', '18.2.0')).toBe(1)
      expect(compareVersions('18.2.0', '18.2.1')).toBe(-1)
    })
  })

  describe('isVersionCompatible', () => {
    it('should check major version compatibility', () => {
      expect(isVersionCompatible('^18.2.0', '^18.0.0')).toBe(true)
      expect(isVersionCompatible('^17.0.0', '^18.0.0')).toBe(false)
      expect(isVersionCompatible('^19.0.0', '^18.0.0')).toBe(false)
    })

    it('should check minor version compatibility', () => {
      expect(isVersionCompatible('^18.2.0', '^18.1.0')).toBe(true)
      expect(isVersionCompatible('^18.1.0', '^18.2.0')).toBe(false)
    })

    it('should handle various version formats', () => {
      expect(isVersionCompatible('18.2.0', '^18.0.0')).toBe(true)
      expect(isVersionCompatible('~18.2.0', '18.1.0')).toBe(true)
    })
  })

  describe('parseVersionRange', () => {
    it('should parse caret ranges', () => {
      expect(parseVersionRange('^18.2.0')).toEqual({
        type: 'caret',
        version: '18.2.0',
      })
    })

    it('should parse tilde ranges', () => {
      expect(parseVersionRange('~16.14.0')).toEqual({
        type: 'tilde',
        version: '16.14.0',
      })
    })

    it('should parse exact versions', () => {
      expect(parseVersionRange('18.2.0')).toEqual({
        type: 'exact',
        version: '18.2.0',
      })
    })

    it('should parse complex ranges', () => {
      expect(parseVersionRange('>=18.0.0 <19.0.0')).toEqual({
        type: 'range',
        version: '>=18.0.0 <19.0.0',
      })
    })
  })

  describe('satisfiesVersionRange', () => {
    it('should check exact version satisfaction', () => {
      expect(satisfiesVersionRange('18.2.0', '18.2.0')).toBe(true)
      expect(satisfiesVersionRange('18.2.1', '18.2.0')).toBe(false)
    })

    it('should check caret range satisfaction', () => {
      expect(satisfiesVersionRange('18.2.0', '^18.0.0')).toBe(true)
      expect(satisfiesVersionRange('18.5.0', '^18.0.0')).toBe(true)
      expect(satisfiesVersionRange('19.0.0', '^18.0.0')).toBe(false)
      expect(satisfiesVersionRange('17.9.0', '^18.0.0')).toBe(false)
    })

    it('should check tilde range satisfaction', () => {
      expect(satisfiesVersionRange('18.2.0', '~18.2.0')).toBe(true)
      expect(satisfiesVersionRange('18.2.5', '~18.2.0')).toBe(true)
      expect(satisfiesVersionRange('18.3.0', '~18.2.0')).toBe(false)
    })
  })

  describe('formatVersionString', () => {
    it('should format version with caret by default', () => {
      expect(formatVersionString('18.2.0')).toBe('^18.2.0')
      expect(formatVersionString('^18.2.0')).toBe('^18.2.0')
    })

    it('should format version with specified type', () => {
      expect(formatVersionString('18.2.0', 'exact')).toBe('18.2.0')
      expect(formatVersionString('18.2.0', 'tilde')).toBe('~18.2.0')
      expect(formatVersionString('18.2.0', 'caret')).toBe('^18.2.0')
    })

    it('should clean existing prefixes', () => {
      expect(formatVersionString('^18.2.0', 'exact')).toBe('18.2.0')
      expect(formatVersionString('~18.2.0', 'caret')).toBe('^18.2.0')
    })
  })
})
