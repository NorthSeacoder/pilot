import { Command } from 'commander'

/**
 * CLI 命令接口
 */
export interface CLICommand {
  name: string
  description: string
  aliases?: string[]
  options?: CLIOption[]
  subcommands?: CLICommand[]
  handler?: (args: any, options: any) => Promise<void>
}

/**
 * CLI 选项接口
 */
export interface CLIOption {
  flags: string
  description: string
  defaultValue?: any
  choices?: string[]
}

/**
 * 命令注册器
 */
export class CommandRegistry {
  private commands: Map<string, CLICommand> = new Map()
  private program: Command

  constructor(program: Command) {
    this.program = program
  }

  /**
   * 注册命令
   */
  register(command: CLICommand): void {
    this.commands.set(command.name, command)
    this.setupCommand(command, this.program)
  }

  /**
   * 获取已注册的命令
   */
  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name)
  }

  /**
   * 获取所有命令
   */
  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values())
  }

  /**
   * 设置命令到 Commander 程序
   */
  private setupCommand(cliCommand: CLICommand, parent: Command): void {
    const command = parent.command(cliCommand.name)
    
    if (cliCommand.description) {
      command.description(cliCommand.description)
    }

    if (cliCommand.aliases) {
      command.aliases(cliCommand.aliases)
    }

    // 添加选项
    if (cliCommand.options) {
      for (const option of cliCommand.options) {
        if (option.choices) {
          command.option(option.flags, option.description, option.defaultValue)
        } else {
          command.option(option.flags, option.description, option.defaultValue)
        }
      }
    }

    // 添加子命令
    if (cliCommand.subcommands) {
      for (const subcommand of cliCommand.subcommands) {
        this.setupCommand(subcommand, command)
      }
    }

    // 设置处理器
    if (cliCommand.handler) {
      command.action(cliCommand.handler)
    }
  }
}

/**
 * 创建默认命令注册器
 */
export function createCommandRegistry(program: Command): CommandRegistry {
  return new CommandRegistry(program)
}

/**
 * 预定义的命令模板
 */
export const COMMAND_TEMPLATES = {
  /**
   * Add 命令模板
   */
  ADD_COMMAND: {
    name: 'add <module>',
    description: '添加功能模块到项目',
    options: [
      {
        flags: '--config',
        description: '仅生成配置文件'
      },
      {
        flags: '--rules',
        description: '仅生成 AI 规则文件'
      },
      {
        flags: '--deps',
        description: '仅安装依赖'
      },
      {
        flags: '--setup',
        description: '仅生成测试设置文件'
      },
      {
        flags: '--no-install',
        description: '跳过依赖安装'
      },
      {
        flags: '--dry-run',
        description: '预览模式，显示将要执行的操作但不实际执行'
      },
      {
        flags: '--stack <stack>',
        description: '覆盖自动检测的技术栈 (react|vue2|vue3)'
      },
      {
        flags: '--arch <arch>',
        description: '覆盖自动检测的架构 (single|pnpm-workspace|yarn-workspace)'
      },
      {
        flags: '-v, --verbose',
        description: '显示详细的操作日志和调试信息'
      }
    ]
  } as CLICommand,

  /**
   * Remove 命令模板（未来扩展）
   */
  REMOVE_COMMAND: {
    name: 'remove <module>',
    description: '从项目中移除功能模块',
    aliases: ['rm'],
    options: [
      {
        flags: '--keep-config',
        description: '保留配置文件'
      },
      {
        flags: '--keep-deps',
        description: '保留依赖包'
      },
      {
        flags: '--dry-run',
        description: '预览模式'
      },
      {
        flags: '-v, --verbose',
        description: '显示详细日志'
      }
    ]
  } as CLICommand,

  /**
   * List 命令模板（未来扩展）
   */
  LIST_COMMAND: {
    name: 'list',
    description: '列出已安装的模块',
    aliases: ['ls'],
    options: [
      {
        flags: '--json',
        description: '以 JSON 格式输出'
      },
      {
        flags: '--verbose',
        description: '显示详细信息'
      }
    ]
  } as CLICommand,

  /**
   * Status 命令模板（未来扩展）
   */
  STATUS_COMMAND: {
    name: 'status',
    description: '显示项目状态和已配置的模块',
    options: [
      {
        flags: '--check',
        description: '检查配置完整性'
      },
      {
        flags: '--json',
        description: '以 JSON 格式输出'
      }
    ]
  } as CLICommand,

  /**
   * Update 命令模板（未来扩展）
   */
  UPDATE_COMMAND: {
    name: 'update [module]',
    description: '更新模块配置到最新版本',
    options: [
      {
        flags: '--all',
        description: '更新所有模块'
      },
      {
        flags: '--dry-run',
        description: '预览模式'
      },
      {
        flags: '--force',
        description: '强制更新，覆盖本地修改'
      }
    ]
  } as CLICommand
}

/**
 * 模块处理器接口
 */
export interface ModuleHandler {
  name: string
  install: (projectInfo: any, options: any) => Promise<void>
  remove?: (projectInfo: any, options: any) => Promise<void>
  update?: (projectInfo: any, options: any) => Promise<void>
  status?: (projectInfo: any) => Promise<any>
}

/**
 * 模块注册器
 */
export class ModuleRegistry {
  private modules: Map<string, ModuleHandler> = new Map()

  /**
   * 注册模块处理器
   */
  register(handler: ModuleHandler): void {
    this.modules.set(handler.name, handler)
  }

  /**
   * 获取模块处理器
   */
  getHandler(name: string): ModuleHandler | undefined {
    return this.modules.get(name)
  }

  /**
   * 获取所有模块
   */
  getAllModules(): string[] {
    return Array.from(this.modules.keys())
  }

  /**
   * 检查模块是否存在
   */
  hasModule(name: string): boolean {
    return this.modules.has(name)
  }
}

/**
 * 创建模块注册器
 */
export function createModuleRegistry(): ModuleRegistry {
  return new ModuleRegistry()
}