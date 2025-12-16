<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1 class="login-title">Dycast</h1>
        <p class="login-subtitle">请输入管理员密码</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="password" class="input-label">密码</label>
          <div class="password-input-wrapper">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="password-input"
              placeholder="请输入密码"
              :disabled="isLoading"
              @keyup.enter="handleLogin"
              autocomplete="current-password"
              ref="passwordInput"
            />
            <button
              type="button"
              class="toggle-password"
              @click="togglePasswordVisibility"
              :disabled="isLoading"
            >
              <span v-if="showPassword">🙈</span>
              <span v-else>👁️</span>
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          class="login-button"
          :disabled="isLoading || !password"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else>登录</span>
        </button>
      </form>

      <div class="login-footer">
        <p class="version-info">v1.0.0</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import authService from '../services/authService';

const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const passwordInput = ref<HTMLInputElement | null>(null);

// 切换密码显示/隐藏
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

// 处理登录
const handleLogin = async () => {
  if (!password.value) {
    errorMessage.value = '请输入密码';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const success = await authService.login(password.value);

    if (success) {
      // 登录成功，App.vue 会自动检测到状态变化并跳转到 IndexView
      password.value = '';
    } else {
      errorMessage.value = '密码错误，请重试';
      // 清空密码输入框
      password.value = '';
      // 重新聚焦到密码输入框
      passwordInput.value?.focus();
    }
  } catch (error) {
    errorMessage.value = '登录失败，请稍后重试';
    console.error('Login error:', error);
  } finally {
    isLoading.value = false;
  }
};

// 组件挂载时自动聚焦密码输入框
onMounted(() => {
  passwordInput.value?.focus();
});

// 组件卸载时清空错误信息
onUnmounted(() => {
  errorMessage.value = '';
});
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 20px;
  box-sizing: border-box;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 40px;
  box-sizing: border-box;

  @media (max-width: 480px) {
    max-width: 100%;
    padding: 30px 20px;
    border-radius: 12px;
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;

  @media (max-width: 480px) {
    font-size: 28px;
  }
}

.login-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  padding-right: 48px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px; // 防止 iOS 自动缩放
  color: #333;
  background: white;
  box-sizing: border-box;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #2a5298;
  }

  &::placeholder {
    color: #999;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    height: 44px;
    font-size: 16px;
  }
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: color 0.3s ease;

  &:hover {
    color: #333;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.error-message {
  padding: 12px 16px;
  background: #ffe6e6;
  color: #d32f2f;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

.login-button {
  height: 48px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(30, 60, 114, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 480px) {
    height: 44px;
    font-size: 15px;
  }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.login-footer {
  margin-top: 32px;
  text-align: center;
}

.version-info {
  font-size: 12px;
  color: #999;
  margin: 0;
}

// 防止选中文本
.login-container {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

// 允许表单元素选中文本
.login-form,
.password-input,
.toggle-password {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
</style>
