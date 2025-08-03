import chalk from 'chalk'
import ora from 'ora'
import type { PilotOptions, ProjectDetection, ModuleOptions } from '../types'
import { detectProject } from './detection/project-detector'
import { installTestingModule } from '../modules/testing/installer'
import { showGenericSuccessMessage } from '../cli/success-messages'

/**
 * 添加功能模块到项目
 */
export async function addModule(pilotOptions: PilotOptions): Promise<void> {
  const { module, options } = pilotOptions
  
  if (options.verbose) {
    console.log(chalk.gray('🔧 详细模式已启用'))
    console.log(chalk.gray(`命令行选项: ${JSON.stringify(options, null, 2)}`))
  }

  const spinner = options.verbose 
    ? ora('正在检测项目信息...').start()
    : ora('正在检测项目信息...').start()

  try {
    // 检测项目基本信息
    if (options.verbose) {
      console.log(chalk.gray('\n🔍 开始项目检测...'))
    }
    
    const projectInfo = await detectProject(options)
    
    if (options.verbose) {
      spinner.succeed('项目检测完成')
      console.log(chalk.gray('📊 检测结果详情:'))
      console.log(chalk.gray(`  • 技术栈: ${projectInfo.techStack}`))
      console.log(chalk.gray(`  • 项目架构: ${projectInfo.architecture}`))
      console.log(chalk.gray(`  • 包管理器: ${projectInfo.packageManager}`))
      console.log(chalk.gray(`  • TypeScript: ${projectInfo.isTypeScript ? '是' : '否'}`))
      console.log(chalk.gray(`  • 工作区: ${projectInfo.hasWorkspace ? '是' : '否'}`))
      console.log(chalk.gray(`  • 现有测试: ${projectInfo.hasExistingTests ? '是' : '否'}`))
      console.log(chalk.gray(`  • 项目根目录: ${projectInfo.rootDir}`))
      console.log(chalk.gray(`  • 当前目录: ${projectInfo.currentDir}`))
      console.log(chalk.gray(`  • Node.js 版本: ${projectInfo.nodeVersion}`))
    } else {
      spinner.succeed(`检测完成: ${chalk.green(projectInfo.techStack)} + ${chalk.green(projectInfo.architecture)}`)
    }

    if (options.dryRun) {
      await showDryRunPreview(module, projectInfo, options)
      return
    }

    // 根据模块类型执行相应操作
    switch (module) {
      case 'testing':
        await installTestingModule(projectInfo, options)
        break
      case 'linting':
        console.log(chalk.yellow('🚧 Linting 模块正在开发中...'))
        showGenericSuccessMessage(module, { projectInfo, options, module })
        break
      case 'formatting':
        console.log(chalk.yellow('🚧 Formatting 模块正在开发中...'))
        showGenericSuccessMessage(module, { projectInfo, options, module })
        break
      default:
        throw new Error(`不支持的模块: ${module}`)
    }
  } catch (error) {
    spinner.fail('操作失败')
    if (options.verbose) {
      console.error(chalk.red('详细错误信息:'), error)
    }
    throw error
  }
}

/**
 * 显示干运行预览
 */
async function showDryRunPreview(
  module: string,
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  console.log(chalk.yellow('\n🔍 预览模式 - 以下是将要执行的操作:'))
  console.log(chalk.cyan('\n📋 项目信息:'))
  console.log(`  • 项目类型: ${chalk.green(projectInfo.techStack)}`)
  console.log(`  • 项目架构: ${chalk.green(projectInfo.architecture)}`)
  console.log(`  • 包管理器: ${chalk.green(projectInfo.packageManager)}`)
  console.log(`  • TypeScript: ${projectInfo.isTypeScript ? chalk.green('是') : chalk.gray('否')}`)
  console.log(`  • 工作区项目: ${projectInfo.hasWorkspace ? chalk.green('是') : chalk.gray('否')}`)
  console.log(`  • 现有测试配置: ${projectInfo.hasExistingTests ? chalk.yellow('是') : chalk.gray('否')}`)

  console.log(chalk.cyan('\n🎯 要添加的模块:'), chalk.green(module))

  if (module === 'testing') {
    console.log(chalk.cyan('\n📝 将要执行的操作:'))
    
    if (options.rulesOnly) {
      console.log(`  • ${chalk.green('✓')} 生成 AI 测试规则文件 (.cursor/rules/testing-strategy.mdc)`)
    } else if (options.configOnly) {
      console.log(`  • ${chalk.green('✓')} 生成 Vitest 配置文件 (vitest.config.ts)`)
    } else if (options.depsOnly) {
      console.log(`  • ${chalk.green('✓')} 安装测试依赖包`)
    } else if (options.setupOnly) {
      console.log(`  • ${chalk.green('✓')} 生成测试设置文件 (test-setup.ts)`)
    } else {
      // 完整流程
      console.log(`  • ${chalk.green('✓')} 生成 AI 测试规则文件 (.cursor/rules/testing-strategy.mdc)`)
      console.log(`  • ${chalk.green('✓')} 生成 Vitest 配置文件 (vitest.config.ts)`)
      console.log(`  • ${chalk.green('✓')} 生成测试设置文件 (test-setup.ts)`)
      
      if (!options.noInstall) {
        console.log(`  • ${chalk.green('✓')} 安装测试依赖包`)
        console.log(chalk.gray('    - vitest'))
        console.log(chalk.gray('    - jsdom'))
        if (projectInfo.techStack === 'react') {
          console.log(chalk.gray('    - @testing-library/react'))
          console.log(chalk.gray('    - @testing-library/jest-dom'))
        } else if (projectInfo.techStack.startsWith('vue')) {
          console.log(chalk.gray('    - @testing-library/vue'))
          console.log(chalk.gray('    - @testing-library/jest-dom'))
        }
        if (projectInfo.isTypeScript) {
          console.log(chalk.gray('    - @types/jsdom'))
        }
      } else {
        console.log(`  • ${chalk.gray('⏭')} 跳过依赖安装 (--no-install)`)
      }
    }

    if (projectInfo.hasExistingTests) {
      console.log(chalk.yellow('\n⚠️  检测到现有测试配置，将进行智能合并'))
    }

    if (projectInfo.hasWorkspace) {
      const location = projectInfo.workspaceInfo?.currentLocation === 'root' ? '根目录' : '子包'
      console.log(chalk.blue(`\n📦 工作区项目，将在${location}进行配置`))
    }
  }

  console.log(chalk.gray('\n💡 提示: 移除 --dry-run 参数以实际执行这些操作'))
}