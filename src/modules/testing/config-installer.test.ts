import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { ConfigInstaller } from './config-installer'

describe('ConfigInstaller', () => {
  let tempDir: string
  let installer: ConfigInstaller

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
    installer = new ConfigInstaller()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('installVitestConfig', () => {
    it('should install React vitest config', async () => {
      await installer.installVitestConfig(tempDir, 'react')

      const configPath = join(tempDir, 'vitest.config.ts')
      const content = await readFile(configPath, 'utf-8')

      expect(content).toContain("import react from '@vitejs/plugin-react'")
      expect(content).toContain('plugins: [react()]')
      expect(content).toContain("environment: 'jsdom'")
    })

    it('should install Vue 3 vitest config', async () => {
      await installer.installVitestConfig(tempDir, 'vue3')

      const configPath = join(tempDir, 'vitest.config.ts')
      const content = await readFile(configPath, 'utf-8')

      expect(content).toContain("import vue from '@vitejs/plugin-vue'")
      expect(content).toContain('plugins: [vue()]')
      expect(content).toContain("environment: 'jsdom'")
    })

    it('should install workspace config for workspace projects', async () => {
      await installer.installVitestConfig(tempDir, 'react', true)

      const configPath = join(tempDir, 'vitest.config.ts')
      const content = await readFile(configPath, 'utf-8')

      expect(content).toContain('./test-setup.ts')
    })
  })

  describe('installTestSetup', () => {
    it('should install React test setup in src directory', async () => {
      await installer.installTestSetup(tempDir, 'react')

      const setupPath = join(tempDir, 'src', 'test-setup.ts')
      const content = await readFile(setupPath, 'utf-8')

      expect(content).toContain("import { cleanup } from '@testing-library/react'")
      expect(content).toContain('cleanup()')
      expect(content).toContain('beforeAll')
    })

    it('should install Vue 3 test setup', async () => {
      await installer.installTestSetup(tempDir, 'vue3')

      const setupPath = join(tempDir, 'src', 'test-setup.ts')
      const content = await readFile(setupPath, 'utf-8')

      expect(content).toContain("import { cleanup } from '@testing-library/vue'")
      expect(content).toContain('global.URL.createObjectURL')
    })

    it('should install setup in root for workspace projects', async () => {
      await installer.installTestSetup(tempDir, 'react', true)

      const setupPath = join(tempDir, 'test-setup.ts')
      const content = await readFile(setupPath, 'utf-8')

      expect(content).toContain("import { cleanup } from '@testing-library/react'")
    })
  })

  describe('installTestingConfig', () => {
    it('should install both config and setup files', async () => {
      await installer.installTestingConfig(tempDir, 'react')

      const configPath = join(tempDir, 'vitest.config.ts')
      const setupPath = join(tempDir, 'src', 'test-setup.ts')

      const configContent = await readFile(configPath, 'utf-8')
      const setupContent = await readFile(setupPath, 'utf-8')

      expect(configContent).toContain("import react from '@vitejs/plugin-react'")
      expect(setupContent).toContain("import { cleanup } from '@testing-library/react'")
    })
  })

  describe('hasExistingConfig', () => {
    it('should return false when no config exists', async () => {
      const result = await installer.hasExistingConfig(tempDir)
      expect(result.hasConfig).toBe(false)
      expect(result.hasSetup).toBe(false)
    })

    it('should return true after installing config', async () => {
      await installer.installTestingConfig(tempDir, 'react')
      const result = await installer.hasExistingConfig(tempDir)
      expect(result.hasConfig).toBe(true)
      expect(result.hasSetup).toBe(true)
    })
  })
})