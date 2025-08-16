import chalk from 'chalk'
import ora, { type Ora } from 'ora'

/**
 * 进度跟踪器接口
 */
export interface ProgressTracker {
  start(message: string): void
  update(message: string): void
  succeed(message?: string): void
  fail(message?: string): void
  info(message: string): void
  warn(message: string): void
  log(message: string): void
}

/**
 * 步骤信息
 */
export interface ProgressStep {
  name: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

/**
 * 进度跟踪器实现
 */
export class CLIProgressTracker implements ProgressTracker {
  private spinner: Ora | null = null
  private verbose: boolean
  private steps: ProgressStep[] = []
  private currentStepIndex = -1

  constructor(verbose = false) {
    this.verbose = verbose
  }

  /**
   * 设置步骤列表
   */
  setSteps(steps: Omit<ProgressStep, 'status'>[]): void {
    this.steps = steps.map((step) => ({ ...step, status: 'pending' }))

    if (this.verbose) {
      console.log(chalk.blue('\n📋 执行计划:'))
      this.steps.forEach((step, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${step.name}`))
        if (step.description) {
          console.log(chalk.gray(`     ${step.description}`))
        }
      })
      console.log()
    }
  }

  /**
   * 开始新步骤
   */
  startStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      const step = this.steps[stepIndex]!
      this.currentStepIndex = stepIndex
      step.status = 'running'

      if (this.verbose) {
        console.log(chalk.blue(`\n🔄 步骤 ${stepIndex + 1}/${this.steps.length}: ${step.name}`))
        if (step.description) {
          console.log(chalk.gray(`   ${step.description}`))
        }
      }
    }
  }

  /**
   * 完成当前步骤
   */
  completeStep(): void {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
      const currentStep = this.steps[this.currentStepIndex]!
      currentStep.status = 'completed'

      if (this.verbose) {
        console.log(chalk.green(`✅ 完成: ${currentStep.name}`))
      }
    }
  }

  /**
   * 步骤失败
   */
  failStep(error?: string): void {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
      const currentStep = this.steps[this.currentStepIndex]!
      currentStep.status = 'failed'

      if (this.verbose) {
        console.log(chalk.red(`❌ 失败: ${currentStep.name}`))
        if (error) {
          console.log(chalk.red(`   错误: ${error}`))
        }
      }
    }
  }

  /**
   * 显示进度总结
   */
  showSummary(): void {
    if (this.steps.length === 0) return

    const completed = this.steps.filter((s) => s.status === 'completed').length
    const failed = this.steps.filter((s) => s.status === 'failed').length
    const total = this.steps.length

    console.log(chalk.blue('\n📊 执行总结:'))
    console.log(chalk.green(`  ✅ 已完成: ${completed}/${total}`))

    if (failed > 0) {
      console.log(chalk.red(`  ❌ 失败: ${failed}/${total}`))
    }

    if (this.verbose) {
      console.log(chalk.gray('\n📝 详细结果:'))
      this.steps.forEach((step, index) => {
        const icon =
          step.status === 'completed'
            ? '✅'
            : step.status === 'failed'
              ? '❌'
              : step.status === 'running'
                ? '🔄'
                : '⏸️'
        console.log(chalk.gray(`  ${icon} ${index + 1}. ${step.name}`))
      })
    }
  }

  start(message: string): void {
    this.spinner = ora(message).start()
  }

  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message
    }
  }

  succeed(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message)
      this.spinner = null
    }
  }

  fail(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message)
      this.spinner = null
    }
  }

  info(message: string): void {
    if (this.spinner) {
      this.spinner.info(message)
    } else {
      console.log(chalk.blue('ℹ'), message)
    }
  }

  warn(message: string): void {
    if (this.spinner) {
      this.spinner.warn(message)
    } else {
      console.log(chalk.yellow('⚠'), message)
    }
  }

  log(message: string): void {
    if (this.verbose) {
      if (this.spinner) {
        this.spinner.stop()
        console.log(chalk.gray(message))
        this.spinner.start()
      } else {
        console.log(chalk.gray(message))
      }
    }
  }
}

/**
 * 创建进度跟踪器
 */
export function createProgressTracker(verbose = false): CLIProgressTracker {
  return new CLIProgressTracker(verbose)
}
