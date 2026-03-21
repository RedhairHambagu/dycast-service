# 多阶段构建 Dockerfile
# 阶段 1: 构建阶段
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:22-alpine AS builder

# 构建参数
ARG VITE_ADMIN_HASH
ARG VITE_ADMIN_SALT
ARG VITE_LOGIN_URL

# 设置为环境变量供 vite build 使用
ENV VITE_ADMIN_HASH=$VITE_ADMIN_HASH
ENV VITE_ADMIN_SALT=$VITE_ADMIN_SALT
ENV VITE_LOGIN_URL=$VITE_LOGIN_URL

# 设置工作目录
WORKDIR /app

# 配置国内镜像加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories && \
    npm config set registry https://mirrors.cloud.tencent.com/npm/ && \
    npm install -g pnpm && \
    pnpm config set registry https://mirrors.cloud.tencent.com/npm/

# 复制 package 文件和依赖文件
COPY package*.json ./

# 安装依赖（不使用锁定文件）
RUN pnpm install

# 复制源代码
COPY . .

# 构建应用（跳过类型检查以加快构建速度）
RUN pnpm run build-only

# 阶段 2: 生产阶段
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/nginx:alpine

# 配置 Alpine 镜像加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tencent.com/g' /etc/apk/repositories

# 加载 njs 模块（用于 URL 解码 Cookie）
RUN sed -i '1i load_module modules/ngx_http_js_module.so;' /etc/nginx/nginx.conf

# 复制自定义 nginx 配置和 njs 脚本
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY cookie.js /etc/nginx/njs/cookie.js

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
