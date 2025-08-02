# Pilot - 前端项目增强工具

> 🚀 可扩展的前端项目开发体验增强平台

## 📖 项目概述

Pilot 是一个参考 Astro `astro add` 设计理念的命令行工具，为前端项目提供模块化的开发体验增强。通过智能检测项目技术栈和架构，自动安装相应依赖，生成最佳实践配置，让开发者快速获得高质量的开发环境。

当前专注于 AI 辅助的测试环境配置，未来将扩展到代码质量检查、格式化、构建优化等更多开发体验模块。

### 核心价值
- **🔍 智能检测**：自动识别React/Vue2/Vue3技术栈和项目架构
- **🔧 模块化设计**：插件化架构，按需添加功能模块
- **⚡ 一键配置**：零配置体验，自动安装依赖和生成配置文件
- **🤖 AI 增强**：集成企业级 AI 开发规则和最佳实践
- **📦 渐进增强**：支持单项配置和完整配置，适应不同使用场景
- **🛡️ 安全可靠**：完整的错误处理和回滚机制
- **🏗️ 架构友好**：原生支持单模块、pnpm workspace、yarn workspace

## 🎯 设计目标

### V1.0 MVP 功能 - Testing 模块 ✅ 已完成
- [x] 项目技术栈自动检测（React/Vue2/Vue3）
- [x] 项目架构检测（单模块/pnpm workspace/yarn workspace）
- [x] AI 测试规则文件生成(.cursor/testing-strategy.mdc)
- [x] Vitest 基础配置生成
- [x] 测试依赖自动安装
- [ ] CI/CD 配置模板
- [x] CLI 命令行界面完整实现

### V2.0 扩展功能 - 代码质量模块
- [ ] Git Hooks 模块（Husky + lint-staged）
- [ ] 交互式配置向导
- [ ] 多项目类型支持（组件库/业务项目/工具库）

### V3.0 完整生态 - 构建优化模块
- [ ] Build 模块（Vite/Webpack 优化配置）
- [ ] Bundle 分析和优化建议
- [ ] Performance 监控集成
- [ ] 自定义插件开发SDK

## 🚀 快速开始

### 安装
```bash
npm install -g pilot
# 或
npx pilot@latest
```

### 基础使用
```bash
# 完整测试配置（推荐，自动检测项目类型）
pilot add testing

# 分步配置
pilot add testing --rules      # 仅添加 AI 测试规则
pilot add testing --config     # 仅添加 Vitest 配置  
pilot add testing --deps       # 仅安装测试依赖

# 未来功能预览
pilot add linting                 # 添加代码检查模块
pilot add formatting              # 添加代码格式化模块
```

### 高级用法
```bash
# 预览模式（查看将要生成的配置）
pilot add testing --dry-run

# 跳过依赖安装（仅生成配置文件）
pilot add testing --no-install

# 覆盖自动检测（仅在检测失败时使用）
pilot add testing --stack vue3 --arch pnpm
```

## 🏗️ 技术架构

### 命令系统设计
```bash
# 当前支持命令
pilot add <module>          # 添加功能模块

# 未来规划命令  
pilot remove <module>       # 移除功能模块
pilot update <module>       # 更新功能模块
pilot list                  # 列出已安装模块
pilot status               # 查看模块状态
```

### 核心模块设计
```
pilot/
├── src/
│   ├── cli/              # 命令行接口
│   │   ├── commands/     # 核心命令
│   │   │   ├── add.ts          # 添加模块命令
│   │   │   ├── remove.ts       # 移除模块命令（规划中）
│   │   │   ├── update.ts       # 更新模块命令（规划中）
│   │   │   ├── list.ts         # 列出模块命令（规划中）
│   │   │   └── status.ts       # 模块状态命令（规划中）
│   │   └── index.ts      # CLI 入口
│   ├── core/
│   │   ├── detection/    # 项目检测模块
│   │   │   ├── index.ts        # 检测器统一入口
│   │   │   ├── framework.ts    # 框架检测（React/Vue2/Vue3）
│   │   │   ├── architecture.ts # 项目架构检测
│   │   │   └── project.ts      # 项目类型检测
│   │   ├── plugin.ts     # 插件系统核心
│   │   └── installer.ts  # 依赖安装管理
│   ├── modules/          # 功能模块
│   │   ├── testing/      # 测试模块
│   │   │   ├── generator.ts    # 测试配置生成
│   │   │   ├── rules.ts        # AI 规则生成
│   │   │   └── templates/      # 测试相关模板
│   │   ├── linting/      # 代码检查模块（规划中）
│   │   └── formatting/   # 格式化模块（规划中）
│   └── utils/           # 工具函数
├── templates/           # 通用模板文件
└── tests/              # 测试文件
```

