import chalk from 'chalk'
import type { ProjectDetection, ModuleOptions } from '../types'

/**
 * 成功消息配置
 */
export interface SuccessMessageConfig {
  projectInfo: ProjectDetection
  options: ModuleOptions
  module: string
}

/**
 * 显示测试模块配置成功消息
 */
export function showTestingSuccessMessage(config: SuccessMessageConfig): void {
  const { projectInfo, options } = config

  console.log(chalk.green('\n🎉 测试环境配置完成!'))

  // 显示配置摘要
  console.log(chalk.blue('\n📋 配置摘要:'))
  console.log(chalk.gray(`  • 技术栈: ${chalk.green(projectInfo.techStack)}`))
  console.log(chalk.gray(`  • 项目架构: ${chalk.green(projectInfo.architecture)}`))
  console.log(chalk.gray(`  • 包管理器: ${chalk.green(projectInfo.packageManager)}`))
  console.log(
    chalk.gray(`  • TypeScript: ${projectInfo.isTypeScript ? chalk.green('是') : chalk.gray('否')}`)
  )
  console.log(
    chalk.gray(`  • 工作区: ${projectInfo.hasWorkspace ? chalk.green('是') : chalk.gray('否')}`)
  )

  // 显示生成的文件
  console.log(chalk.blue('\n📁 生成的文件:'))

  if (!options.depsOnly) {
    if (!options.rulesOnly && !options.setupOnly) {
      console.log(chalk.gray('  • vitest.config.ts - Vitest 配置文件'))
    }

    if (!options.configOnly && !options.depsOnly && !options.setupOnly) {
      console.log(chalk.gray('  • .cursor/rules/testing-strategy.mdc - AI 测试策略'))
    }

    if (!options.configOnly && !options.rulesOnly && !options.depsOnly) {
      console.log(chalk.gray('  • test-setup.ts - 测试环境设置'))
    }

    if (options.rulesOnly) {
      console.log(chalk.gray('  • .cursor/rules/testing-strategy.mdc - AI 测试策略'))
    }

    if (options.configOnly) {
      console.log(chalk.gray('  • vitest.config.ts - Vitest 配置文件'))
    }

    if (options.setupOnly) {
      console.log(chalk.gray('  • test-setup.ts - 测试环境设置'))
    }
  }

  // 显示安装的依赖
  if (!options.noInstall && !options.configOnly && !options.rulesOnly && !options.setupOnly) {
    console.log(chalk.blue('\n📦 安装的依赖:'))
    console.log(chalk.gray('  • vitest - 现代化测试框架'))
    console.log(chalk.gray('  • jsdom - DOM 环境模拟'))

    if (projectInfo.techStack === 'react') {
      console.log(chalk.gray('  • @testing-library/react - React 测试工具'))
      console.log(chalk.gray('  • @testing-library/jest-dom - DOM 断言扩展'))
    } else if (projectInfo.techStack.startsWith('vue')) {
      console.log(chalk.gray('  • @testing-library/vue - Vue 测试工具'))
      console.log(chalk.gray('  • @testing-library/jest-dom - DOM 断言扩展'))
    }

    if (projectInfo.isTypeScript) {
      console.log(chalk.gray('  • @types/jsdom - TypeScript 类型定义'))
    }
  }

  // 显示后续步骤
  console.log(chalk.yellow('\n📝 后续步骤:'))

  const testCommand = getTestCommand(projectInfo.packageManager)
  console.log(chalk.gray(`  1. 运行 ${chalk.cyan(testCommand)} 执行测试`))

  if (!options.configOnly && !options.depsOnly && !options.setupOnly) {
    console.log(chalk.gray('  2. 查看 .cursor/rules/testing-strategy.mdc 了解 AI 测试策略'))
  }

  console.log(chalk.gray('  3. 在 src 目录创建 *.test.ts 文件开始编写测试'))

  if (projectInfo.techStack === 'react') {
    console.log(chalk.gray('  4. 参考 React Testing Library 文档编写组件测试'))
  } else if (projectInfo.techStack.startsWith('vue')) {
    console.log(chalk.gray('  4. 参考 Vue Testing Library 文档编写组件测试'))
  }

  // 显示有用的命令
  console.log(chalk.blue('\n🔧 有用的命令:'))
  console.log(chalk.gray(`  • ${chalk.cyan(testCommand)} - 运行所有测试`))
  console.log(chalk.gray(`  • ${chalk.cyan(testCommand + ' --watch')} - 监听模式运行测试`))
  console.log(chalk.gray(`  • ${chalk.cyan(testCommand + ' --coverage')} - 生成测试覆盖率报告`))
  console.log(chalk.gray(`  • ${chalk.cyan(testCommand + ' --ui')} - 启动 Vitest UI 界面`))

  // 显示文档链接
  console.log(chalk.blue('\n📚 相关文档:'))
  console.log(chalk.gray('  • Vitest: https://vitest.dev/'))

  if (projectInfo.techStack === 'react') {
    console.log(
      chalk.gray(
        '  • React Testing Library: https://testing-library.com/docs/react-testing-library/intro/'
      )
    )
  } else if (projectInfo.techStack.startsWith('vue')) {
    console.log(
      chalk.gray(
        '  • Vue Testing Library: https://testing-library.com/docs/vue-testing-library/intro/'
      )
    )
  }

  // 工作区特定提示
  if (projectInfo.hasWorkspace) {
    const location = projectInfo.workspaceInfo?.currentLocation === 'root' ? '根目录' : '子包'
    console.log(chalk.blue(`\n🏗️  工作区提示:`))
    console.log(chalk.gray(`  • 配置已在${location}生成`))

    if (projectInfo.workspaceInfo?.currentLocation === 'root') {
      console.log(chalk.gray('  • 可以为各个子包单独配置测试环境'))
    } else {
      console.log(chalk.gray('  • 可以在根目录运行所有子包的测试'))
    }
  }

  // 问题排查提示
  console.log(chalk.blue('\n🔍 遇到问题?'))
  console.log(chalk.gray('  • 使用 pilot add testing --verbose 查看详细日志'))
  console.log(chalk.gray('  • 使用 pilot add testing --dry-run 预览配置'))
  console.log(chalk.gray('  • 检查生成的配置文件是否符合预期'))
}

