import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { RulesInstaller } from './rules-installer'

describe('RulesInstaller', () => {
  let tempDir: string
  let installer: RulesInstaller

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
    installer = new RulesInstaller()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('installTestingStrategy', () => {
    it('should install testing strategy rules to project', async () => {
      await installer.installTestingStrategy(tempDir)

      const rulesPath = installer.getRulesPath(tempDir)
      const content = await readFile(rulesPath, 'utf-8')

      expect(content).toContain('# 0. 核心原则')
      expect(content).toContain('# 1. 分析阶段')
      expect(content).toContain('Testing strategy and requirements')
    })

    it('should create .cursor/rules directory if not exists', async () => {
      await installer.installTestingStrategy(tempDir)

      const rulesPath = installer.getRulesPath(tempDir)
      expect(rulesPath).toMatch(/\.cursor[\\/]rules[\\/]testing-strategy\.mdc$/)
    })

    it('should return correct rules path', () => {
      const rulesPath = installer.getRulesPath('/test/project')
      expect(rulesPath).toBe(join('/test/project', '.cursor', 'rules', 'testing-strategy.mdc'))
    })
  })

  describe('hasExistingRules', () => {
    it('should return false when no rules exist', async () => {
      const hasRules = await installer.hasExistingRules(tempDir)
      expect(hasRules).toBe(false)
    })

    it('should return true after installing rules', async () => {
      await installer.installTestingStrategy(tempDir)
      const hasRules = await installer.hasExistingRules(tempDir)
      expect(hasRules).toBe(true)
    })
  })
})