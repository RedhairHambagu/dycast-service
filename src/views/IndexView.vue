<template>
  <div class="index-view">
    <div class="view-left">
      <LiveInfo
        :cover="cover"
        :title="title"
        :avatar="avatar"
        :nickname="nickname"
        :follow-count="followCount"
        :member-count="memberCount"
        :user-count="userCount"
        :like-count="likeCount" />
      <div class="view-left-bottom">
        <div class="view-left-tools">
          <div class="view-left-tool" title="保存弹幕" @click.stop="saveCastToFile">
            <i class="ice-save"></i>
          </div>
          <div class="view-left-tool" title="分析存档" @click.stop="showAnalyzer = true">
            <i class="ice-chart"></i>
          </div>
        </div>
        <hr class="hr" />
        <LiveStatusPanel ref="panel" :status="connectStatus" />
      </div>
    </div>
    <div class="view-center">
      <!-- 主要弹幕：聊天、礼物、房间消息 -->
      <CastList :types="['chat', 'gift', 'room']" :gift-threshold="giftThreshold" ref="castEl" />
    </div>
    <div class="view-right">
      <div class="view-input">
        <ConnectInput
          ref="roomInput"
          label="房间号"
          placeholder="请输入房间号"
          v-model:value="roomNum"
          :test="verifyRoomNumber"
          @confirm="connectLive"
          @cancel="disconnectLive" />
        <ConnectInput
          ref="relayInput"
          label="WS地址"
          placeholder="请输入转发地址"
          confirm-text="转发"
          cancel-text="停止"
          v-model:value="relayUrl"
          :test="verifyWssUrl"
          @confirm="relayCast"
          @cancel="stopRelayCast" />
        <div class="gift-threshold-input">
          <label class="threshold-label">高价值礼物阈值</label>
          <input 
            type="number" 
            v-model.number="giftThreshold" 
            placeholder="1000"
            min="0"
            class="threshold-input" />
        </div>
      </div>
      <div class="view-other">
        <!-- 其它弹幕：关注、点赞、进入、控制台等 -->
        <CastList ref="otherEl" :types="['social', 'like', 'member']" pos="left" no-prefix theme="dark" />
      </div>
      <div class="view-all">
        <!-- 所有消息：包括特效、房间消息等 -->
        <CastList ref="allEl" :types="['all']" pos="left" no-prefix theme="dark" />
      </div>
    </div>
    
    <!-- 分析器弹窗 -->
    <div v-if="showAnalyzer" class="analyzer-modal" @click.self="showAnalyzer = false">
      <div class="analyzer-content">
        <AnalyzerView />
        <button class="close-btn" @click="showAnalyzer = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ConnectInput from '@/components/ConnectInput.vue';
import LiveInfo from '@/components/LiveInfo.vue';
import LiveStatusPanel from '@/components/LiveStatusPanel.vue';
import CastList from '@/components/CastList.vue';
import AnalyzerView from './AnalyzerView.vue';
import {
  CastMethod,
  DyCast,
  DyCastCloseCode,
  RoomStatus,
  type ConnectStatus,
  type DyLiveInfo,
  type DyMessage,
  type LiveRoom
} from '@/core/dycast';
import { verifyRoomNum, verifyWsUrl } from '@/utils/verifyUtil';
import { ref, useTemplateRef } from 'vue';
import { CLog } from '@/utils/logUtil';
import { getId } from '@/utils/idUtil';
import { RelayCast } from '@/core/relay';
import SkMessage from '@/components/Message';
import { formatDate } from '@/utils/commonUtil';

const showAnalyzer = ref(false);
import FileSaver from '@/utils/fileUtil';

// 高价值礼物阈值
const giftThreshold = ref(1000);

// 连接状态
const connectStatus = ref<ConnectStatus>(0);
// 转发状态
const relayStatus = ref<ConnectStatus>(0);
// 房间号
const roomNum = ref<string>('');
// 房间号输入框状态
const roomInputRef = useTemplateRef('roomInput');
// 转发地址
const relayUrl = ref<string>('');
const relayInputRef = useTemplateRef('relayInput');
// 状态面板
const statusPanelRef = useTemplateRef('panel');

/** 直播间信息 */
const cover = ref<string>('');
const title = ref<string>('*****');
const avatar = ref<string>('');
const nickname = ref<string>('***');
const followCount = ref<string | number>('*****');
const memberCount = ref<string | number>('*****');
const userCount = ref<string | number>('*****');
const likeCount = ref<string | number>('*****');

