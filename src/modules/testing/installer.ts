import chalk from 'chalk'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { installDependencies } from './dependency-installer'
import { generateVitestConfig } from './config-generator'
import { generateTestSetup } from './test-setup-generator'
import { generateCursorRules } from './rules-generator'
import { createProgressTracker } from '../../cli/progress-tracker'
import { showTestingSuccessMessage, showStepSuccessMessage } from '../../cli/success-messages'

/**
 * 安装测试模块
 */
export async function installTestingModule(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const progressTracker = createProgressTracker(options.verbose)

  if (options.verbose) {
    console.log(chalk.gray('\n🔧 测试模块安装详细信息:'))
    console.log(chalk.gray(`  • 配置选项: ${JSON.stringify(options, null, 2)}`))
  }

  console.log(chalk.blue('\n📦 开始配置测试环境...'))

  const config = { projectInfo, options, module: 'testing' }

  // 如果是分步配置，只执行指定步骤
  if (options.rulesOnly) {
    if (options.verbose) {
      console.log(chalk.gray('🎯 执行模式: 仅生成 AI 规则'))
    }

    progressTracker.start('生成 AI 测试规则文件')
    try {
      await generateCursorRules(projectInfo, options)
      progressTracker.succeed('AI 测试规则文件生成完成')
      showStepSuccessMessage('rules', config)
    } catch (error) {
      progressTracker.fail('AI 测试规则文件生成失败')
      throw error
    }
    return
  }

  if (options.configOnly) {
    if (options.verbose) {
      console.log(chalk.gray('🎯 执行模式: 仅生成配置文件'))
    }

    progressTracker.start('生成 Vitest 配置文件')
    try {
      await generateVitestConfig(projectInfo, options)
      progressTracker.succeed('Vitest 配置文件生成完成')
      showStepSuccessMessage('config', config)
    } catch (error) {
      progressTracker.fail('Vitest 配置文件生成失败')
      throw error
    }
    return
  }

  if (options.depsOnly) {
    if (options.verbose) {
      console.log(chalk.gray('🎯 执行模式: 仅安装依赖'))
    }

    progressTracker.start('安装测试依赖')
    try {
      await installDependencies(projectInfo, options)
      progressTracker.succeed('测试依赖安装完成')
      showStepSuccessMessage('deps', config)
    } catch (error) {
      progressTracker.fail('测试依赖安装失败')
      throw error
    }
    return
  }

  if (options.setupOnly) {
    if (options.verbose) {
      console.log(chalk.gray('🎯 执行模式: 仅生成测试设置文件'))
    }

    progressTracker.start('生成测试设置文件')
    try {
      await generateTestSetup(projectInfo, options)
      progressTracker.succeed('测试设置文件生成完成')
      showStepSuccessMessage('setup', config)
    } catch (error) {
      progressTracker.fail('测试设置文件生成失败')
      throw error
    }
    return
  }

  // 完整配置流程
  if (options.verbose) {
    console.log(chalk.gray('🎯 执行模式: 完整配置流程'))
  }

  const steps = [
    {
      name: '生成 AI 测试规则文件',
      fn: () => generateCursorRules(projectInfo, options),
      description: '创建 .cursor/rules/testing-strategy.mdc 文件',
    },
    {
      name: '生成 Vitest 配置文件',
      fn: () => generateVitestConfig(projectInfo, options),
      description: '创建 vitest.config.ts 配置文件',
    },
    {
      name: '生成测试设置文件',
      fn: () => generateTestSetup(projectInfo, options),
      description: '创建 test-setup.ts 测试环境设置文件',
    },
  ]

  // 如果不跳过依赖安装，添加依赖安装步骤
  if (!options.noInstall) {
    steps.push({
      name: '安装测试依赖',
      fn: () => installDependencies(projectInfo, options),
      description: '安装 vitest、testing-library 等测试相关依赖',
    })
  }

  // 设置进度跟踪
  progressTracker.setSteps(steps)

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!

    progressTracker.startStep(i)
    progressTracker.start(step.name)

    try {
      await step.fn()
      progressTracker.succeed(step.name)
      progressTracker.completeStep()
    } catch (error) {
      progressTracker.fail(`${step.name} 失败`)
      progressTracker.failStep(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  // 显示执行总结
  progressTracker.showSummary()

  // 显示成功消息
  showTestingSuccessMessage(config)
}
