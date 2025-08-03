import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { generateCursorRules } from './rules-generator'
import type { ProjectDetection } from '../../types'

describe('generateCursorRules', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pilot-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should generate cursor rules with simplified approach', async () => {
    const projectInfo: ProjectDetection = {
      rootDir: tempDir,
      techStack: 'react',
      architecture: 'single',
      isTypeScript: true,
      hasWorkspace: false,
      packageManager: 'npm',
      hasExistingTests: false,
      existingTestFrameworks: [],
      dependencyVersions: {},
      existingConfigs: [],
      currentDir: tempDir,
      nodeVersion: 'v18.17.0'
    }

    await generateCursorRules(projectInfo, { verbose: false })

    // Verify the rules file was created
    const rulesPath = join(tempDir, '.cursor', 'rules', 'testing-strategy.yaml')
    const content = await readFile(rulesPath, 'utf-8')

    // Check for key sections
    expect(content).toContain('# 0. 核心原则')
    expect(content).toContain('# 1. 分析阶段')
    expect(content).toContain('# 2. 测试设计阶段')
    expect(content).toContain('Testing strategy and requirements for projects')
    
    // Should not contain any unresolved variables
    expect(content).not.toContain('{{')
  })

  it('should work with different tech stacks', async () => {
    const projectInfo: ProjectDetection = {
      rootDir: tempDir,
      techStack: 'vue3',
      architecture: 'pnpm-workspace',
      isTypeScript: true,
      hasWorkspace: true,
      packageManager: 'pnpm',
      hasExistingTests: false,
      existingTestFrameworks: [],
      dependencyVersions: {},
      existingConfigs: [],
      currentDir: tempDir,
      nodeVersion: 'v18.17.0'
    }

    await generateCursorRules(projectInfo, { verbose: true })

    // Verify the same rules file is created regardless of tech stack
    const rulesPath = join(tempDir, '.cursor', 'rules', 'testing-strategy.yaml')
    const content = await readFile(rulesPath, 'utf-8')

    expect(content).toContain('# 0. 核心原则')
    expect(content).toContain('description: Testing strategy and requirements for projects')
  })
})