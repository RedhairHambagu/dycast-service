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
      'copyable': isCopyable
    }"
    @click="handleCopy"
    :title="isCopyable ? '点击复制' : ''">
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
  </div>
</template>

<script setup lang="ts">
import { CastMethod, CastRtfContentType, type CastGift, type CastRtfContent, type CastUser } from '@/core/dycast';
import { emojis } from '@/core/emoji';
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
    content = `【${props.gift.price}-礼物消息】谢谢${userName}送出的${props.gift.name}`;
  } else if (props.method === CastMethod.ROOM_MESSAGE) {
    content = props.content || '';
  }
  
  return `[${userName}]：${content}`;
};

// 复制到剪贴板
const handleCopy = async () => {
  if (!isCopyable.value) return;
  
  try {
    const text = getTextContent();
    await navigator.clipboard.writeText(text);
    console.log('已复制到剪贴板:', text);
  } catch (err) {
    console.error('复制失败:', err);
  }
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
