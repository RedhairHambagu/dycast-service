import { ref, h } from 'vue';
import Toast from '@/components/Toast/index.vue';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastInstance {
  id: string;
  options: ToastOptions;
  close: () => void;
}

const toastQueue = ref<ToastInstance[]>([]);
let toastCounter = 0;

/**
 * 显示 Toast 提示
 */
const showToast = (options: ToastOptions): void => {
  const id = `toast-${++toastCounter}`;
  const container = document.createElement('div');
  document.body.appendChild(container);

  const close = () => {
    const index = toastQueue.value.findIndex(toast => toast.id === id);
    if (index > -1) {
      toastQueue.value.splice(index, 1);
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  const instance: ToastInstance = {
    id,
    options,
    close
  };

  toastQueue.value.push(instance);

  // 渲染 Toast 组件
  const vnode = h(Toast, {
    message: options.message,
    type: options.type,
    duration: options.duration ?? 3000,
    onClose: close
  });

  vnode.appContext = {
    ...vnode.appContext,
    provides: {
      ...vnode.appContext?.provides
    }
  };

  // @ts-ignore - Vue 类型
  vnode.mount(container);
};

/**
 * 显示成功提示
 */
export const showSuccess = (message: string, duration?: number): void => {
  showToast({ message, type: 'success', duration });
};

/**
 * 显示错误提示
 */
export const showError = (message: string, duration?: number): void => {
  showToast({ message, type: 'error', duration });
};

/**
 * 显示信息提示
 */
export const showInfo = (message: string, duration?: number): void => {
  showToast({ message, type: 'info', duration });
};

/**
 * 清除所有 Toast
 */
export const clearAllToasts = (): void => {
  toastQueue.value.forEach(toast => toast.close());
  toastQueue.value = [];
};

/**
 * 触觉反馈
 */
export const vibrateFeedback = (type: 'success' | 'error'): void => {
  // 检查是否支持震动
  if ('vibrate' in navigator) {
    if (type === 'success') {
      // 成功：短震动
      navigator.vibrate(50);
    } else if (type === 'error') {
      // 失败：长震动
      navigator.vibrate([100, 30, 100]);
    }
  }
};

/**
 * 复制到剪贴板（带回退）
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // 回退到传统方法
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
};

/**
 * 复制文本并显示提示
 */
export const copyTextWithFeedback = async (
  text: string,
  successMessage: string = '已复制到剪贴板',
  errorMessage: string = '复制失败，请重试'
): Promise<void> => {
  const success = await copyToClipboard(text);

  if (success) {
    showSuccess(successMessage);
    vibrateFeedback('success');
  } else {
    showError(errorMessage);
    vibrateFeedback('error');
  }
};

export default {
  showSuccess,
  showError,
  showInfo,
  clearAllToasts,
  vibrateFeedback,
  copyToClipboard,
  copyTextWithFeedback
};
