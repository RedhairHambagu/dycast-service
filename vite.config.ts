import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import obfuscator from 'vite-plugin-obfuscator';
// import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue(),
      // 代码混淆插件（只在生产环境启用）
      ...(mode === 'production' ? [
        obfuscator({
          // 混淆选项
          compact: true, // 压缩代码
          controlFlowFlattening: true, // 控制流扁平化
          deadCodeInjection: true, // 死代码注入
          deadCodeInjectionThreshold: 0.4, // 死代码比例
          debugProtection: true, // 调试保护
          debugProtectionInterval: 4000, // 调试保护间隔
          disableConsoleOutput: true, // 禁用 console 输出
          identifierNamesGenerator: 'hexadecimal', // 标识符生成器
          logLevel: 3, // 日志级别
          numbersToExpressions: true, // 数字转表达式
          renameGlobals: true, // 重命名全局变量
          selfDefending: true, // 自我防护
          simplify: true, // 简化代码
          sourceMap: false, // 不生成 source map（生产环境）
          splitStrings: true, // 分割字符串
          splitStringsChunkLength: 10, // 字符串分割长度
          stringArray: true, // 字符串数组
          stringArrayEncoding: ['base64'], // 字符串数组编码
          stringArrayThreshold: 0.75, // 字符串数组比例
          transformObjectKeys: true, // 转换对象键
          unicodeEscapeSequence: true // Unicode 转义序列
        })
      ] : []),
      // vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
    host: '0.0.0.0', // 允许局域网访问
    proxy: {
      '/dylive': {
        target: 'https://live.douyin.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/dylive/, ''),
        // 重要：允许接收 Set-Cookie
        configure: proxy => {
          // 拦截请求
          proxy.on('proxyReq', (proxyReq, req) => {
            const ua = req.headers['user-agent'] || '';
            const isMobile = /mobile|android|iphone|ipad/i.test(ua);
            if (isMobile) {
              // 设置请求头 User-Agent 标识
              // 防止移动端 302 重定向跳转
              // 可根据自己的平台设置
              proxyReq.setHeader(
                'User-Agent',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
              );
            }
            // 强制修改 Referer(这里可能无效，但并不影响)
            proxyReq.setHeader('Referer', 'https://live.douyin.com/');
          });
          // 拦截响应
          proxy.on('proxyRes', proxyRes => {
            // 确保 set-cookie 能正常设置到当前域下
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              // 移除 Domain 或替换为当前域
              const newCookie = setCookie.map(cookie => {
                return cookie
                  .replace(/; Domain=[^;]+/i, '')
                  .replace(/; SameSite=None/, '')
                  .replace(/; Secure=true/i, '');
              });
              proxyRes.headers['set-cookie'] = newCookie;
            }
          });
        }
      },
      '/socket': {
        target: 'wss://webcast5-ws-web-lf.douyin.com',
        changeOrigin: true, // 保持原始 Host，利于服务端识别 Cookie
        secure: true,
        ws: true, // 启用 WebSocket 代理
        rewrite: path => path.replace(/^\/socket/, ''),
        configure: proxy => {
          proxy.on('proxyReqWs', (proxyReq, req) => {
            const ua = req.headers['user-agent'] || '';
            const isMobile = /mobile|android|iphone|ipad/i.test(ua);
            // 这里可以不设置也
            if (isMobile) {
              // 设置请求头 User-Agent 标识
              proxyReq.setHeader(
                'User-Agent',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
              );
            }
          });
        }
      }
    }
  }
}})