// 主要弹幕
const castRef = useTemplateRef('castEl');
// 其它弹幕
const otherRef = useTemplateRef('otherEl');
// 所有其他消息
const allRef = useTemplateRef('allEl');
// 所有弹幕
const allCasts: DyMessage[] = [];
// 记录弹幕
const castSet = new Set<string>();
// 弹幕客户端
let castWs: DyCast | undefined;
// 转发客户端
let relayWs: RelayCast | undefined;

/**
 * 验证房间号
 * @param value
 * @returns
 */
function verifyRoomNumber(value: string) {
  const flag = verifyRoomNum(value);
  if (flag) return { flag, message: '' };
  else {
    return { flag, message: '房间号错误' };
  }
}

/**
 * 验证转发地址 WsUrl
 * @param value
 * @returns
 */
function verifyWssUrl(value: string) {
  const flag = verifyWsUrl(value);
  if (flag) return { flag, message: '' };
  else {
    return { flag, message: '转发地址错误' };
  }
}

/** 设置房间号输入框状态 */
const setRoomInputStatus = function (flag?: boolean) {
  if (roomInputRef.value) roomInputRef.value.setStatus(flag);
};

/** 设置转发地址输入框状态 */
const setRelayInputStatus = function (flag?: boolean) {
  if (relayInputRef.value) relayInputRef.value.setStatus(flag);
};

/**
 * 设置房间统计信息
 * @param room
 * @returns
 */
const setRoomCount = function (room?: LiveRoom) {
  if (!room) return;
  if (room.audienceCount) memberCount.value = `${room.audienceCount}`;
  if (room.followCount) followCount.value = `${room.followCount}`;
  if (room.likeCount) likeCount.value = `${room.likeCount}`;
  if (room.totalUserCount) userCount.value = `${room.totalUserCount}`;
};
/**
 * 设置直播间信息
 * @param info
 */
const setRoomInfo = function (info?: DyLiveInfo) {
  if (!info) return;
  if (info.cover) cover.value = info.cover;
  if (info.title) title.value = info.title;
  if (info.avatar) avatar.value = info.avatar;
  if (info.nickname) nickname.value = info.nickname;
};

/**
 * 处理消息列表
 */
