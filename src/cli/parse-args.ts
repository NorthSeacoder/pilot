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
        .description(
          '🚀 可扩展的前端项目开发体验增强平台\n\n' +
            '  Pilot 是一个智能的前端项目增强工具，可以自动检测项目技术栈\n' +
            '  并生成相应的配置文件、AI 规则和开发环境设置。\n\n' +
            '  支持的技术栈: React, Vue2, Vue3\n' +
            '  支持的架构: 单模块项目, pnpm workspace, yarn workspace'
        )
        .version(version, '-v, --version', '显示版本号')
        .helpOption('-h, --help', '显示帮助信息')

      // 添加模块命令
      program
        .command('add <module>')
        .description(
          '添加功能模块到项目\n\n' +
            '  支持的模块:\n' +
            '    testing     配置测试环境 (Vitest + Testing Library)\n' +
            '  示例:\n' +
            '    pilot add testing                    # 完整配置测试环境\n' +
            '    pilot add testing --dry-run          # 预览将要执行的操作\n' +
            '    pilot add testing --config           # 仅生成配置文件\n' +
            '    pilot add testing --no-install       # 跳过依赖安装\n' +
            '    pilot add testing --stack react      # 强制指定技术栈\n' +
            '    pilot add testing --verbose          # 显示详细日志'
        )
        .option('--config', '仅生成配置文件 (vitest.config.ts)')
        .option('--rules', '仅生成 AI 规则文件 (.cursor/rules/testing-strategy.mdc)')
        .option('--deps', '仅安装测试相关依赖包')
        .option('--setup', '仅生成测试设置文件 (test-setup.ts)')
        .option('--no-install', '跳过依赖安装，仅生成配置文件')
        .option('--dry-run', '预览模式，显示将要执行的操作但不实际执行')
        .option('--force', '强制覆盖已存在的配置文件，不进行备份')
        .option(
          '--stack <stack>',
          '覆盖自动检测的技术栈\n                        可选值: react, vue2, vue3'
        )
        .option(
          '--arch <arch>',
          '覆盖自动检测的项目架构\n                        可选值: single, pnpm-workspace, yarn-workspace'
        )
        .option('-v, --verbose', '显示详细的操作日志和调试信息')
        .action((module: string, options: any) => {
          if (!isValidModule(module)) {
            console.error(chalk.red(`❌ 错误: 无效的模块名 "${module}"`))
            console.error(chalk.yellow('\n📦 支持的模块:'))
            console.error(chalk.gray('  • testing     - 配置测试环境 (Vitest + Testing Library)'))
            console.error(chalk.gray('  • linting     - 配置代码检查 (开发中)'))
            console.error(chalk.gray('  • formatting  - 配置代码格式化 (开发中)'))
            console.error(chalk.blue('\n💡 提示: 使用 pilot add testing 开始配置测试环境'))
            console.error(chalk.blue('       使用 pilot --help 查看完整帮助信息'))
            process.exit(ExitCode.InvalidArgument)
          }

          // 验证技术栈参数
          if (options.stack && !['react', 'vue2', 'vue3'].includes(options.stack)) {
            console.error(chalk.red(`❌ 错误: 无效的技术栈 "${options.stack}"`))
            console.error(chalk.yellow('支持的技术栈: react, vue2, vue3'))
            process.exit(ExitCode.InvalidArgument)
          }

          // 验证架构参数
          if (
            options.arch &&
            !['single', 'pnpm-workspace', 'yarn-workspace'].includes(options.arch)
          ) {
            console.error(chalk.red(`❌ 错误: 无效的项目架构 "${options.arch}"`))
            console.error(chalk.yellow('支持的架构: single, pnpm-workspace, yarn-workspace'))
            process.exit(ExitCode.InvalidArgument)
          }

          // 验证选项组合
          const exclusiveOptions = [
            options.config,
            options.rules,
            options.deps,
            options.setup,
          ].filter(Boolean)
          if (exclusiveOptions.length > 1) {
            console.error(chalk.red('❌ 错误: --config, --rules, --deps, --setup 选项不能同时使用'))
            console.error(chalk.blue('💡 提示: 这些选项用于分步配置，每次只能选择一个'))
            process.exit(ExitCode.InvalidArgument)
          }

          const moduleOptions: ModuleOptions = {
            configOnly: options.config,
            rulesOnly: options.rules,
            depsOnly: options.deps,
            setupOnly: options.setup,
            noInstall: options.install === false,
            dryRun: options.dryRun,
            force: options.force,
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

      // 添加自定义帮助命令
      program
        .command('help [command]')
        .description('显示帮助信息')
        .action((command?: string) => {
          if (command) {
            showCommandHelp(command)
          } else {
            showGeneralHelp()
          }
          process.exit(ExitCode.Success)
        })

      // 如果没有参数，显示帮助信息
      if (argv.length <= 2) {
        showGeneralHelp()
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

/**
 * 显示通用帮助信息
 */
function showGeneralHelp(): void {
  console.log(chalk.bold.cyan('\n🚀 Pilot - 前端项目开发体验增强平台'))
  console.log(chalk.gray(`版本: ${version}\n`))

  console.log(chalk.bold('用法:'))
  console.log('  pilot <command> [options]\n')

  console.log(chalk.bold('命令:'))
  console.log('  add <module>     添加功能模块到项目')
  console.log('  help [command]   显示帮助信息')
  console.log('  version          显示版本号\n')

  console.log(chalk.bold('支持的模块:'))
  console.log(chalk.green('  testing     ') + chalk.gray('配置测试环境 (Vitest + Testing Library)'))
  console.log(chalk.yellow('  linting     ') + chalk.gray('配置代码检查 (开发中)'))
  console.log(chalk.yellow('  formatting  ') + chalk.gray('配置代码格式化 (开发中)\n'))

  console.log(chalk.bold('常用示例:'))
  console.log(chalk.gray('  pilot add testing                    # 完整配置测试环境'))
  console.log(chalk.gray('  pilot add testing --dry-run          # 预览将要执行的操作'))
  console.log(chalk.gray('  pilot add testing --config           # 仅生成配置文件'))
  console.log(chalk.gray('  pilot add testing --no-install       # 跳过依赖安装'))
  console.log(chalk.gray('  pilot add testing --verbose          # 显示详细日志\n'))

  console.log(chalk.bold('获取更多帮助:'))
  console.log(chalk.gray('  pilot help add                       # 查看 add 命令详细帮助'))
  console.log(chalk.gray('  pilot add testing --help             # 查看 testing 模块选项'))
}

/**
 * 显示特定命令的帮助信息
 */
function showCommandHelp(command: string): void {
  switch (command) {
    case 'add':
      showAddCommandHelp()
      break
    case 'testing':
      showTestingModuleHelp()
      break
    default:
      console.log(chalk.red(`未知命令: ${command}`))
      console.log(chalk.blue('使用 pilot help 查看可用命令'))
  }
}

/**
 * 显示 add 命令的详细帮助
 */
function showAddCommandHelp(): void {
  console.log(chalk.bold.cyan('\n📦 pilot add - 添加功能模块'))
  console.log(chalk.gray('自动检测项目技术栈并添加相应的功能模块\n'))

  console.log(chalk.bold('用法:'))
  console.log('  pilot add <module> [options]\n')

  console.log(chalk.bold('支持的模块:'))
  console.log(chalk.green('  testing     ') + chalk.gray('配置测试环境'))
  console.log(chalk.gray('              • 自动检测 React/Vue2/Vue3 技术栈'))
  console.log(chalk.gray('              • 生成 Vitest 配置文件'))
  console.log(chalk.gray('              • 安装相应的测试依赖'))
  console.log(chalk.gray('              • 创建 AI 测试策略规则'))
  console.log(chalk.yellow('  linting     ') + chalk.gray('配置代码检查 (开发中)'))
  console.log(chalk.yellow('  formatting  ') + chalk.gray('配置代码格式化 (开发中)\n'))

  console.log(chalk.bold('通用选项:'))
  console.log('  --dry-run            预览模式，显示将要执行的操作')
  console.log('  --stack <stack>      覆盖自动检测的技术栈')
  console.log('  --arch <arch>        覆盖自动检测的项目架构')
  console.log('  -v, --verbose        显示详细的操作日志')
  console.log('  -h, --help           显示帮助信息\n')

  console.log(chalk.bold('示例:'))
  console.log(chalk.gray('  pilot add testing                    # 完整配置测试环境'))
  console.log(chalk.gray('  pilot add testing --dry-run          # 预览操作'))
  console.log(chalk.gray('  pilot add testing --stack vue3       # 强制指定为 Vue3 项目'))
  console.log(chalk.gray('  pilot add testing --verbose          # 显示详细日志'))
}

/**
 * 显示 testing 模块的详细帮助
 */
function showTestingModuleHelp(): void {
  console.log(chalk.bold.cyan('\n🧪 Testing 模块 - 测试环境配置'))
  console.log(chalk.gray('为前端项目配置现代化的测试环境\n'))

  console.log(chalk.bold('功能特性:'))
  console.log(chalk.green('  ✓ ') + chalk.gray('自动检测技术栈 (React/Vue2/Vue3)'))
  console.log(chalk.green('  ✓ ') + chalk.gray('支持 TypeScript 项目'))
  console.log(chalk.green('  ✓ ') + chalk.gray('支持 Monorepo (pnpm/yarn workspace)'))
  console.log(chalk.green('  ✓ ') + chalk.gray('智能依赖版本选择'))
  console.log(chalk.green('  ✓ ') + chalk.gray('生成 AI 测试策略规则'))
  console.log(chalk.green('  ✓ ') + chalk.gray('配置冲突智能处理\n'))

  console.log(chalk.bold('分步配置选项:'))
  console.log('  --config             仅生成 Vitest 配置文件')
  console.log('  --rules              仅生成 AI 规则文件')
  console.log('  --setup              仅生成测试设置文件')
  console.log('  --deps               仅安装测试依赖')
  console.log('  --no-install         跳过依赖安装\n')

  console.log(chalk.bold('技术栈覆盖:'))
  console.log('  --stack react        强制配置为 React 项目')
  console.log('  --stack vue2         强制配置为 Vue2 项目')
  console.log('  --stack vue3         强制配置为 Vue3 项目\n')

  console.log(chalk.bold('项目架构覆盖:'))
  console.log('  --arch single        单模块项目')
  console.log('  --arch pnpm-workspace    pnpm 工作区')
  console.log('  --arch yarn-workspace    yarn 工作区\n')

  console.log(chalk.bold('使用场景:'))
  console.log(chalk.blue('  新项目配置:'))
  console.log(chalk.gray('    pilot add testing'))
  console.log(chalk.blue('  预览配置:'))
  console.log(chalk.gray('    pilot add testing --dry-run'))
  console.log(chalk.blue('  分步配置:'))
  console.log(chalk.gray('    pilot add testing --config      # 先生成配置'))
  console.log(chalk.gray('    pilot add testing --deps        # 再安装依赖'))
  console.log(chalk.blue('  问题排查:'))
  console.log(chalk.gray('    pilot add testing --verbose     # 显示详细日志'))
}
