# Dycast - 抖音直播弹幕助手

基于抖音弹幕姬的二改版本，添加了客户端认证功能，支持安全的登录访问。

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd dycast-service
   ```

2. **生成密码哈希**
   ```bash
   # 安装依赖（首次运行）
   npm install

   # 生成安全的密码哈希（将 your_password 替换为您的密码）
   node scripts/generate-hash.js your_password
   ```

3. **配置环境变量**
   ```bash
   # 复制示例文件
   cp .env.example .env

   # 编辑 .env 文件，填入上一步生成的 SALT 和 HASH 值
   vim .env
   ```

4. **启动服务**
   ```bash
   docker compose up -d
   ```

5. **访问应用**
   - 浏览器打开：http://localhost:18080
   - 输入您设置的密码进行登录

### 方式二：开发环境

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件并填入密码哈希
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 🔐 认证系统

### 安全特性
- **PBKDF2 密码哈希**：使用 1000 次迭代的 PBKDF2 算法
- **随机盐值**：每次生成 16 字节随机盐值
- **客户端认证**：无需后端，基于 localStorage 的会话管理
- **Token 过期**：24 小时自动过期机制
- **移动端优化**：响应式设计，完美适配手机/平板/桌面

### 环境变量配置

| 变量名 | 描述 | 示例 | 是否必需 |
|--------|------|------|----------|
| `VITE_ADMIN_SALT` | 密码盐值（16 字节） | `a1b2c3d4e5f6...` | ✅ 是 |
| `VITE_ADMIN_HASH` | 密码哈希值 | `5d8a9b0c1e2f...` | ✅ 是 |
| `VITE_LOGIN_URL` | 登录页面路径 | `/login`、`/admin` | ❌ 否（默认 `/login`） |

### 生成密码哈希

```bash
# 简单密码
node scripts/generate-hash.js mypassword123

# 复杂密码
node scripts/generate-hash.js "MyP@ssw0rd!2024"

# 输出示例
# ✅ 生成成功！
# ============================================================
# 配置信息：
# ============================================================
# VITE_ADMIN_SALT=1a2b3c4d5e6f7890abcdef1234567890
# VITE_ADMIN_HASH=9f8e7d6c5b4a39281f0e9d8c7b6a59483f2e1d0c9b8a79685f4e3d2c1b0a9f8e
# ============================================================
```

### Docker Compose 配置

```yaml
services:
  dycast:
    environment:
      - VITE_ADMIN_SALT=${VITE_ADMIN_SALT}
      - VITE_ADMIN_HASH=${VITE_ADMIN_HASH}
      - VITE_LOGIN_URL=${VITE_LOGIN_URL:-/login}
```

## 📱 移动端支持

- ✅ 响应式布局，自适应各种屏幕尺寸
- ✅ 触摸友好的 UI 元素
- ✅ 防止 iOS Safari 自动缩放
- ✅ 密码显示/隐藏切换
- ✅ 自动聚焦和回车提交

## 🛠️ 项目结构

```
dycast-service/
├── src/
│   ├── services/
│   │   └── authService.ts      # 认证服务
│   ├── views/
│   │   ├── IndexView.vue       # 主页面
│   │   └── LoginView.vue       # 登录页面
│   ├── types/
│   │   └── auth.ts             # 认证类型定义
│   └── App.vue                 # 应用入口（包含路由逻辑）
├── scripts/
│   └── generate-hash.js        # 密码哈希生成工具
├── .env.example                # 环境变量示例
├── docker-compose.yml          # Docker 配置
└── nginx.conf                  # Nginx 配置（支持 SPA 路由）
```

## 🔧 高级配置

### 自定义登录 URL

```bash
# 在 .env 文件中设置
VITE_LOGIN_URL=/secure

# 或在 docker-compose.yml 中
environment:
  - VITE_LOGIN_URL=/admin
```

访问：http://localhost:18080/admin 即可进入登录页面

### 多环境部署

**开发环境**：
```bash
cp .env.example .env
# 编辑 .env 填入开发用密码
npm run dev
```

**生产环境**：
```bash
# 使用不同的 .env 文件
cp .env.example .env.production
# 编辑 .env.production 填入生产用密码
docker compose --env-file .env.production up -d
```

## 🐛 故障排除

### 1. 密码验证失败
- ✅ 检查 `.env` 文件中的 `VITE_ADMIN_HASH` 和 `VITE_ADMIN_SALT` 是否正确
- ✅ 确保使用 `scripts/generate-hash.js` 生成的值
- ✅ 确认没有多余的空格或换行符

### 2. 页面刷新后重新登录
- ✅ 检查浏览器 localStorage 是否被清理
- ✅ 确认 token 未过期（24 小时）
- ✅ 尝试在隐私模式下测试

### 3. 移动端显示异常
- ✅ 检查 viewport 设置
- ✅ 确认 CSS 媒体查询生效
- ✅ 尝试清除浏览器缓存

### 4. Docker 部署后无法访问
```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs dycast

# 重新构建
docker compose up -d --build
```

## 📝 更新日志

### v1.0.0
- ✨ 新增客户端认证系统
- ✨ 添加移动端优化的登录页面
- ✨ 实现 PBKDF2 密码哈希 + 盐值验证
- ✨ 支持可配置的登录 URL
- ✨ 添加 token 自动过期机制