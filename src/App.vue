<template>
  <div id="app">
    <component :is="currentView" v-if="shouldRender" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import IndexView from './views/IndexView.vue';
import LoginView from './views/LoginView.vue';
import authService from './services/authService';
import { printInfo, printSKMCJ } from './utils/logUtil';

const isAuthenticated = ref(false);

// 当前视图组件
const currentView = computed(() => {
  return isAuthenticated.value ? IndexView : LoginView;
});

// 是否应该渲染组件（未认证时只能访问 login_url）
const shouldRender = computed(() => {
  const loginUrl = authService.getLoginUrl();
  const currentPath = window.location.pathname;

  // 已认证时可以访问任何路径
  if (isAuthenticated.value) {
    return true;
  }

  // 未认证时只能访问 login_url
  return currentPath === loginUrl;
});

// 检查认证状态
const checkAuth = () => {
  isAuthenticated.value = authService.isAuthenticated();
};

// 处理路由变化
const handleRouteChange = () => {
  const loginUrl = authService.getLoginUrl();
  const currentPath = window.location.pathname;

  // 总是检查认证状态
  checkAuth();

  // 如果已认证且当前在登录页面，重定向到首页
  if (isAuthenticated.value && currentPath === loginUrl) {
    window.history.replaceState({}, '', '/');
  }
};

// 处理 storage 事件
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'dycast_auth_token' || e.key === 'dycast_auth_expiry') {
    checkAuth();
  }
};

// 处理自定义认证状态变化事件
const handleAuthStateChange = () => {
  checkAuth();
};

// 组件挂载时初始化
onMounted(() => {
  // 打印启动信息
  setTimeout(() => {
    console?.clear();
    printSKMCJ();
    printInfo();
  }, 1500);

  // 检查初始认证状态
  checkAuth();

  // 监听 popstate 事件（浏览器前进/后退）
  window.addEventListener('popstate', handleRouteChange);

  // 监听 storage 事件（localStorage 变化）
  window.addEventListener('storage', handleStorageChange);

  // 监听自定义认证状态变化事件（处理同页面内的状态更新）
  window.addEventListener('auth-state-changed', handleAuthStateChange);

  // 初始路由处理
  handleRouteChange();
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('popstate', handleRouteChange);
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener('auth-state-changed', handleAuthStateChange);
});
</script>

<style lang="scss">
::selection {
  background-color: #8b968d;
  color: #fff;
}

#app {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}
</style>
