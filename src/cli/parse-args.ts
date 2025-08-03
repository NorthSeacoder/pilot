import process from 'node:process'
import { Command } from 'commander'
import chalk from 'chalk'
import type { Module, ModuleOptions, PilotOptions } from '../types'
import { version } from '../../package.json'
import { ExitCode } from './exit-code'

/**
 * 解析后的命令行参数
 */
export interface ParsedArgs {
  command: 'add' | 'help' | 'version'
  options: PilotOptions | null
}

/**
 * 解析命令行参数
 */
export async function parseArgs(argv = process.argv): Promise<ParsedArgs> {
  return new Promise((resolve) => {
    try {
      const program = new Command()

      program
        .name('pilot')
        .description('🚀 可扩展的前端项目开发体验增强平台')
        .version(version, '-v, --version', '显示版本号')
        .helpOption('-h, --help', '显示帮助信息')

      // 添加模块命令
      program
        .command('add <module>')
        .description('添加功能模块到项目')
        .option('--config', '仅生成配置文件')
        .option('--rules', '仅生成 AI 规则文件')
        .option('--deps', '仅安装依赖')
        .option('--no-install', '跳过依赖安装')
        .option('--dry-run', '预览模式，显示将要执行的操作')
        .option('--stack <stack>', '覆盖自动检测的技术栈 (react|vue2|vue3)')
        .option('--arch <arch>', '覆盖自动检测的架构 (single|pnpm-workspace|yarn-workspace)')
        .option('--verbose', '详细输出')
        .action((module: string, options: any) => {
          if (!isValidModule(module)) {
            console.error(chalk.red(`错误: 无效的模块名 "${module}"`))
            console.error(chalk.yellow('支持的模块: testing, linting, formatting'))
            process.exit(ExitCode.InvalidArgument)
          }

          const moduleOptions: ModuleOptions = {
            configOnly: options.config,
            rulesOnly: options.rules,
            depsOnly: options.deps,
            noInstall: !options.install,
            dryRun: options.dryRun,
            stack: options.stack,
            arch: options.arch,
            verbose: options.verbose,
          }

          resolve({
            command: 'add',
            options: {
              module: module as Module,
              options: moduleOptions,
            },
          })
        })

      // 如果没有参数，显示帮助信息
      if (argv.length <= 2) {
        program.help()
        process.exit(ExitCode.Success)
      }

      program.parse(argv)

      // 如果没有匹配的命令，显示帮助
      resolve({
        command: 'help',
        options: null,
      })
    } catch (error) {
      console.error(chalk.red('参数解析错误:'), (error as Error).message)
      process.exit(ExitCode.InvalidArgument)
    }
  })
}

/**
 * 验证模块名是否有效
 */
function isValidModule(module: string): module is Module {
  return ['testing', 'linting', 'formatting'].includes(module)
}