### 智能检测引擎
- **自动技术栈检测**：通过 package.json 分析依赖特征（React/Vue2/Vue3）
- **自动架构检测**：识别单模块、pnpm workspace、yarn workspace
- **智能项目类型识别**：基于文件结构和命名规范
- **配置冲突检测**：自动检测已有配置并智能合并
- **环境兼容性验证**：自动验证 Node.js 版本和包管理器
- **覆盖选项支持**：检测失败时支持手动指定参数

### 配置生成策略
- **模板驱动**：基于现有最佳实践模板
- **智能替换**：根据检测结果动态调整配置
- **增量更新**：支持部分配置更新而非全量替换
- **冲突解决**：自动处理配置冲突和合并

## 📋 支持的项目类型

### 技术栈支持
- **React**: Create React App, Vite, Next.js
- **Vue3**: Vite, Vue CLI, Nuxt3  
- **Vue2**: Vue CLI, 自定义Webpack配置

### 项目类型支持
- **组件库**: UI组件库，设计系统
- **业务应用**: 管理后台，业务系统
- **工具库**: 纯JavaScript/TypeScript库
- **移动端**: React Native, Vue移动端

### 测试栈支持
- **测试框架**: Vitest (专用，不支持Jest)
- **测试库**: @testing-library系列
- **覆盖率**: v8 (Vitest内置)
- **模拟工具**: vi.mock (Vitest内置), MSW

### 项目架构支持（按优先级）
- **单模块项目**: 标准的单个 package.json 项目结构
- **pnpm workspace**: 通过 `pnpm-workspace.yaml` 检测和配置
- **Yarn workspace**: 通过 `package.json` 的 workspaces 字段检测和配置

*注：Lerna、NX、Rush 等复杂 monorepo 工具暂不支持，专注于主流的 workspace 解决方案*

## 🧰 推荐工具库

基于最新的 CLI 开发生态调研，以下是我们推荐的工具库组合：

