# Pilot - 前端项目增强工具

> 🚀 可扩展的前端项目开发体验增强平台

Pilot 是一个参考 Astro `astro add` 设计理念的命令行工具，为前端项目提供模块化的开发体验增强。通过智能检测项目技术栈和架构，自动安装相应依赖，生成最佳实践配置，让开发者快速获得高质量的开发环境。

## ✨ 核心特性

- **🔍 智能检测**：自动识别 React/Vue2/Vue3 技术栈和项目架构
- **🔧 模块化设计**：插件化架构，按需添加功能模块
- **⚡ 一键配置**：零配置体验，自动安装依赖和生成配置文件
- **🤖 AI 增强**：集成企业级 AI 开发规则和最佳实践
- **📦 渐进增强**：支持单项配置和完整配置，适应不同使用场景
- **🛡️ 安全可靠**：完整的错误处理和回滚机制

## 🏗️ 技术栈

- **核心**: TypeScript + Commander.js
- **测试**: Vitest + @testing-library
- **构建**: tsup (ESM + CJS)
- **用户体验**: Chalk + Ora + Boxen
- **文件操作**: fs-extra + glob + find-up
- **进程管理**: execa

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

## 📋 支持的项目类型

### 技术栈支持

- **React**: Create React App, Vite, Next.js
- **Vue3**: Vite, Vue CLI, Nuxt3
- **Vue2**: Vue CLI, 自定义 Webpack 配置

### 项目架构支持

- **单模块项目**: 标准的单个 package.json 项目结构
- **pnpm workspace**: 通过 `pnpm-workspace.yaml` 检测和配置
- **Yarn workspace**: 通过 `package.json` 的 workspaces 字段检测和配置

## 🛠️ 开发指南

### 项目结构

```
src/
├── cli/                  # CLI 入口和命令解析
├── core/                 # 核心功能模块
│   ├── detection/        # 项目检测逻辑
│   └── module-manager.ts # 模块管理器
├── modules/              # 功能模块
│   └── testing/          # 测试模块
│       ├── installer.ts  # 模块安装器
│       ├── config-generator.ts  # 配置生成器
│       └── templates/    # 配置模板
├── types/                # TypeScript 类型定义
└── utils.ts             # 工具函数
```

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-org/pilot
cd pilot

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test
```

## 🎯 当前功能

### V1.0 MVP - Testing 模块

- ✅ 项目技术栈自动检测（React/Vue2/Vue3）
- ✅ 项目架构检测（单模块/pnpm workspace/yarn workspace）
- ✅ AI 测试规则文件生成（.cursorrules）
- ✅ Vitest 基础配置生成
- ✅ 测试依赖自动安装
- ✅ 配置文件验证和测试

### 🚧 规划中功能

- **Linting 模块**: ESLint + 企业规则
- **Formatting 模块**: Prettier + 统一配置
- **Git Hooks 模块**: Husky + lint-staged

## 🧪 示例用法

添加测试配置到 React 项目：

```bash
cd my-react-app
pilot add testing
```

输出示例：

```
🚀 Pilot
前端项目开发体验增强平台

版本: 0.1.0

✅ 检测完成: react + single
📦 开始配置测试环境...
✅ 生成 AI 测试规则文件
✅ 生成 Vitest 配置文件
✅ 安装测试依赖

🎉 测试环境配置完成!

📝 后续步骤:
  1. 运行 npm test 执行测试
  2. 查看 .cursorrules 了解 AI 测试规则
  3. 在 src 目录创建 *.test.ts 文件开始编写测试
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

## 📜 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

**🐛 遇到问题？** [提交 Issue](https://github.com/your-org/pilot/issues)  
**💬 交流讨论？** [加入我们的讨论](https://github.com/your-org/pilot/discussions)