const handleMessages = function (msgs: DyMessage[]) {
  const newCasts: DyMessage[] = [];
  const mainCasts: DyMessage[] = [];
  const otherCasts: DyMessage[] = [];
  const allCastsNew: DyMessage[] = [];
  try {
    for (const msg of msgs) {
      if (!msg.id) continue;
      if (castSet.has(msg.id)) continue;
      castSet.add(msg.id);
      switch (msg.method) {
        case CastMethod.CHAT:
          newCasts.push(msg);
          mainCasts.push(msg);
          break;
        case CastMethod.GIFT:
          if (!msg?.gift?.repeatEnd) {
            newCasts.push(msg);
            mainCasts.push(msg);
          }
          break;
        case CastMethod.LIKE:
          newCasts.push(msg);
          otherCasts.push(msg);
          setRoomCount(msg.room);
          break;
        case CastMethod.MEMBER:
          newCasts.push(msg);
          otherCasts.push(msg);
          setRoomCount(msg.room);
          break;
        case CastMethod.SOCIAL:
          newCasts.push(msg);
          otherCasts.push(msg);
          setRoomCount(msg.room);
          break;
        case CastMethod.EMOJI_CHAT:
          newCasts.push(msg);
          mainCasts.push(msg);
          break;
        case CastMethod.ROOM_USER_SEQ:
          setRoomCount(msg.room);
          break;
        case CastMethod.ROOM_STATS:
          setRoomCount(msg.room);
          break;
        case CastMethod.CONTROL:
          // 显示状态变化消息
          if (msg?.room?.status) {
            const statusText = ['', '准备中', '直播中', '暂时离开', '已下播'][msg.room.status] || '未知';
            addConsoleMessage(`直播状态变更: ${statusText}`);
            
            // 只有在非直播状态时才断开连接
            if (msg.room.status !== RoomStatus.LIVING && msg.room.status !== RoomStatus.PAUSE) {
              newCasts.push(msg);
              otherCasts.push(msg);
              // 延迟断开，让状态消息先显示
              setTimeout(() => {
                disconnectLive();
              }, 500);
            }
          }
          break;
        case CastMethod.ROOM_MESSAGE:
          // 只有特定 bizScene 的 RoomMessage 显示在主列表
          // 注意：msg.content 已经在 dycast.ts 中被格式化过了
          newCasts.push(msg);
          allCastsNew.push(msg);
          // 只有这两种类型才添加到主列表
          if (msg.bizScene === 'star_guard_activate_text' || msg.bizScene === 'subscribe_anchor_mvp_v2') {
            mainCasts.push(msg);
          }
          break;
        case CastMethod.NOTIFY_EFFECT:
        case CastMethod.FANSCLUB:
        case CastMethod.IN_ROOM_BANNER:
        case CastMethod.ROOM_DATA_SYNC:
        case CastMethod.ACTIVITY_EMOJI_GROUPS:
        case CastMethod.GIFT_SORT:
        case CastMethod.UPDATE_FAN_TICKET:
        case CastMethod.INTERACT_EFFECT:
        case CastMethod.RANKLIST_HOUR_ENTRANCE:
        case CastMethod.CHAT_LIKE:
        case CastMethod.ROOM_STREAM_ADAPTATION:
        case CastMethod.TOP_EFFECT:
        case CastMethod.ROOM_INTRO:
        case CastMethod.SANDWICH_BORDER:
        case CastMethod.NOTIFY:
        case CastMethod.ROOM_NOTIFY:
        case CastMethod.QUIZ_AUDIENCE_STATUS:
        case CastMethod.TEMP_STATE_AREA_REACH:
        case CastMethod.CORNER_REACH:
          // 其他消息类型显示在 all 列表
          newCasts.push(msg);
          allCastsNew.push(msg);
          break;
      }
    }
  } catch (err) {}
  // 记录
  allCasts.push(...newCasts);
  if (castRef.value) castRef.value.appendCasts(mainCasts);
  if (otherRef.value) otherRef.value.appendCasts(otherCasts);
  if (allRef.value) allRef.value.appendCasts(allCastsNew);
  if (relayWs && relayWs.isConnected()) {
    relayWs.send(JSON.stringify(msgs));
  }
};

/**
 * 添加控制台消息
 * @param msg
 */
const addConsoleMessage = function (content: string) {
  if (otherRef.value)
    otherRef.value.appendCasts([
      {
        id: getId(),
        method: CastMethod.CUSTOM,
        content,
        user: { name: '控制台' }
      }
    ]);
};

/**
 * 清理列表
 */
function clearMessageList() {
  castSet.clear();
  allCasts.length = 0;
  if (castRef.value) castRef.value.clearCasts();
  if (otherRef.value) otherRef.value.clearCasts();
}

/**
 * 连接房间
 */
