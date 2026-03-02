<template>
  <div
    :class="{
      'cast-item': true,
      'gift-cast': method === CastMethod.GIFT,
      'high-value-gift-cast': isHighValueGift,
      'chat-cast': method === CastMethod.CHAT,
      'screen-chat-cast': method === CastMethod.SCREEN_CHAT,
      'privilege-screen-chat-cast': method === CastMethod.PRIVILEGE_SCREEN_CHAT,
      'like-cast': method === CastMethod.LIKE,
      'social-cast': method === CastMethod.SOCIAL,
      'member-cast': method === CastMethod.MEMBER,
      'emoji-cast': method === CastMethod.EMOJI_CHAT,
      'custom-cast': method === CastMethod.CUSTOM,
      'room-message-cast': method === CastMethod.ROOM_MESSAGE,
      'exhibition-chat-cast': method === CastMethod.EXHIBITION_CHAT,
      'lucky-box-cast': method === CastMethod.LUCKY_BOX,
      'copyable': isCopyable,
      'touching': isTouching
    }"
    :title="isCopyable ? '点击复制，长按也可复制' : ''"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @mousedown="handleTouchStart"
    @mouseup="handleTouchEnd"
    @mouseleave="handleTouchEnd"
    @click="handleClick"
    @contextmenu.prevent
  >
    <!-- 水波纹效果 -->
    <div v-if="isTouching && isCopyable" class="ripple-effect" :style="rippleStyle"></div>

    <span class="prefix">$</span>
    <p class="content">
      <label class="nickname">[{{ user?.name ? user.name : 'unknown' }}]：</label>
      <template v-for="item in doms">
        <span v-if="item.node === 'text'" class="text">{{ item.text }}</span>
        <span v-if="item.node === 'user'" class="touser">{{ item.text }}</span>
        <img v-if="item.node === 'icon'" class="icon" :title="item.text" :src="item.url" :alt="item.text" />
        <img v-if="item.node === 'emoji'" class="emoji" alt="会员表情" :src="item.url" />
      </template>
    </p>

    <!-- 移动端复制提示 -->
    <div v-if="isMobile && isCopyable" class="copy-hint">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 2H14V12H6V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 4H6V14H4V4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CastMethod, CastRtfContentType, type CastGift, type CastRtfContent, type CastUser } from '@/core/dycast';
import { emojis } from '@/core/emoji';
import { copyTextWithFeedback } from '@/hooks/useToast';
import { computed, ref } from 'vue';

interface CastContentDOM {
  node: 'text' | 'icon' | 'emoji' | 'user';
  url?: string;
  text?: string;
}

interface CastItemProps {
  method?: CastMethod;
  user?: CastUser;
  gift?: CastGift;
  content?: string;
  rtfContent?: CastRtfContent[];
  giftThreshold?: number;
}

const props = withDefaults(defineProps<CastItemProps>(), {
  giftThreshold: 1000
});

// 触摸状态
const isTouching = ref(false);
const isMobile = ref(false);
const touchStartTime = ref(0);
const rippleStyle = ref({
  left: '0px',
  top: '0px'
});

// 检测移动端
if (typeof window !== 'undefined') {
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 判断是否为高价值礼物
const isHighValueGift = computed(() => {
  return props.method === CastMethod.GIFT && props.gift && props.gift.price > props.giftThreshold;
});

// 判断是否可复制
const isCopyable = computed(() => {
  return isHighValueGift.value || props.method === CastMethod.ROOM_MESSAGE;
});

// 获取纯文本内容
const getTextContent = (): string => {
  const userName = props.user?.name || 'unknown';
  let content = '';
  
  if (isHighValueGift.value && props.gift) {
    content = `谢谢${userName}送出的${props.gift.name}`;
  } else if (props.method === CastMethod.ROOM_MESSAGE) {
    const rawContent = props.content || '';
    content = rawContent.replace(/^恭喜/, '谢谢');
    if (!rawContent.startsWith('恭喜')) {
      content = `谢谢${rawContent}`;
    }
  }
  
  return content;
};

// 触摸开始
const handleTouchStart = (event: TouchEvent | MouseEvent) => {
  if (!isCopyable.value) return;

  isTouching.value = true;
  touchStartTime.value = Date.now();

  // 计算水波纹位置
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  let clientX: number;
  let clientY: number;

  if (event instanceof TouchEvent) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = (event as MouseEvent).clientX;
    clientY = (event as MouseEvent).clientY;
  }

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  rippleStyle.value = {
    left: `${x}px`,
    top: `${y}px`
  };
};

