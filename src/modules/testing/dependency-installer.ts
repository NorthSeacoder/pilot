import { execa } from 'execa'
import type { ProjectDetection, ModuleOptions } from '../../types'

/**
 * 测试相关依赖包定义
 */
const testingDependencies = {
  base: [
    'vitest',
    '@vitest/ui',
  ],
  react: [
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'jsdom',
  ],
  vue2: [
    '@vue/test-utils',
    '@testing-library/vue',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'jsdom',
  ],
  vue3: [
    '@vue/test-utils',
    '@testing-library/vue',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'jsdom',
  ],
}

/**
 * 安装测试依赖
 */
export async function installDependencies(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const { techStack, packageManager } = projectInfo
  
  // 构建要安装的依赖列表
  const dependencies = [
    ...testingDependencies.base,
    ...testingDependencies[techStack],
  ]

  // 根据包管理器选择安装命令
  const installCommand = getInstallCommand(packageManager)
  const args = [...installCommand, '--save-dev', ...dependencies]

  if (options.verbose) {
    console.log(`执行命令: ${args.join(' ')}`)
  }

  // 执行安装
  await execa(args[0], args.slice(1), {
    cwd: projectInfo.rootDir,
    stdio: options.verbose ? 'inherit' : 'pipe',
  })
}

/**
 * 根据包管理器获取安装命令
 */
function getInstallCommand(packageManager: string): string[] {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', 'add']
    case 'yarn':
      return ['yarn', 'add']
    case 'npm':
    default:
      return ['npm', 'install']
  }
}