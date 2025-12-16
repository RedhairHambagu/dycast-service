<template>
  <Teleport to="body">
    <transition name="toast-fade">
      <div
        v-if="visible"
        :class="[
          'toast-container',
          `toast-${type}`,
          { 'toast-mobile': isMobile }
        ]"
        @click="handleClose"
      >
        <div class="toast-content">
          <div class="toast-icon">
            <svg v-if="type === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.2"/>
              <path d="M7 10L9 12L13 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else-if="type === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.2"/>
              <path d="M10 7V10M10 13H10.01M7 10L13 16L16 13L10 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.2"/>
              <path d="M10 7V10.5M10 13.5H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="toast-message">{{ message }}</div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 3000
});

const visible = ref(false);
const isMobile = ref(false);

let timer: number | null = null;

const handleClose = () => {
  visible.value = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  setTimeout(() => {
    props.onClose?.();
  }, 300); // 等待动画完成
};

onMounted(() => {
  // 检测移动端
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  visible.value = true;

  // 自动关闭
  if (props.duration > 0) {
    timer = window.setTimeout(() => {
      handleClose();
    }, props.duration);
  }
});

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  will-change: transform, opacity;
}

.toast-container.toast-mobile {
  top: 10px;
  max-width: 90vw;
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  min-width: 200px;
  max-width: 400px;
}

.toast-mobile .toast-content {
  padding: 10px 16px;
  min-width: auto;
}

.toast-success {
  background-color: #52c41a;
  color: white;
}

.toast-error {
  background-color: #ff4d4f;
  color: white;
}

.toast-info {
  background-color: #1890ff;
  color: white;
}

.toast-icon {
  margin-right: 8px;
  flex-shrink: 0;
}

.toast-mobile .toast-icon {
  margin-right: 6px;
}

.toast-icon svg {
  display: block;
}

.toast-message {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.toast-mobile .toast-message {
  font-size: 13px;
}

/* 动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  transform: translateX(-50%) translateY(-20px);
  opacity: 0;
}

.toast-fade-leave-to {
  transform: translateX(-50%) translateY(-20px);
  opacity: 0;
}

/* 硬件加速 */
.toast-container {
  transform: translateZ(0);
}
</style>