/**
 * 显示通用成功消息
 */
export function showGenericSuccessMessage(module: string, config: SuccessMessageConfig): void {
  console.log(chalk.green(`\n✅ ${module} 模块配置完成!`))

  switch (module) {
    case 'testing':
      showTestingSuccessMessage(config)
      break
    case 'linting':
      console.log(chalk.yellow('🚧 Linting 模块正在开发中...'))
      break
    case 'formatting':
      console.log(chalk.yellow('🚧 Formatting 模块正在开发中...'))
      break
    default:
      console.log(chalk.gray('模块配置已完成'))
  }
}

/**
 * 根据包管理器获取测试命令
 */
function getTestCommand(packageManager: string): string {
  switch (packageManager) {
    case 'yarn':
      return 'yarn test'
    case 'pnpm':
      return 'pnpm test'
    default:
      return 'npm test'
  }
}

/**
 * 显示分步配置成功消息
 */
export function showStepSuccessMessage(step: string, config: SuccessMessageConfig): void {
  const { projectInfo } = config

  switch (step) {
    case 'config':
      console.log(chalk.green('\n✅ Vitest 配置文件生成完成!'))
      console.log(chalk.gray('  • 文件位置: vitest.config.ts'))
      console.log(chalk.gray('  • 下一步: 运行 pilot add testing --setup 生成测试设置'))
      break

    case 'rules':
      console.log(chalk.green('\n✅ AI 测试策略生成完成!'))
      console.log(chalk.gray('  • 文件位置: .cursor/rules/testing-strategy.mdc'))
      console.log(chalk.gray('  • 下一步: 运行 pilot add testing --config 生成配置文件'))
      break

    case 'setup':
      console.log(chalk.green('\n✅ 测试设置文件生成完成!'))
      console.log(chalk.gray('  • 文件位置: test-setup.ts'))
      console.log(chalk.gray('  • 下一步: 运行 pilot add testing --deps 安装依赖'))
      break

    case 'deps': {
      console.log(chalk.green('\n✅ 测试依赖安装完成!'))
      const testCommand = getTestCommand(projectInfo.packageManager)
      console.log(chalk.gray(`  • 现在可以运行 ${chalk.cyan(testCommand)} 执行测试`))
      console.log(chalk.gray('  • 在 src 目录创建 *.test.ts 文件开始编写测试'))
      break
    }
  }
}
