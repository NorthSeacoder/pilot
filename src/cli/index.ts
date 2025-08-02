import process from 'node:process'
import chalk from 'chalk'
import boxen from 'boxen'
import { version as packageVersion } from '../../package.json'
import { addModule } from '../core/module-manager'
import { ExitCode } from './exit-code'
import { parseArgs } from './parse-args'

/**
 * CLI 主入口函数
 */
export async function main(): Promise<void> {
  try {
    // 设置全局错误处理器
    process.on('uncaughtException', errorHandler)
    process.on('unhandledRejection', errorHandler)

    // 解析命令行参数
    const { command, options } = await parseArgs()

    switch (command) {
      case 'add':
        // 显示欢迎信息
        showWelcome()
        if (options) {
          await addModule(options)
        }
        break
      case 'version':
        console.log(packageVersion)
        process.exit(ExitCode.Success)
        break
      case 'help':
      default:
        // parseArgs 会自动显示帮助信息
        process.exit(ExitCode.Success)
    }
  } catch (error) {
    errorHandler(error as Error)
  }
}

/**
 * 显示欢迎信息
 */
function showWelcome(): void {
  const welcomeText = chalk.bold.cyan('🚀 Pilot') + '\n' +
    chalk.gray('前端项目开发体验增强平台') + '\n\n' +
    chalk.yellow(`版本: ${packageVersion}`)

  console.log(boxen(welcomeText, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan'
  }))
}

/**
 * 全局错误处理器
 */
function errorHandler(error: Error): void {
  let message = error.message || String(error)

  if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
    message = error.stack || message
  }

  console.error(chalk.red('💥 致命错误:'), message)
  process.exit(ExitCode.FatalError)
}
