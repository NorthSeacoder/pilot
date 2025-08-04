/**
 * 支持的前端技术栈
 */
export type TechStack = 'react' | 'vue2' | 'vue3'

/**
 * 支持的项目架构
 */
export type ProjectArchitecture = 'single' | 'pnpm-workspace' | 'yarn-workspace'

/**
 * 支持的功能模块
 */
export type Module = 'testing' | 'linting' | 'formatting'

/**
 * 工作区包信息
 */
export interface WorkspacePackage {
  /** 包名 */
  name: string
  /** 包路径 */
  path: string
  /** package.json 内容 */
  packageJson: any
}

/**
 * 工作区信息
 */
export interface WorkspaceInfo {
  /** 工作区类型 */
  type: 'pnpm' | 'yarn'
  /** 工作区包列表 */
  packages: WorkspacePackage[]
  /** 根目录 package.json */
  rootPackageJson: any
  /** 当前执行位置 */
  currentLocation: 'root' | 'package'
  /** 当前包信息（如果在包内执行） */
  currentPackage?: WorkspacePackage
}

/**
 * 现有配置信息
 */
export interface ExistingConfig {
  /** 配置类型 */
  type: 'vitest' | 'jest' | 'testing-library' | 'custom'
  /** 文件路径 */
  filePath: string
  /** 配置内容 */
  content: any
  /** 冲突项 */
  conflicts: string[]
}

/**
 * 版本兼容性信息
 */
export interface VersionCompatibility {
  /** React 版本 */
  react?: string
  /** Vue 版本 */
  vue?: string
  /** TypeScript 版本 */
  typescript?: string
  /** 兼容的 Testing Library 版本 */
  compatibleTestingLibrary?: string
  /** 兼容的 Vitest 版本 */
  compatibleVitest?: string
}

/**
 * 依赖规格定义
 */
export interface DependencySpec {
  name: string
  version?: string
  dev: boolean
  peer?: boolean
  optional?: boolean
}

/**
 * 冲突报告
 */
export interface ConflictReport {
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  resolutions: ConflictResolution[]
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  dependency: string
  existingVersion: string
  requiredVersion: string
  severity: 'error' | 'warning' | 'info'
  description: string
}

/**
 * 冲突解决方案
 */
export interface ConflictResolution {
  type: 'upgrade' | 'downgrade' | 'replace' | 'skip'
  dependency: string
  fromVersion: string
  toVersion: string
  reason: string
}

/**
 * 依赖分析结果
 */
export interface DependencyAnalysis {
  existingDependencies: Record<string, string>
  conflicts: ConflictReport
  recommendations: DependencySpec[]
  compatibilityMatrix: CompatibilityMatrix
}

/**
 * 兼容性矩阵
 */
export interface CompatibilityMatrix {
  [framework: string]: {
    [version: string]: {
      testingLibrary: string
      vitest: string
      jsdom: string
      additionalDeps: DependencySpec[]
    }
  }
}

/**
 * 错误处理上下文信息
 */
export interface ErrorContext {
  /** 操作名称 */
  operation: string
  /** 文件路径（可选） */
  filePath?: string
  /** 详细信息（可选） */
  details?: Record<string, any>
}

/**
 * 项目检测结果
 */
export interface ProjectDetection {
  /** 技术栈 */
  techStack: TechStack
  /** 项目架构 */
  architecture: ProjectArchitecture
  /** 项目根目录 */
  rootDir: string
  /** 包管理器 */
  packageManager: 'npm' | 'yarn' | 'pnpm'
  /** 是否为 TypeScript 项目 */
  isTypeScript: boolean
  /** 是否为工作区项目 */
  hasWorkspace: boolean
  /** 是否已有测试配置 */
  hasExistingTests: boolean
  /** 现有测试框架 */
  existingTestFrameworks: string[]
  /** 工作区信息（如果适用） */
  workspaceInfo?: WorkspaceInfo
  /** 依赖版本信息 */
  dependencyVersions: Record<string, string>
  /** 现有配置列表 */
  existingConfigs: ExistingConfig[]
  /** 当前执行目录 */
  currentDir: string
  /** Node.js 版本 */
  nodeVersion: string
}

/**
 * 模块配置选项
 */
export interface ModuleOptions {
  /** 是否仅生成配置文件 */
  configOnly?: boolean
  /** 是否仅生成 AI 规则 */
  rulesOnly?: boolean
  /** 是否仅安装依赖 */
  depsOnly?: boolean
  /** 是否仅生成测试设置文件 */
  setupOnly?: boolean
  /** 是否跳过依赖安装 */
  noInstall?: boolean
  /** 预览模式，不实际执行 */
  dryRun?: boolean
  /** 强制覆盖已存在的配置文件，不进行备份 */
  force?: boolean
  /** 覆盖自动检测的技术栈 */
  stack?: TechStack
  /** 覆盖自动检测的架构 */
  arch?: ProjectArchitecture
  /** 详细输出 */
  verbose?: boolean
}

/**
 * Pilot 命令选项
 */
export interface PilotOptions {
  /** 要添加的模块 */
  module: Module
  /** 模块配置选项 */
  options: ModuleOptions
}

/**
 * 配置冲突类型
 */
export type ConflictType = 'config-exists' | 'dependency-mismatch' | 'setup-conflict' | 'version-incompatible'

/**
 * 冲突严重程度
 */
export type ConflictSeverity = 'error' | 'warning' | 'info'

/**
 * 解决策略
 */
export type ResolutionStrategy = 'merge' | 'replace' | 'backup' | 'skip' | 'manual'

/**
 * 配置冲突信息
 */
export interface ConfigConflict {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  filePath: string
  description: string
  existingValue: any
  newValue: any
  suggestedStrategy: ResolutionStrategy
  availableStrategies: ResolutionStrategy[]
}

/**
 * 冲突解决选项
 */
export interface ConflictResolutionOptions {
  strategy: ResolutionStrategy
  backupOriginal: boolean
  preserveComments: boolean
  mergeStrategy?: 'deep' | 'shallow' | 'selective'
  userChoices?: Record<string, any>
}

/**
 * 冲突解决结果
 */
export interface ConflictResolutionResult {
  resolved: boolean
  strategy: ResolutionStrategy
  filePath: string
  backupPath?: string
  changes: string[]
  errors: string[]
}

/**
 * 冲突检测上下文
 */
export interface ConflictDetectionContext {
  projectInfo: ProjectDetection
  options: ModuleOptions
  targetFiles: string[]
  newConfigs: Record<string, any>
}
