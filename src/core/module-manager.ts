import chalk from 'chalk'
import ora from 'ora'
import type { PilotOptions } from '../types'
import { detectProject } from './detection/project-detector'
import { installTestingModule } from '../modules/testing/installer'

/**
 * 添加功能模块到项目
 */
export async function addModule(pilotOptions: PilotOptions): Promise<void> {
  const { module, options } = pilotOptions
  const spinner = ora('正在检测项目信息...').start()

  try {
    // 检测项目基本信息
    const projectInfo = await detectProject(options)
    spinner.succeed(`检测完成: ${chalk.green(projectInfo.techStack)} + ${chalk.green(projectInfo.architecture)}`)

    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 预览模式 - 以下是将要执行的操作:'))
      console.log(`  • 项目类型: ${projectInfo.techStack}`)
      console.log(`  • 项目架构: ${projectInfo.architecture}`)
      console.log(`  • 包管理器: ${projectInfo.packageManager}`)
      console.log(`  • 要添加的模块: ${module}`)
      return
    }

    // 根据模块类型执行相应操作
    switch (module) {
      case 'testing':
        await installTestingModule(projectInfo, options)
        break
      case 'linting':
        console.log(chalk.yellow('🚧 Linting 模块正在开发中...'))
        break
      case 'formatting':
        console.log(chalk.yellow('🚧 Formatting 模块正在开发中...'))
        break
      default:
        throw new Error(`不支持的模块: ${module}`)
    }

    console.log(chalk.green('\n✅ 模块添加完成!'))
  } catch (error) {
    spinner.fail('操作失败')
    throw error
  }
}