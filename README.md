# AI术语解释器 (AI Terms Explainer)

一个用通俗易懂的方式解释AI术语的Chrome扩展程序。

## ✨ 特性

- 🤖 **智能解释**: 使用OpenAI GPT模型提供通俗易懂的AI术语解释
- 🌍 **国际化支持**: 支持中文和英文界面
- ♿ **无障碍设计**: 完整的可访问性支持，包括屏幕阅读器和键盘导航
- 🎨 **现代UI**: 基于Material Design 3的美观界面
- 🌙 **深色模式**: 自动适应系统主题
- 🔒 **安全可靠**: 遵循Manifest V3规范，确保安全性
- ⚡ **高性能**: TypeScript开发，优化的性能表现
- 📱 **响应式设计**: 适配不同屏幕尺寸

## 🚀 快速开始

### 前置要求

- Node.js 16+ 
- npm 或 yarn
- Chrome浏览器 88+

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/guyuefeng/ai-terms-explainer.git
cd ai-terms-explainer

# 安装依赖
npm install
```

### 开发构建

```bash
# 开发模式（文件监听）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 在Chrome中安装

1. 运行 `npm run build` 构建扩展
2. 打开Chrome浏览器，进入 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 文件夹

## 📁 项目结构

```
├── src/                    # 源代码目录
│   ├── background/         # Background脚本
│   │   └── background.ts   # Service Worker
│   ├── content/           # Content脚本
│   │   └── content.ts     # 页面内容脚本
│   ├── popup/             # 弹出窗口
│   │   ├── popup.html     # HTML页面
│   │   ├── popup.css      # 样式文件
│   │   └── popup.ts       # 主逻辑
│   ├── types/             # TypeScript类型定义
│   │   ├── api.ts         # API相关类型
│   │   └── app.ts         # 应用程序类型
│   ├── utils/             # 实用程序
│   │   ├── api.ts         # API工具类
│   │   ├── storage.ts     # 存储工具类
│   │   └── i18n.ts        # 国际化工具类
│   └── manifest.json      # 扩展清单文件
├── _locales/              # 国际化文件
│   ├── zh_CN/            # 中文
│   │   └── messages.json
│   └── en/               # 英文
│       └── messages.json
├── images/               # 图标文件
├── dist/                # 构建输出目录
├── webpack.config.js    # Webpack配置
├── tsconfig.json       # TypeScript配置
├── package.json        # 项目配置
└── README.md          # 项目文档
```

## 🎯 使用方法

### 基本使用

1. **安装扩展后，点击扩展图标**
2. **输入OpenAI API Key**（首次使用）
3. **输入想要解释的AI术语**
4. **点击"解释"按钮**获取通俗易懂的解释

### 高级功能

#### 右键菜单解释
- 选中网页中的AI术语
- 右键选择"解释选中的AI术语"

#### 键盘快捷键
- `Enter`: 提交解释请求
- `Ctrl+Enter`: 快速提交
- `Escape`: 清除结果
- `Ctrl+Shift+E`: 解释选中文本（在网页中）

#### Content Script功能
- 自动识别网页中的AI术语
- 鼠标悬停显示解释提示
- 智能文本选择建议

## ⚙️ 配置

### API设置

扩展支持以下API配置：

```typescript
interface AppConfig {
  apiKey: string;           // OpenAI API密钥
  defaultModel: string;     // 默认模型 (gpt-3.5-turbo)
  maxTokens: number;        // 最大令牌数
  temperature: number;      // 创造性参数 (0-2)
}
```

### 存储

所有设置都安全存储在Chrome的同步存储中：

- API Key加密存储
- 配置自动同步到其他设备
- 历史记录本地保存（可选）

## 🛠️ 开发指南

### 代码风格

项目遵循以下编码规范：

- **TypeScript**: 严格类型检查
- **函数式编程**: 避免使用类，优先使用函数
- **模块化设计**: 清晰的文件组织结构
- **JSDoc注释**: 完整的代码文档

### 架构原则

- **Manifest V3**: 遵循最新Chrome扩展规范
- **安全第一**: 内容安全策略(CSP)和权限最小化
- **性能优化**: 异步操作和资源优化
- **可访问性**: WCAG 2.1兼容

### 添加新功能

1. **创建类型定义** (在 `src/types/`)
2. **实现核心逻辑** (在相应的模块中)
3. **添加国际化支持** (在 `_locales/`)
4. **编写测试用例**
5. **更新文档**

### 构建系统

使用Webpack进行现代化构建：

- TypeScript编译
- 代码分割和优化
- 资源复制和处理
- 开发热重载

## 🌍 国际化

### 支持的语言

- 🇨🇳 中文 (zh_CN)
- 🇺🇸 英文 (en)

### 添加新语言

1. 在 `_locales/` 目录创建语言文件夹
2. 复制 `messages.json` 模板
3. 翻译所有消息字符串
4. 更新 `manifest.json` 中的默认语言

### 使用国际化

```typescript
import { I18nUtils } from './utils/i18n';

// 获取本地化消息
const message = I18nUtils.getMessage('apiKeyPlaceholder');

// 带参数的消息
const error = I18nUtils.getMessage('apiError', ['无效的API Key']);
```

## 🔒 安全性

### 数据保护

- API Key使用Chrome存储API安全保存
- 不在日志中记录敏感信息
- 遵循最小权限原则

### 内容安全策略

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.chatanywhere.tech;"
  }
}
```

### 权限声明

- `storage`: 保存用户设置
- `activeTab`: 获取当前页面信息
- `host_permissions`: 限制API访问域名

## 📊 性能优化

### 前端优化

- 虚拟滚动（如适用）
- 图片懒加载
- 代码分割
- 缓存策略

### 后端优化

- API请求去重
- 响应缓存
- 错误重试机制
- 超时处理

## 🧪 测试

### 单元测试

```bash
npm run test
```

### 集成测试

```bash
npm run test:integration
```

### 端到端测试

```bash
npm run test:e2e
```

## 📦 发布

### Chrome Web Store

1. 运行 `npm run build`
2. 打包 `dist` 文件夹
3. 上传到Chrome开发者控制台
4. 填写商店信息和屏幕截图
5. 提交审核

### 版本管理

使用语义化版本控制：

- `major.minor.patch`
- 自动生成变更日志
- Git标签管理

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发流程

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

### 提交规范

使用Conventional Commits格式：

```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建或辅助工具更改
```

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [OpenAI](https://openai.com/) - 提供强大的API服务
- [Material Design](https://material.io/) - 设计系统指导
- [Chrome Extensions](https://developer.chrome.com/extensions/) - 开发文档

## 📞 支持

- 📧 邮箱: guyuefengxue@gmail.com
- 🐛 Bug报告: [GitHub Issues](https://github.com/guyuefeng/ai-terms-explainer/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/guyuefengxue/ai-terms-explainer/discussions)

---

**Made with ❤️ by [guyuefeng]** 
