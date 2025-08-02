import chalk from 'chalk'
import ora from 'ora'
import type { ProjectDetection, ModuleOptions } from '../../types'
import { installDependencies } from './dependency-installer'
import { generateVitestConfig } from './config-generator'
import { generateCursorRules } from './rules-generator'

/**
 * 安装测试模块
 */
export async function installTestingModule(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  console.log(chalk.blue('\n📦 开始配置测试环境...'))

  // 如果是分步配置，只执行指定步骤
  if (options.rulesOnly) {
    await generateCursorRules(projectInfo, options)
    return
  }

  if (options.configOnly) {
    await generateVitestConfig(projectInfo, options)
    return
  }

  if (options.depsOnly) {
    await installDependencies(projectInfo, options)
    return
  }

  // 完整配置流程
  const steps = [
    { name: '生成 AI 测试规则文件', fn: () => generateCursorRules(projectInfo, options) },
    { name: '生成 Vitest 配置文件', fn: () => generateVitestConfig(projectInfo, options) },
  ]

  // 如果不跳过依赖安装，添加依赖安装步骤
  if (!options.noInstall) {
    steps.push({ name: '安装测试依赖', fn: () => installDependencies(projectInfo, options) })
  }

  for (const step of steps) {
    const spinner = ora(step.name).start()
    try {
      await step.fn()
      spinner.succeed(step.name)
    } catch (error) {
      spinner.fail(`${step.name} 失败`)
      throw error
    }
  }

  console.log(chalk.green('\n🎉 测试环境配置完成!'))
  console.log(chalk.yellow('\n📝 后续步骤:'))
  console.log(chalk.gray('  1. 运行 npm test 执行测试'))
  console.log(chalk.gray('  2. 查看 .cursor/testing-strategy.mdc 了解 AI 测试策略'))
  console.log(chalk.gray('  3. 在 src 目录创建 *.test.ts 文件开始编写测试'))
}