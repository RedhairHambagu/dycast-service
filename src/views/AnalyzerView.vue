<template>
  <div class="analyzer-view">
    <h2>存档分析工具</h2>
    
    <div v-if="!archive" class="upload-area" @drop.prevent="handleDrop" @dragover.prevent>
      <input type="file" @change="handleFileSelect" accept=".json" ref="fileInput" style="display: none">
      <div class="upload-content" @click="$refs.fileInput.click()">
        <div class="icon">📦</div>
        <p>拖拽存档文件到这里</p>
        <p class="sub">或点击选择文件</p>
      </div>
    </div>
    
    <div v-else class="analysis-result">
      <div class="header">
        <h3>分析结果</h3>
        <button @click="reset">重新选择</button>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">房间号</div>
          <div class="value">{{ archive.metadata.roomNum }}</div>
        </div>
        <div class="stat-card">
          <div class="label">消息总数</div>
          <div class="value">{{ archive.messages.length }}</div>
        </div>
        <div class="stat-card">
          <div class="label">时长</div>
          <div class="value">{{ duration }}</div>
        </div>
        <div class="stat-card">
          <div class="label">消息类型</div>
          <div class="value">{{ messageTypes.length }}</div>
        </div>
      </div>
      
      <div class="message-types">
        <h4>消息类型分布</h4>
        <div v-for="item in messageTypes" :key="item.type" class="type-row">
          <span class="type-name">{{ formatType(item.type) }}</span>
          <div class="bar">
            <div class="fill" :style="{ width: item.percentage + '%' }"></div>
          </div>
          <span class="count">{{ item.count }} ({{ item.percentage.toFixed(1) }}%)</span>
        </div>
      </div>
      
      <div class="unprocessed" v-if="unprocessedTypes.length > 0">
        <h4>⚠️ 未处理的消息类型 ({{ unprocessedTypes.length }})</h4>
        <div class="type-list">
          <div v-for="type in unprocessedTypes" :key="type" class="type-item">
            {{ type }}
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button @click="showSamples">查看样本数据</button>
        <button @click="generateCode">生成扩展代码</button>
        <button @click="analyzeProtobuf">Protobuf 解析</button>
        <button @click="showPayloadAnalyzer = true">单独解析 Payload</button>
      </div>
      
      <div v-if="protobufResult.length > 0" class="protobuf-analysis">
        <h4>Protobuf 结构解析</h4>
        <div v-for="(item, index) in protobufResult" :key="index" class="proto-item">
          <div class="proto-header">{{ item.method }}</div>
          <div class="proto-tabs">
            <button 
              :class="{ active: activeTab[index] === 'json' }"
              @click="activeTab[index] = 'json'"
            >JSON</button>
            <button 
              :class="{ active: activeTab[index] === 'detail' }"
              @click="activeTab[index] = 'detail'"
              v-if="item.detailed"
            >详细分析</button>
          </div>
          <pre v-if="activeTab[index] === 'json'">{{ item.result }}</pre>
          <pre v-if="activeTab[index] === 'detail' && item.detailed">{{ item.detailed }}</pre>
        </div>
      </div>
      
      <div v-if="samples" class="samples">
        <h4>样本数据</h4>
        <pre>{{ samples }}</pre>
      </div>
      
      <div v-if="code" class="code">
        <h4>扩展代码建议</h4>
        <pre>{{ code }}</pre>
      </div>
    </div>
    
    <!-- Payload 分析窗口 -->
    <div v-if="showPayloadAnalyzer" class="payload-analyzer-modal" @click.self="showPayloadAnalyzer = false">
      <div class="payload-analyzer-content">
        <h3>Payload 解析器</h3>
        <textarea 
          v-model="payloadInput" 
          placeholder="粘贴 Base64 编码的 payload"
          rows="5"
        ></textarea>
        <button @click="parsePayload">解析</button>
        <div v-if="payloadParsed" class="payload-result">
          <h4>解析结果</h4>
          <pre>{{ payloadParsed }}</pre>
        </div>
        <button class="close-modal-btn" @click="showPayloadAnalyzer = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const fileInput = ref<HTMLInputElement>();
const archive = ref<any>(null);
const samples = ref<string>('');
const code = ref<string>('');
const protobufResult = ref<any[]>([]);
const activeTab = ref<Record<number, string>>({});
const showPayloadAnalyzer = ref(false);
const payloadInput = ref('');
const payloadParsed = ref('');

