import { execa } from 'execa'
import { writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ProjectDetection, ModuleOptions, DependencySpec } from '../../types'
import { analyzeProjectDependenciesV2 } from '../../core/detection/dependency-analyzer'
import { FrameworkDependencyManager } from './framework-dependency-manager'

/**
 * 安装选项
 */
export interface InstallOptions {
  /** 是否为增量安装（只安装缺失的依赖） */
  incremental?: boolean
  /** 是否创建备份 */
  backup?: boolean
  /** 是否在工作区根目录安装 */
  workspaceRoot?: boolean
  /** 详细输出 */
  verbose?: boolean
  /** 预览模式 */
  dryRun?: boolean
}

/**
 * 安装结果
 */
export interface InstallResult {
  /** 是否成功 */
  success: boolean
  /** 已安装的依赖 */
  installed: string[]
  /** 跳过的依赖（已存在） */
  skipped: string[]
  /** 失败的依赖 */
  failed: string[]
  /** 备份文件路径 */
  backupPath?: string
  /** 错误信息 */
  error?: string
}

/**
 * 备份信息
 */
interface BackupInfo {
  packageJsonPath: string
  backupPath: string
  originalContent: string
}

/**
 * 增强的依赖安装器
 */
export class DependencyInstaller {
  private projectInfo: ProjectDetection
  private options: InstallOptions
  private backupInfo?: BackupInfo

  constructor(projectInfo: ProjectDetection, options: InstallOptions = {}) {
    this.projectInfo = projectInfo
    this.options = options
  }

  /**
   * 安装测试依赖
   */
  async installDependencies(): Promise<InstallResult> {
    try {
      // 分析项目依赖
      const packageJsonPath = this.getPackageJsonPath()
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
      
      const analysis = await analyzeProjectDependenciesV2(
        packageJson,
        this.projectInfo.techStack,
        this.projectInfo.isTypeScript,
        FrameworkDependencyManager
      )

      // 处理冲突
      if (analysis.conflicts.hasConflicts) {
        if (this.options.verbose) {
          console.log('检测到依赖冲突:')
          analysis.conflicts.conflicts.forEach(conflict => {
            console.log(`  - ${conflict.dependency}: ${conflict.description}`)
          })
        }
      }

      // 确定要安装的依赖
      const dependenciesToInstall = this.options.incremental
        ? this.filterMissingDependencies(analysis.recommendations, analysis.existingDependencies)
        : analysis.recommendations

      const skippedDependencies = this.options.incremental
        ? analysis.recommendations.filter(dep => analysis.existingDependencies[dep.name]).map(dep => dep.name)
        : []

      if (dependenciesToInstall.length === 0) {
        return {
          success: true,
          installed: [],
          skipped: skippedDependencies,
          failed: []
        }
      }

      // 创建备份
      if (this.options.backup) {
        await this.createBackup(packageJsonPath, packageJson)
      }

      // 预览模式
      if (this.options.dryRun) {
        return this.previewInstallation(dependenciesToInstall)
      }

      // 执行安装
      const installResult = await this.executeInstallation(dependenciesToInstall)
      installResult.skipped = skippedDependencies
      return installResult

    } catch (error) {
      // 安装失败时回滚
      if (this.backupInfo) {
        await this.rollback()
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        installed: [],
        skipped: [],
        failed: [],
        error: errorMessage
      }
    }
  }

  /**
   * 获取 package.json 路径
   */
  private getPackageJsonPath(): string {
    // 根据执行位置和工作区配置确定 package.json 位置
    if (this.options.workspaceRoot && this.projectInfo.workspaceInfo) {
      return path.join(this.projectInfo.rootDir, 'package.json')
    }

    // 如果在工作区子项目中执行，使用当前目录的 package.json
    if (this.projectInfo.workspaceInfo?.currentLocation === 'package' && 
        this.projectInfo.workspaceInfo.currentPackage) {
      return path.join(this.projectInfo.workspaceInfo.currentPackage.path, 'package.json')
    }

    // 默认使用项目根目录
    return path.join(this.projectInfo.rootDir, 'package.json')
  }

  /**
   * 过滤缺失的依赖
   */
  private filterMissingDependencies(
    recommendations: DependencySpec[],
    existingDependencies: Record<string, string>
  ): DependencySpec[] {
    return recommendations.filter(dep => !existingDependencies[dep.name])
  }

  /**
   * 创建备份
   */
  private async createBackup(packageJsonPath: string, packageJson: any): Promise<void> {
    const backupPath = `${packageJsonPath}.backup.${Date.now()}`
    const originalContent = JSON.stringify(packageJson, null, 2)
    
    await writeFile(backupPath, originalContent, 'utf-8')
    
    this.backupInfo = {
      packageJsonPath,
      backupPath,
      originalContent
    }

    if (this.options.verbose) {
      console.log(`已创建备份: ${backupPath}`)
    }
  }

  /**
   * 预览安装
   */
  private previewInstallation(dependencies: DependencySpec[]): InstallResult {
    if (this.options.verbose) {
      console.log('预览模式 - 将要安装的依赖:')
      dependencies.forEach(dep => {
        const version = dep.version ? `@${dep.version}` : ''
        const type = dep.dev ? ' (dev)' : ''
        console.log(`  - ${dep.name}${version}${type}`)
      })
    }

    return {
      success: true,
      installed: dependencies.map(dep => dep.name),
      skipped: [],
      failed: []
    }
  }