// 触摸结束
const handleTouchEnd = () => {
  isTouching.value = false;
};

// 点击处理
const handleClick = async () => {
  if (!isCopyable.value) return;

  const touchDuration = Date.now() - touchStartTime.value;

  // 如果是长按（超过500ms），不触发点击
  if (touchDuration > 500) {
    return;
  }

  await handleCopy();
};

// 复制到剪贴板
const handleCopy = async () => {
  if (!isCopyable.value) return;

  const text = getTextContent();
  await copyTextWithFeedback(
    text,
    '复制成功',
    '复制失败，请重试'
  );
};

/**
 * 创建普通内容
 * @param content
 * @returns
 */
const createTextContent = function (content?: string): CastContentDOM[] {
  if (!content) return [];
  const list: CastContentDOM[] = [];
  const cns = content.split(/(\[.*?])/);
  for (let i = 0; i < cns.length; i++) {
    const item = cns[i];
    if (!item) continue;
    if (emojis[item]) {
      list.push({ node: 'icon', text: item, url: emojis[item] });
    } else {
      list.push({
        node: 'text',
        text: item
      });
    }
  }
  return list;
};

/**
 * 创建富文本内容
 * @param content
 * @returns
 */
const createRtfContent = function (content?: CastRtfContent[]): CastContentDOM[] {
  if (!content) return [];
  const list: CastContentDOM[] = [];
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    switch (content[i].type) {
      case CastRtfContentType.TEXT:
        list.push(...createTextContent(item.text));
        break;
      case CastRtfContentType.USER:
        list.push({
          node: 'user',
          text: item.text
        });
        break;
      case CastRtfContentType.EMOJI:
        list.push({
          node: 'icon',
          text: item.text,
          url: item.url
        });
        break;
    }
  }
  return list;
};

const doms = computed(() => {
  let list: CastContentDOM[] = [];
  switch (props.method) {
    case CastMethod.CHAT:
    case CastMethod.SCREEN_CHAT:
    case CastMethod.PRIVILEGE_SCREEN_CHAT:
      if (props.rtfContent) list = createRtfContent(props.rtfContent);
      else list = createTextContent(props.content);
      break;
    case CastMethod.GIFT:
      if (props.gift) {
        if (props.gift.price > props.giftThreshold){
        list = [
        {
        node: 'text',
            text: `【${props.gift.price}-礼物消息】   谢谢${props.user?.name}送出的${props.gift.name}`
      }
      ]
        }
        else{
        list = [
          {
            node: 'text',
            text: '送出了'
          },
          {
            node: 'icon',
            text: props.gift.name,
            url: props.gift.icon
          },
          {
            node: 'text',
            text: `× ${props.gift.count}`
          },
          {
            node: 'text',
            text: ` - 【${props.gift.price}】`
          }
        ];
      }} else {
        list = [
          {
            node: 'text',
            text: '送出了礼物'
          }
        ];
      }
      break;
    case CastMethod.EMOJI_CHAT:
      list = [
        {
          node: 'emoji',
          text: '会员表情',
          url: props.content
        }
      ];
      break;
    default:
      list = [
        {
          node: 'text',
          text: props.content
        }
      ];
  }
  return list;
});
</script>

