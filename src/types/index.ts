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
  /** 是否跳过依赖安装 */
  noInstall?: boolean
  /** 预览模式，不实际执行 */
  dryRun?: boolean
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