const connectLive = function () {
  try {
    // 清空上一次连接的消息
    clearMessageList();
    CLog.debug('正在连接:', roomNum.value);
    SkMessage.info(`正在连接：${roomNum.value}`);
    const cast = new DyCast(roomNum.value);
    
    // 可选：启用存档功能用于调试
    // cast.enableArchive({
    //   autoExport: false,
    //   includeDecoded: false,
    //   maxMessages: 10000
    // });
    
    cast.on('open', (ev, info) => {
      CLog.info('DyCast 房间连接成功');
      SkMessage.success(`房间连接成功[${roomNum.value}]`);
      setRoomInputStatus(true);
      connectStatus.value = 1;
      setRoomInfo(info);
      addConsoleMessage('直播间已连接');
    });
    cast.on('error', err => {
      CLog.error('DyCast 连接出错 =>', err);
      SkMessage.error(`连接出错: ${err}`);
      connectStatus.value = 2;
      setRoomInputStatus(false);
    });
    cast.on('close', (code, reason) => {
      CLog.info(`DyCast 房间已关闭[${code}] => ${reason}`);
      
      connectStatus.value = 3;
      setRoomInputStatus(false);
      
      // 断开连接后自动保存弹幕
      if (allCasts.length > 0) {
        const date = formatDate(new Date(), 'yyyy-MM-dd_HHmmss');
        const fileName = `[${roomNum.value}]${date}(${allCasts.length})`;
        const data = JSON.stringify(allCasts, null, 2);
        FileSaver.save(data, {
          name: fileName,
          ext: '.json',
          mimeType: 'application/json',
          description: '弹幕数据',
          existStrategy: 'new'
        })
          .then(res => {
            if (res.success) {
              SkMessage.success(`弹幕已自动保存 (${allCasts.length} 条)`);
              CLog.info('弹幕自动保存成功');
            } else {
              SkMessage.error('弹幕自动保存失败');
              CLog.error('弹幕自动保存失败 =>', res.message);
            }
          })
          .catch(err => {
            SkMessage.error('弹幕自动保存出错');
            CLog.error('弹幕自动保存出错 =>', err);
          });
      }
      
      switch (code) {
        case DyCastCloseCode.NORMAL:
          SkMessage.success('断开成功');
          break;
        case DyCastCloseCode.LIVE_END:
          SkMessage.info('主播已下播');
          break;
        case DyCastCloseCode.CANNOT_RECEIVE:
          SkMessage.error('无法正常接收信息，已关闭');
          break;
        default:
          SkMessage.info('房间已关闭');
      }
      if (code === DyCastCloseCode.LIVE_END) {
        addConsoleMessage(reason || '主播尚未开播或已下播');
      } else {
        if (statusPanelRef.value) addConsoleMessage(`连接已关闭，共持续: ${statusPanelRef.value.getDuration()}`);
        else addConsoleMessage('连接已关闭');
      }
    });
    cast.on('message', msgs => {
      handleMessages(msgs);
    });
    cast.on('reconnecting', (count, code, reason) => {
      const maxCount = 5; // 与 dycast.ts 中的 maxReconnectCount 保持一致
      let statusMsg = '';
      
      // 获取当前直播间状态
      const liveInfo = cast.getLiveInfo();
      if (liveInfo.status === 2) {
        statusMsg = '直播中';
      } else if (liveInfo.status === 3) {
        statusMsg = '暂时离开';
      }
      
      switch (code) {
        case DyCastCloseCode.CANNOT_RECEIVE:
          SkMessage.warning(`无法正常接收弹幕(${statusMsg})，正在重连: ${count}/${maxCount}`);
          addConsoleMessage(`连接异常，正在尝试第 ${count} 次重连...`);
          break;
        case DyCastCloseCode.RECONNECTING:
          SkMessage.warning(`连接断开(${statusMsg})，正在重连: ${count}/${maxCount}`);
          addConsoleMessage(`连接断开，正在尝试第 ${count} 次重连...`);
          break;
        default:
          CLog.warn('DyCast 重连中 =>', count, reason);
          SkMessage.warning(`正在重连中(${statusMsg}): ${count}/${maxCount}`);
          addConsoleMessage(`正在尝试第 ${count} 次重连...`);
      }
    });
    cast.on('reconnect', ev => {
      CLog.info('DyCast 重连成功');
      SkMessage.success('房间重连完成');
      addConsoleMessage('重连成功，继续接收弹幕');
    });
    cast.connect();
    castWs = cast;
  } catch (err) {
    CLog.error('房间连接过程出错:', err);
    SkMessage.error('房间连接过程出错');
    setRoomInputStatus(false);
    castWs = void 0;
  }
};
/** 断开连接 */
const disconnectLive = function () {
  if (castWs) castWs.close(1000, '断开连接');
};

/** 连接转发房间 */
const relayCast = function () {
  try {
    CLog.info('正在连接转发中 =>', relayUrl.value);
    SkMessage.info(`转发连接中: ${relayUrl.value}`);
    const cast = new RelayCast(relayUrl.value);
    cast.on('open', () => {
      CLog.info(`DyCast 转发连接成功`);
      SkMessage.success(`已开始转发`);
      setRelayInputStatus(true);
      relayStatus.value = 1;
      addConsoleMessage('转发客户端已连接');
      if (castWs) {
        // 发送直播间信息给转发地址
        cast.send(JSON.stringify(castWs.getLiveInfo()));
      }
    });
    cast.on('close', (code, msg) => {
      CLog.info(`(${code})dycast 转发已关闭: ${msg || '未知原因'}`);
      if (code === 1000) SkMessage.info(`已停止转发`);
      else SkMessage.warning(`转发已停止: ${msg || '未知原因'}`);
      setRelayInputStatus(false);
      relayStatus.value = 0;
      addConsoleMessage('转发已关闭');
    });
    cast.on('error', ev => {
      CLog.warn(`dycast 转发出错: ${ev.message}`);
      SkMessage.error(`转发出错了: ${ev.message}`);
      setRelayInputStatus(false);
      relayStatus.value = 2;
    });
    cast.connect();
    relayWs = cast;
  } catch (err) {
    CLog.error('弹幕转发出错:', err);
    SkMessage.error('转发出错: ${err.message}');
    setRelayInputStatus(false);
    relayStatus.value = 2;
    relayWs = void 0;
  }
};
/** 暂停转发 */
const stopRelayCast = function () {
  if (relayWs) relayWs.close(1000);
};