<style lang="scss" scoped>
$prefixColor: #38b48b;
$nameColor: #9079ad;
$textColor: #6b798e;
$toUserColor: #e95464;

$prefixDarkColor: #38b48b;
$nameDarkColor: #83ccd2;
$textDarkColor: #f7fcfe;

$toUserDarkColor: #e83929;

$giftText: #eba825;

.cast-item {
  width: 100%;
  display: flex;
  padding-bottom: 3px;
  font-family: 'dymht';
  font-size: 1rem;
  position: relative;
  overflow: hidden;
  // 移动端优化
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  .prefix {
    font-family: 'mkwxy';
    color: $prefixColor;
    flex-shrink: 0;
    font-size: 1rem;
    line-height: 1.5rem;
    margin-right: 5px;
  }
  .nickname {
    margin-right: 3px;
    font-family: 'mkwxy';
    color: $nameColor;
    flex-shrink: 0;
  }
  .text,
  .touser {
    color: $textColor;
    // line-height: 1rem;
    word-break: break-all;
    white-space: normal;
  }
  .touser {
    color: $toUserColor;
  }
  .icon {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: cover;
    padding: 0 3px;
    vertical-align: text-bottom;
  }
  .emoji {
    height: 2rem;
    object-fit: cover;
    padding: 0 3px;
    vertical-align: text-bottom;
  }
  .content {
    width: 0;
    margin: 0;
    flex-grow: 1;
    line-height: 1.5rem;
  }

  // 水波纹效果
  .ripple-effect {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
    width: 100px;
    height: 100px;
    margin-left: -50px;
    margin-top: -50px;
  }

  // 复制提示图标
  .copy-hint {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.6;
    color: currentColor;
  }

  // 触摸反馈
  &.touching {
    background-color: rgba(255, 255, 255, 0.05);
  }
  &.gift-cast {
    .text {
      color: $giftText;
    }
  }
  &.copyable {
    cursor: pointer;
    transition: transform 0.1s ease;
    &:hover {
      transform: translateX(2px);
    }
    &:active {
      transform: scale(0.98);
    }
  }
  &.high-value-gift-cast {
    background: linear-gradient(135deg, rgba(255, 87, 51, 0.15) 0%, rgba(255, 140, 0, 0.15) 100%);
    border-left: 3px solid #ff5733;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 2px 0;
    .text {
      font-weight: 600;
      color: #ff4500;
    }
    .nickname {
      color: #ff5733;
      font-weight: 700;
    }
    .prefix {
      color: #ff5733;
    }
  }
  &.room-message-cast {
    background: linear-gradient(135deg, rgba(42, 203, 66, 0.15) 0%, rgba(27, 172, 44, 0.15) 100%);
    border-left: 3px solid #2acb42;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 2px 0;
    .text {
      font-weight: 500;
      color: #1bac2c;
    }
    .nickname {
      color: #2acb42;
      font-weight: 600;
    }
    .prefix {
      color: #2acb42;
    }
  }
  &.exhibition-chat-cast {
    background: linear-gradient(135deg, rgba(42, 203, 66, 0.15) 0%, rgba(27, 172, 44, 0.15) 100%);
    border-left: 3px solid #2acb42;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 2px 0;
    .text {
      font-weight: 500;
      color: #1bac2c;
    }
    .nickname {
      color: #2acb42;
      font-weight: 600;
    }
    .prefix {
      color: #2acb42;
    }
  }
  &.lucky-box-cast {
    background: linear-gradient(135deg, rgba(42, 203, 66, 0.15) 0%, rgba(27, 172, 44, 0.15) 100%);
    border-left: 3px solid #2acb42;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 2px 0;
    .text {
      font-weight: 500;
      color: #1bac2c;
    }
    .nickname {
      color: #2acb42;
      font-weight: 600;
    }
    .prefix {
      color: #2acb42;
    }
  }
  &.screen-chat-cast {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    border-left: 3px solid #667eea;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 2px 0;
    .text {
      font-weight: 500;
      color: #667eea;
    }
    .nickname {
      color: #764ba2;
      font-weight: 600;
    }
  }
  &.privilege-screen-chat-cast {
    background: linear-gradient(135deg, rgba(255, 193, 47, 0.15) 0%, rgba(235, 168, 37, 0.15) 100%);
    border-left: 3px solid #ffc12f;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 2px 0;
    .text {
      font-weight: 600;
      color: #d4a017;
    }
    .nickname {
      color: #b8860b;
      font-weight: 700;
    }
    .prefix {
      color: #ffc12f;
    }
  }
  &.emoji-cast {
    .prefix {
      line-height: 2.4rem;
    }
    .content {
      line-height: 2.4rem;
    }
    .emoji {
      vertical-align: middle;
    }
  }
}