const duration = computed(() => {
  if (!archive.value?.metadata) return '-';
  const start = archive.value.metadata.startTime;
  const end = archive.value.metadata.endTime || Date.now();
  const seconds = Math.floor((end - start) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
});

const messageTypes = computed(() => {
  if (!archive.value) return [];
  
  const stats = new Map<string, number>();
  archive.value.messages.forEach((msg: any) => {
    stats.set(msg.method, (stats.get(msg.method) || 0) + 1);
  });
  
  const total = archive.value.messages.length;
  return Array.from(stats.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count);
});

const unprocessedTypes = computed(() => {
  if (!archive.value) return [];
  
  const processed = [
    'WebcastChatMessage',
    'WebcastGiftMessage',
    'WebcastLikeMessage',
    'WebcastMemberMessage',
    'WebcastSocialMessage',
    'WebcastEmojiChatMessage',
    'WebcastRoomUserSeqMessage',
    'WebcastControlMessage',
    'WebcastRoomRankMessage',
    'WebcastRoomStatsMessage'
  ];
  
  return messageTypes.value
    .filter(item => !processed.includes(item.type))
    .map(item => item.type);
});

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadFile(file);
};

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files[0];
  if (file) loadFile(file);
};

const loadFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      archive.value = JSON.parse(e.target?.result as string);
      console.log('存档加载成功:', archive.value);
    } catch (err) {
      alert('文件格式错误');
    }
  };
  reader.readAsText(file);
};

const reset = () => {
  archive.value = null;
  samples.value = '';
  code.value = '';
  protobufResult.value = [];
};