/** 将弹幕保存到本地文件（手动保存） */
const saveCastToFile = function () {
  const len = allCasts.length;
  if (len <= 0) {
    SkMessage.warning('暂无弹幕需要保存');
    return;
  }
  const date = formatDate(new Date(), 'yyyy-MM-dd_HHmmss');
  const fileName = `[${roomNum.value}]${date}(${len})`;
  const data = JSON.stringify(allCasts, null, 2);
  FileSaver.save(data, {
    name: fileName,
    ext: '.json',
    mimeType: 'application/json',
    description: '弹幕数据',
    existStrategy: 'new'
  })
    .then(res => {
      if (res.success) {
        SkMessage.success('弹幕保存成功');
      } else {
        SkMessage.error('弹幕保存失败');
        CLog.error('弹幕保存失败 =>', res.message);
      }
    })
    .catch(err => {
      SkMessage.error('弹幕保存出错了');
      CLog.error('弹幕保存出错了 =>', err);
    });
};
</script>

<style lang="scss" scoped>
$bg: #f7f6f5;
$bd: #b2bfc3;
$theme: #68be8d;
$tool: #8b968d;

.index-view {
  position: relative;
  background-color: $bg;
  display: flex;
  width: 100%;
  height: 100%;
  .view-left,
  .view-center,
  .view-right {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    width: 0;
    flex-shrink: 0;
  }
  .view-left {
    flex-grow: 2.5;
    border-right: 1px solid $bd;
    justify-content: space-between;
  }
  .view-left-bottom {
    width: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 12px 0;
    .hr {
      height: 0;
      border: 0;
      border-top: 1px solid $bd;
      margin: 5px 0;
    }
  }
  .view-left-tools {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    box-sizing: border-box;
    padding: 0 12px;
  }
  .view-left-tool {
    font-size: 21px;
    width: 1.2em;
    height: 1.2em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: $tool;
    transition: color 0.2s ease-in-out, background-color 0.3s ease-in-out, opacity 0.2s ease;
    background-color: transparent;
    border-radius: 0.4em;
    i {
      font-size: 1em;
    }
    &:hover {
      color: #fff;
      background-color: $theme;
    }
    &:active {
      opacity: 0.8;
    }
  }
  .view-center {
    flex-grow: 4.5;
    padding: 18px 12px;
  }
  .view-right {
    flex-grow: 3;
    border-left: 1px solid $bd;
    padding: 18px 12px;
    gap: 12px;
  }
  .view-input {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .gift-threshold-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid $bd;
    .threshold-label {
      font-family: 'mkwxy';
      font-size: 0.9rem;
      color: #666;
      white-space: nowrap;
    }
    .threshold-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 0.9rem;
      font-family: 'mkwxy';
      outline: none;
      transition: border-color 0.2s;
      &:focus {
        border-color: $theme;
      }
      &::placeholder {
        color: #ccc;
      }
    }
  }
  .view-other {
    display: flex;
    width: 100%;
    height: 0;
    flex-grow: 1;
    box-sizing: border-box;
  }
  .view-all {
    display: flex;
    width: 100%;
    height: 0;
    flex-grow: 1;
    box-sizing: border-box;
    margin-top: 5px;
  }
}

@media (max-width: 768px) {
  .index-view {
    flex-direction: column;
    height: auto;
    .view-left,
    .view-center,
    .view-right {
      width: 100%;
      flex-grow: 0;
      border: none;
    }
    .view-left {
      margin-top: 250px;
      justify-content: flex-start;
    }
    .view-center {
      height: 100vh;
    }
    .view-right {
      height: 80vh;
    }
    .view-input {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      padding: 18px 12px;
    }
    .view-left-bottom {
      position: absolute;
      top: 150px;
      left: 0;
    }
  }
}

.analyzer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.analyzer-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: auto;
  position: relative;
}

.close-btn {
  position: sticky;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 30px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin: 20px auto;
  display: block;
}

.close-btn:hover {
  background: #66b1ff;
}
</style>