  /**
   * 执行安装
   */
  private async executeInstallation(dependencies: DependencySpec[]): Promise<InstallResult> {
    const installResult: InstallResult = {
      success: true,
      installed: [],
      skipped: [],
      failed: []
    }

    // 按类型分组依赖
    const devDeps = dependencies.filter(dep => dep.dev)
    const prodDeps = dependencies.filter(dep => !dep.dev)

    try {
      // 安装生产依赖
      if (prodDeps.length > 0) {
        const result = await this.installDependencyGroup(prodDeps, false)
        installResult.installed.push(...result.installed)
        installResult.failed.push(...result.failed)
      }

      // 安装开发依赖
      if (devDeps.length > 0) {
        const result = await this.installDependencyGroup(devDeps, true)
        installResult.installed.push(...result.installed)
        installResult.failed.push(...result.failed)
      }

      installResult.success = installResult.failed.length === 0
      installResult.backupPath = this.backupInfo?.backupPath

      // 如果有失败的依赖，抛出错误
      if (installResult.failed.length > 0) {
        throw new Error(`Failed to install dependencies: ${installResult.failed.join(', ')}`)
      }

      return installResult
    } catch (error) {
      // 重新抛出错误，让上层处理
      throw error
    }
  }

  /**
   * 安装依赖组
   */
  private async installDependencyGroup(
    dependencies: DependencySpec[],
    isDev: boolean
  ): Promise<{ installed: string[]; failed: string[] }> {
    const installed: string[] = []
    const failed: string[] = []

    try {
      const installCommand = this.getInstallCommand(isDev)
      const depStrings = dependencies.map(dep => 
        dep.version ? `${dep.name}@${dep.version}` : dep.name
      )
      
      const args = [...installCommand, ...depStrings]
      const cwd = path.dirname(this.getPackageJsonPath())

      if (args.length === 0) {
        throw new Error('无法生成安装命令')
      }

      if (this.options.verbose) {
        console.log(`执行命令: ${args.join(' ')}`)
        console.log(`工作目录: ${cwd}`)
      }

      await execa(args[0]!, args.slice(1), {
        cwd,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
      })

      installed.push(...dependencies.map(dep => dep.name))

    } catch (error) {
      if (this.options.verbose) {
        console.error('安装失败:', error)
      }
      failed.push(...dependencies.map(dep => dep.name))
    }

    return { installed, failed }
  }

  /**
   * 回滚操作
   */
  private async rollback(): Promise<void> {
    if (!this.backupInfo) {
      return
    }

    try {
      await writeFile(this.backupInfo.packageJsonPath, this.backupInfo.originalContent, 'utf-8')
      
      if (this.options.verbose) {
        console.log(`已回滚到备份: ${this.backupInfo.backupPath}`)
      }
    } catch (error) {
      if (this.options.verbose) {
        console.error('回滚失败:', error)
      }
    }
  }

  /**
   * 检测是否在工作区根目录安装依赖
   */
  private isWorkspaceRoot(): boolean {
    const { workspaceInfo, currentDir, rootDir, hasWorkspace } = this.projectInfo
    
    // 如果没有工作区，不是工作区项目
    if (!hasWorkspace || !workspaceInfo) {
      return false
    }
    
    // 检查当前是否在工作区根目录
    // 无论currentLocation是什么，只要currentDir等于rootDir就是在根目录
    return currentDir === rootDir
  }

  /**
   * 根据包管理器和依赖类型获取安装命令
   */
  private getInstallCommand(isDev: boolean): string[] {
    const { packageManager } = this.projectInfo
    
    switch (packageManager) {
      case 'pnpm':
        const pnpmCmd = isDev ? ['pnpm', 'add', '-D'] : ['pnpm', 'add']
        // 如果在pnpm工作区根目录，添加 -w 标志
        if (this.isWorkspaceRoot()) {
          pnpmCmd.push('-w')
        }
        return pnpmCmd
      case 'yarn':
        return isDev ? ['yarn', 'add', '--dev'] : ['yarn', 'add']
      case 'npm':
      default:
        return isDev ? ['npm', 'install', '--save-dev'] : ['npm', 'install', '--save']
    }
  }
}

/**
 * 安装测试依赖（向后兼容的函数）
 */
export async function installDependencies(
  projectInfo: ProjectDetection,
  options: ModuleOptions
): Promise<void> {
  const installer = new DependencyInstaller(projectInfo, {
    incremental: true,
    backup: true,
    verbose: options.verbose,
    dryRun: options.dryRun
  })

  const result = await installer.installDependencies()
  
  if (!result.success) {
    throw new Error(result.error || '依赖安装失败')
  }

  if (options.verbose) {
    console.log(`已安装 ${result.installed.length} 个依赖`)
    if (result.skipped.length > 0) {
      console.log(`跳过 ${result.skipped.length} 个已存在的依赖`)
    }
  }
}

// 移除了向后兼容的 getInstallCommand 函数，现在使用类内部的方法