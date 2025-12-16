// 认证相关类型定义

export interface AuthState {
  isAuthenticated: boolean;
  loginUrl: string;
}

export interface AuthConfig {
  hash: string;
  salt: string;
  loginUrl: string;
}

export interface LoginCredentials {
  password: string;
}