// 水波纹动画
@keyframes ripple {
  to {
    transform: scale(2.5);
    opacity: 0;
  }
}

// 移动端响应式优化
@media (max-width: 768px) {
  .cast-item {
    font-size: 0.95rem;
    padding: 6px 8px;
    min-height: 44px; // 最小触摸区域

    .content {
      line-height: 1.8rem;
    }

    .copy-hint {
      opacity: 0.5;
      right: 6px;
    }

    &.copyable {
      cursor: default; // 移动端不显示手型光标
    }
  }
}

// 硬件加速
.cast-item {
  will-change: transform;
  transform: translateZ(0);
}

.theme-dark {
  .cast-item {
    .prefix {
      color: $prefixDarkColor;
    }
    .nickname {
      color: $nameDarkColor;
    }
    .text {
      color: $textDarkColor;
    }
    .touser {
      color: $toUserDarkColor;
    }
    &.high-value-gift-cast {
      background: linear-gradient(135deg, rgba(255, 87, 51, 0.25) 0%, rgba(255, 140, 0, 0.25) 100%);
      border-left-color: #ff6347;
      .text {
        color: #ff6347;
      }
      .nickname {
        color: #ff7f50;
      }
      .prefix {
        color: #ff6347;
      }
    }
    &.room-message-cast {
      background: linear-gradient(135deg, rgba(42, 203, 66, 0.25) 0%, rgba(27, 172, 44, 0.25) 100%);
      border-left-color: #3dd95a;
      .text {
        color: #5ce67e;
      }
      .nickname {
        color: #6ef58a;
      }
      .prefix {
        color: #3dd95a;
      }
    }
    &.exhibition-chat-cast {
      background: linear-gradient(135deg, rgba(42, 203, 66, 0.25) 0%, rgba(27, 172, 44, 0.25) 100%);
      border-left-color: #3dd95a;
      .text {
        color: #5ce67e;
      }
      .nickname {
        color: #6ef58a;
      }
      .prefix {
        color: #3dd95a;
      }
    }
    &.lucky-box-cast {
      background: linear-gradient(135deg, rgba(42, 203, 66, 0.25) 0%, rgba(27, 172, 44, 0.25) 100%);
      border-left-color: #3dd95a;
      .text {
        color: #5ce67e;
      }
      .nickname {
        color: #6ef58a;
      }
      .prefix {
        color: #3dd95a;
      }
    }
    &.screen-chat-cast {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%);
      border-left-color: #8b9ff5;
      .text {
        color: #a5b4f7;
      }
      .nickname {
        color: #b89dd4;
      }
    }
    &.privilege-screen-chat-cast {
      background: linear-gradient(135deg, rgba(255, 193, 47, 0.25) 0%, rgba(235, 168, 37, 0.25) 100%);
      border-left-color: #ffd966;
      .text {
        color: #f4d03f;
      }
      .nickname {
        color: #f9e79f;
      }
      .prefix {
        color: #ffd966;
      }
    }
  }
}
</style>
