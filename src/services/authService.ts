import type { AuthConfig } from '../types/auth';

class AuthService {
  private readonly TOKEN_KEY = 'dycast_auth_token';
  private readonly EXPIRY_KEY = 'dycast_auth_expiry';
  private readonly TOKEN_EXPIRY_HOURS = 24;

  /**
   * 获取环境变量配置
   */
  private getConfig(): AuthConfig {
    return {
      hash: import.meta.env.VITE_ADMIN_HASH || '',
      salt: import.meta.env.VITE_ADMIN_SALT || '',
      loginUrl: import.meta.env.VITE_LOGIN_URL || '/login'
    };
  }

  /**
   * 将字符串转换为 ArrayBuffer
   */
  private async stringToArrayBuffer(str: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * 将 ArrayBuffer 转换为十六进制字符串
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    const hexCodes = Array.from(byteArray, byte => byte.toString(16).padStart(2, '0'));
    return hexCodes.join('');
  }

  /**
   * 使用 PBKDF2 哈希密码
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    const config = this.getConfig();
    const actualSalt = salt || config.salt;

    if (!actualSalt) {
      throw new Error('Salt is required for password hashing');
    }

    // 使用 Web Crypto API
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(actualSalt),
        iterations: 1000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * 验证密码
   */
  private async verifyPassword(password: string): Promise<boolean> {
    const config = this.getConfig();

    if (!config.hash || !config.salt) {
      console.error('认证配置缺失：请检查环境变量 VITE_ADMIN_HASH 和 VITE_ADMIN_SALT');
      return false;
    }

    const hashedPassword = await this.hashPassword(password, config.salt);
    return hashedPassword === config.hash;
  }

  /**
   * 登录
   */
  async login(password: string): Promise<boolean> {
    try {
      const isValid = await this.verifyPassword(password);

      if (isValid) {
        const token = this.generateToken();
        const expiryTime = Date.now() + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.EXPIRY_KEY, expiryTime.toString());

        // 手动触发自定义事件，通知 App.vue 更新状态
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
          detail: { isAuthenticated: true }
        }));

        return true;
      }

      return false;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  }

  /**
   * 登出
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EXPIRY_KEY);

    // 手动触发自定义事件，通知 App.vue 更新状态
    window.dispatchEvent(new CustomEvent('auth-state-changed', {
      detail: { isAuthenticated: false }
    }));
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const expiry = localStorage.getItem(this.EXPIRY_KEY);

      if (!token || !expiry) {
        return false;
      }

      const expiryTime = parseInt(expiry, 10);
      if (Date.now() > expiryTime) {
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('检查认证状态失败:', error);
      return false;
    }
  }

  /**
   * 生成随机 token
   */
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 获取登录 URL
   */
  getLoginUrl(): string {
    return this.getConfig().loginUrl;
  }

  /**
   * 获取当前 token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}

export default new AuthService();