const parseProtobuf = (data: Uint8Array): any => {
  const result: any = {};
  let i = 0;
  
  while (i < data.length) {
    const tag = data[i];
    const fieldNum = tag >> 3;
    const wireType = tag & 0x07;
    i++;
    
    if (wireType === 0) {  // Varint
      let value = 0;
      let shift = 0;
      while (true) {
        const byte = data[i];
        i++;
        value |= (byte & 0x7F) << shift;
        if (!(byte & 0x80)) break;
        shift += 7;
      }
      result[`field_${fieldNum}`] = value;
      
    } else if (wireType === 2) {  // Length-delimited
      const length = data[i];
      i++;
      const value = data.slice(i, i + length);
      
      // 尝试解析为字符串
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(value);
        result[`field_${fieldNum}`] = text;
      } catch {
        // 尝试递归解析为嵌套 protobuf
        try {
          const nested = parseProtobuf(value);
          result[`field_${fieldNum}`] = nested;
        } catch {
          result[`field_${fieldNum}`] = Array.from(value).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      }
      
      i += length;
    }
  }
  
  return result;
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const analyzeProtobuf = () => {
  if (!archive.value) return;
  
  protobufResult.value = [];
  
  unprocessedTypes.value.forEach(type => {
    const msgs = archive.value.messages.filter((m: any) => m.method === type);
    if (msgs.length > 0) {
      const msg = msgs[0];
      try {
        const payload = base64ToUint8Array(msg.payload);
        const parsed = parseProtobuf(payload);
        
        // 生成详细解析
        const detailed = analyzeFields(parsed, type);
        
        protobufResult.value.push({
          method: type,
          result: JSON.stringify(parsed, null, 2),
          detailed: detailed
        });
      } catch (err) {
        protobufResult.value.push({
          method: type,
          result: `解析失败: ${err}`
        });
      }
    }
  });
};

const analyzeFields = (data: any, method: string): string => {
  let result = `=== ${method} 字段分析 ===\n\n`;
  
  const analyze = (obj: any, prefix = '', level = 0) => {
    if (level > 10) return;
    
    for (const key in obj) {
      const value = obj[key];
      const indent = '  '.repeat(level);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${indent}${key}:\n`;
        analyze(value, `${prefix}${key}.`, level + 1);
      } else if (typeof value === 'string') {
        const preview = value.length > 50 ? value.substring(0, 50) + '...' : value;
        result += `${indent}${key}: "${preview}"\n`;
      } else {
        result += `${indent}${key}: ${value}\n`;
      }
    }
  };
  
  analyze(data);
  
  // 添加建议
  result += '\n=== 提取建议 ===\n';
  if (data.field_1) result += '- field_1: Common (通用字段)\n';
  if (data.field_2) result += '- field_2: 可能是用户信息或主要数据\n';
  if (data.field_3) result += '- field_3: 可能是内容或配置\n';
  
  return result;
};

const parsePayload = () => {
  if (!payloadInput.value.trim()) {
    payloadParsed.value = '请输入 payload';
    return;
  }
  
  try {
    const payload = base64ToUint8Array(payloadInput.value.trim());
    const parsed = parseProtobuf(payload);
    payloadParsed.value = JSON.stringify(parsed, null, 2);
  } catch (err) {
    payloadParsed.value = `解析失败: ${err}`;
  }
};

const formatType = (type: string) => {
  return type.replace('Webcast', '').replace('Message', '');
};

const showSamples = () => {
  if (!archive.value) return;
  
  const sampleData: any = {};
  unprocessedTypes.value.forEach(type => {
    const msgs = archive.value.messages.filter((m: any) => m.method === type);
    if (msgs.length > 0) {
      sampleData[type] = msgs.slice(0, 3).map((m: any) => m.decoded || { payload: '原始数据' });
    }
  });
  
  samples.value = JSON.stringify(sampleData, null, 2);
};

const generateCode = () => {
  if (!archive.value) return;
  
  let result = '// 建议添加以下消息类型的处理:\n\n';
  
  result += '// 1. 在 CastMethod 枚举中添加:\n';
  unprocessedTypes.value.forEach(type => {
    const enumName = type.replace('Webcast', '').replace('Message', '').replace(/([A-Z])/g, '_$1').toUpperCase().substring(1);
    result += `  ${enumName} = '${type}',\n`;
  });
  
  result += '\n// 2. 在 switch 语句中添加处理:\n';
  unprocessedTypes.value.forEach(type => {
    const enumName = type.replace('Webcast', '').replace('Message', '').replace(/([A-Z])/g, '_$1').toUpperCase().substring(1);
    const funcName = 'decode' + type.replace('Webcast', '');
    result += `
case CastMethod.${enumName}:
  message = ${funcName}(payload);
  data.method = CastMethod.${enumName};
  // TODO: 添加具体的数据提取逻辑
  processed = true;
  break;
`;
  });
  
  result += '\n// 3. 确保导入了解码函数:\n';
  result += 'import {\n';
  unprocessedTypes.value.forEach(type => {
    const funcName = 'decode' + type.replace('Webcast', '');
    result += `  ${funcName},\n`;
  });
  result += "} from './model';\n";
  
  code.value = result;
};
</script>

<style scoped>
.analyzer-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 60px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

.upload-content .icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.upload-content p {
  margin: 5px 0;
  color: #666;
}

.upload-content .sub {
  font-size: 12px;
  color: #999;
}

.analysis-result {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.stat-card .label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.stat-card .value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.message-types, .unprocessed {
  margin-bottom: 30px;
}

h4 {
  margin-bottom: 15px;
  color: #333;
}

.type-row {
  display: grid;
  grid-template-columns: 200px 1fr 150px;
  gap: 15px;
  align-items: center;
  margin-bottom: 10px;
}

.type-name {
  font-size: 13px;
  color: #666;
}

.bar {
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: width 0.3s;
}

.count {
  font-size: 13px;
  color: #666;
  text-align: right;
}

.unprocessed {
  padding: 15px;
  background: #fff3cd;
  border-radius: 8px;
}

.type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.type-item {
  padding: 5px 12px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  color: #e6a23c;
  border: 1px solid #e6a23c;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  padding: 10px 20px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #66b1ff;
}

.samples, .code {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

pre {
  margin: 10px 0 0 0;
  padding: 15px;
  background: #282c34;
  color: #abb2bf;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}

.protobuf-analysis {
  margin-top: 20px;
}

.proto-item {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.proto-header {
  font-weight: bold;
  margin-bottom: 10px;
  color: #409eff;
}

.proto-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.proto-tabs button {
  padding: 5px 15px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.proto-tabs button.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.proto-tabs button:hover {
  background: #66b1ff;
  color: white;
}

.payload-analyzer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.payload-analyzer-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: auto;
}

.payload-analyzer-content h3 {
  margin-bottom: 15px;
}

.payload-analyzer-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  margin-bottom: 10px;
  resize: vertical;
}

.payload-result {
  margin-top: 20px;
}

.close-modal-btn {
  margin-top: 20px;
  background: #909399;
}

.close-modal-btn:hover {
  background: #a6a9ad;
}
</style>
