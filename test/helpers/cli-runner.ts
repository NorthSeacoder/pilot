import { execa } from 'execa'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')
const cliPath = join(projectRoot, 'bin/pilot.js')

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
  command: string
}

/**
 * CLI 执行器辅助类
 */
export class CLIRunner {
  private cwd: string

  constructor(cwd: string = projectRoot) {
    this.cwd = cwd
  }

  /**
   * 执行 pilot 命令
   */
  async run(args: string[] = []): Promise<CLIResult> {
    const command = `node ${cliPath} ${args.join(' ')}`

    try {
      const result = await execa('node', [cliPath, ...args], {
        cwd: this.cwd,
        reject: false, // 不要在非零退出码时抛出异常
      })

      // 在 CI 环境中添加调试信息
      if (process.env.CI && result.exitCode !== 0) {
        console.log('=== CLI Debug Info ===')
        console.log('Command:', command)
        console.log('CWD:', this.cwd)
        console.log('Args:', args)
        console.log('Exit Code:', result.exitCode)
        console.log('Stdout:', result.stdout)
        console.log('Stderr:', result.stderr)
        console.log('=== End Debug Info ===')
      }

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode ?? 1,
        command,
      }
    } catch (error: any) {
      // 处理执行异常
      if (process.env.CI) {
        console.log('=== CLI Error Debug Info ===')
        console.log('Command:', command)
        console.log('CWD:', this.cwd)
        console.log('Args:', args)
        console.log('Error:', error.message)
        console.log('Error stdout:', error.stdout)
        console.log('Error stderr:', error.stderr)
        console.log('Error exitCode:', error.exitCode)
        console.log('=== End Error Debug Info ===')
      }

      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.exitCode || 1,
        command,
      }
    }
  }

  /**
   * 执行版本命令
   */
  async version(): Promise<CLIResult> {
    return this.run(['--version'])
  }

  /**
   * 执行帮助命令
   */
  async help(): Promise<CLIResult> {
    return this.run(['--help'])
  }

  /**
   * 执行 add testing 命令
   */
  async addTesting(
    options: {
      dryRun?: boolean
      verbose?: boolean
      stack?: 'react' | 'vue2' | 'vue3'
      arch?: 'single' | 'pnpm-workspace' | 'yarn-workspace'
      configOnly?: boolean
      rulesOnly?: boolean
      depsOnly?: boolean
      setupOnly?: boolean
      noInstall?: boolean
      force?: boolean
    } = {}
  ): Promise<CLIResult> {
    const args = ['add', 'testing']

    if (options.dryRun) args.push('--dry-run')
    if (options.verbose) args.push('--verbose')
    if (options.stack) args.push('--stack', options.stack)
    if (options.arch) args.push('--arch', options.arch)
    if (options.configOnly) args.push('--config')
    if (options.rulesOnly) args.push('--rules')
    if (options.depsOnly) args.push('--deps')
    if (options.setupOnly) args.push('--setup')
    if (options.noInstall) args.push('--no-install')
    if (options.force) args.push('--force')

    return this.run(args)
  }

  /**
   * 设置工作目录
   */
  setCwd(cwd: string): void {
    this.cwd = cwd
  }

  /**
   * 获取当前工作目录
   */
  getCwd(): string {
    return this.cwd
  }
}
