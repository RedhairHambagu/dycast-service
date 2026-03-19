const STORAGE_KEY = 'dycast_douyin_cookie';

export interface CookieState {
  enabled: boolean;
  rawCookie: string;
  updatedAt: number;
  maskedPreview: string;
}

export const cookieService = {
  /**
   * 校验 Cookie 格式是否基本合法
   * - 必须包含 `=`
   * - 分段后包含有效的 `key=value` 结构
   */
  validate(raw: string): boolean {
    if (!raw || typeof raw !== 'string') return false;
    if (!raw.includes('=')) return false;
    
    // 基础校验：以 `;` 分段后每段为 `key=value`
    // 键名只允许可见字符且不包含分隔符
    const pairs = raw.split(';');
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      
      const eqIndex = trimmed.indexOf('=');
      // '='不能是第一位 (即key不能为空)
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        // 简单校验 key 的合法性：不含空格，不可见字符等
        if (/^[^\s!#$()+,/:;<=>?@[\]^{|}~]+$/.test(key)) {
          return true; // 只要有一个合法的 key=value 就认为基本合法
        }
      }
    }
    return false;
  },

  /**
   * 脱敏展示 Cookie
   * 仅展示脱敏片段（前 6 后 4），中间用 *** 替换
   */
  mask(raw: string): string {
    if (!raw) return '';
    const trimmed = raw.trim();
    if (trimmed.length <= 10) return '***';
    return `${trimmed.substring(0, 6)}***${trimmed.substring(trimmed.length - 4)}`;
  },

  /**
   * 保存 Cookie 到本地存储
   */
  setCookie(raw: string): CookieState | null {
    if (!this.validate(raw)) {
      return null;
    }
    
    const state: CookieState = {
      enabled: true,
      rawCookie: raw.trim(), // 保留原值，不做 decode/encode 破坏
      updatedAt: Date.now(),
      maskedPreview: this.mask(raw)
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return state;
    } catch (e) {
      console.error('[cookieService] Failed to save cookie to localStorage', e);
      return null;
    }
  },

  /**
   * 从本地读取 Cookie 状态
   */
  getCookie(): CookieState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as CookieState;
      // 检查状态，如果 enabled 不为 true，不返回（预留启用/禁用切换）
      if (!parsed || !parsed.enabled) return null;

      return parsed;
    } catch (e) {
      return null;
    }
  },

  /**
   * 清空本地 Cookie
   */
  clearCookie(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[cookieService] Failed to clear cookie from localStorage', e);
    }
  }
};