### 核心CLI框架 ✅ 已采用
- **[Commander.js](https://www.npmjs.com/package/commander)** (当前使用)
  - 成熟稳定，社区活跃，TypeScript支持良好
  - 被 webpack-cli、babel-cli 等大量项目使用
  - 版本: v14.x，下载量: ~200M/周
  - ✅ 已集成子命令支持，完美适配 `pilot add <module>` 架构

### 用户交互 ✅ 已采用
- **[Inquirer.js](https://www.npmjs.com/package/inquirer)** (当前使用)
  - 功能丰富，插件生态完整
  - 被 create-react-app、Angular CLI 使用
  - ✅ 已集成，支持交互式配置（预留接口）

### 输出美化 ✅ 已采用
- **[Chalk](https://www.npmjs.com/package/chalk)** (当前使用)
  - 颜色和样式的标准选择
  - 无依赖，性能优异
  - ✅ 已集成彩色输出和错误提示
- **[Ora](https://www.npmjs.com/package/ora)** (当前使用)
  - 加载动画和进度显示
  - ✅ 已集成项目检测和安装进度显示
- **[Boxen](https://www.npmjs.com/package/boxen)** (当前使用)
  - 创建漂亮的终端框架
  - ✅ 已集成欢迎信息展示

### 文件系统操作 ✅ 已采用
- **[fs-extra](https://www.npmjs.com/package/fs-extra)** (当前使用)
  - Node.js fs 模块的增强版
  - ✅ 已集成文件读写和目录操作
- **[glob](https://www.npmjs.com/package/glob)** (当前使用)
  - 文件模式匹配
  - ✅ 已集成文件查找功能
- **[find-up](https://www.npmjs.com/package/find-up)** (当前使用)
  - 向上查找文件
  - ✅ 已集成 package.json 查找

### 进程管理 ✅ 已采用
- **[execa](https://www.npmjs.com/package/execa)** (当前使用)
  - 更好的 child_process，支持 Promise
  - ✅ 已集成依赖安装管理

### 配置管理 ✅ 已采用
- **[cosmiconfig](https://www.npmjs.com/package/cosmiconfig)** (当前使用)
  - 灵活的配置文件加载
  - ✅ 已集成配置文件处理（预留接口）

### 日志调试
- **[debug](https://www.npmjs.com/package/debug)**
  - 轻量级调试工具
- **[signale](https://www.npmjs.com/package/signale)**
  - 美观的日志记录器

### 配置管理
- **[cosmiconfig](https://www.npmjs.com/package/cosmiconfig)**
  - 灵活的配置文件加载
- **[conf](https://www.npmjs.com/package/conf)**
  - 简单的配置存储

## 🛠️ 开发指南

### 本地开发
```bash
# 克隆项目
git clone https://github.com/your-org/pilot
cd pilot

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test
```

### 项目结构
```
src/
├── cli/
│   ├── index.ts          # CLI入口
│   ├── commands/         # 命令实现
│   └── options.ts        # 命令行选项定义
├── core/
│   ├── detector.ts       # 项目检测逻辑
│   ├── generator.ts      # 配置生成逻辑
│   └── installer.ts      # 依赖安装逻辑
├── templates/
│   ├── rules/           # AI规则模板
│   ├── configs/         # 配置文件模板
│   └── index.ts         # 模板管理
└── utils/
    ├── logger.ts        # 日志工具
    ├── file.ts          # 文件操作
    └── validation.ts    # 配置验证
```

## 🎨 用户体验设计

### 日志系统
- **进度显示**: 实时显示配置进度
- **彩色输出**: 区分信息等级的颜色编码
- **详细模式**: --verbose支持详细日志
- **静默模式**: --quiet最小化输出

### 错误处理
- **友好提示**: 人性化的错误消息
- **解决建议**: 每个错误都提供解决方案
- **自动回滚**: 失败时自动撤销已完成操作
- **断点续传**: 支持从失败点继续执行

### 交互设计
- **零配置优先**: 默认智能检测，无需手动参数
- **预览模式**: `--dry-run` 展示将要进行的更改
- **智能提示**: 检测失败时自动提供覆盖选项建议
- **进度反馈**: 清晰的配置进度和结果展示

## 📊 质量保证

### 测试策略
- **单元测试**: 覆盖所有核心功能模块
- **集成测试**: 测试完整的配置流程
- **E2E测试**: 在真实项目中验证
- **兼容性测试**: 多环境和多版本测试

### 质量指标
- **代码覆盖率**: 90%+
- **类型安全**: 100% TypeScript覆盖
- **性能基准**: 配置时间 < 30秒
- **成功率**: 95%+ 的配置成功率

## 🚢 发布计划

### V1.0.0 - Testing 模块 ✅ 已发布
- ✅ 项目技术栈和架构检测
- ✅ AI 测试规则文件生成  
- ✅ Vitest 配置生成
- ✅ 测试依赖自动安装
- ✅ CLI 基础框架完整实现
- ✅ 支持 React/Vue2/Vue3 技术栈
- ✅ 支持单模块/pnpm workspace/yarn workspace

### V1.1.0 - Testing 模块优化 (预计发布：1周内)
- [ ] 测试模板文件生成（test-setup.ts）
- [ ] 更多测试库支持（MSW、Storybook Testing）
- [ ] 配置冲突检测和智能合并
- [ ] 详细的使用文档和示例

### V1.5.0 - 用户体验增强 (预计发布：1个月内)
- [ ] 交互式配置向导
- [ ] 更多项目类型支持（组件库/工具库）
- [ ] 配置模板自定义
- [ ] 多语言支持（英文版本）

### V2.0.0 - 代码质量模块 (预计发布：2个月内)
- [ ] Linting 模块（ESLint + 企业规则）
- [ ] Formatting 模块（Prettier）
- [ ] Git Hooks 模块（Husky + lint-staged）
- [ ] 插件系统架构

## 🤝 贡献指南

### 参与方式
- **报告问题**: 提交Issue描述问题
- **功能建议**: 提出新功能需求
- **代码贡献**: 提交Pull Request
- **文档改进**: 完善文档和示例

### 开发规范
- **代码风格**: ESLint + Prettier
- **提交规范**: Conventional Commits
- **分支管理**: GitFlow工作流
- **测试要求**: 新功能必须包含测试

## 📜 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**⭐ 如果这个项目对你有帮助，请给我们一个Star！**

**🐛 遇到问题？** [提交Issue](https://github.com/your-org/pilot/issues)  
**💬 交流讨论？** [加入我们的讨论](https://github.com/your-org/pilot/discussions)
