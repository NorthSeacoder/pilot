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
    chalk.gray('前端项目开发体验增强平台 -dev') + '\n\n' +
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
  console.error(chalk.red('\n💥 操作失败'))
  
  let message = error.message || String(error)
  
  // 提供更友好的错误消息
  if (message.includes('ENOENT')) {
    console.error(chalk.yellow('📁 文件或目录不存在'))
    console.error(chalk.gray('请确保在正确的项目目录中运行命令'))
  } else if (message.includes('EACCES')) {
    console.error(chalk.yellow('🔒 权限不足'))
    console.error(chalk.gray('请检查文件权限或使用管理员权限运行'))
  } else if (message.includes('network') || message.includes('fetch')) {
    console.error(chalk.yellow('🌐 网络连接问题'))
    console.error(chalk.gray('请检查网络连接或稍后重试'))
  } else {
    console.error(chalk.yellow('❌ 错误详情:'), message)
  }

  // 在开发模式下显示完整堆栈
  if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
    console.error(chalk.gray('\n🔍 调试信息:'))
    console.error(chalk.gray(error.stack || message))
  }

  console.error(chalk.blue('\n💡 获取帮助:'))
  console.error(chalk.gray('  • 使用 pilot --help 查看使用说明'))
  console.error(chalk.gray('  • 使用 pilot add testing --dry-run 预览操作'))
  console.error(chalk.gray('  • 使用 --verbose 参数获取详细日志'))

  process.exit(ExitCode.FatalError)
}
