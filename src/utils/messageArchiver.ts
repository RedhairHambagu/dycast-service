/**
 * 消息存档工具
 * 用于保存原始消息数据，支持后续回放和分析
 */

export interface ArchivedMessage {
  timestamp: number;
  method: string;
  msgId: string;
  displayId?: string; // 用户的 displayId（如果有）
  payload: string; // Base64 编码的原始 payload
  decoded?: any; // 可选：已解码的数据
}

export interface ArchiveMetadata {
  roomNum: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
  version: string;
}

export interface ArchiveData {
  metadata: ArchiveMetadata;
  messages: ArchivedMessage[];
}

export interface ArchiverOptions {
  enabled?: boolean;
  maxMessages?: number; // 最大消息数量，超过后自动导出
  autoExport?: boolean; // 是否自动导出
  includeDecoded?: boolean; // 是否包含解码后的数据
  exportInterval?: number; // 自动导出间隔（毫秒）
}

export class MessageArchiver {
  private enabled: boolean;
  private maxMessages: number;
  private autoExport: boolean;
  private includeDecoded: boolean;
  private exportInterval: number;

  private messages: ArchivedMessage[] = [];
  private metadata: ArchiveMetadata;
  private exportTimer?: number;
  private exportCount: number = 0;
  private droppedCount: number = 0; // 被丢弃的消息数量

  constructor(
    roomNum: string,
    roomId: string,
    options: ArchiverOptions = {}
  ) {
    this.enabled = options.enabled ?? false;
    this.maxMessages = options.maxMessages ?? 10000;
    this.autoExport = options.autoExport ?? false;
    this.includeDecoded = options.includeDecoded ?? false;
    this.exportInterval = options.exportInterval ?? 5 * 60 * 1000; // 默认 5 分钟

    this.metadata = {
      roomNum,
      roomId,
      startTime: Date.now(),
      messageCount: 0,
      version: '1.0.0'
    };

    if (this.autoExport && this.enabled) {
      this.startAutoExport();
    }
  }

  /**
   * 启用存档
   */
  enable() {
    this.enabled = true;
    console.log('📦 消息存档已启用');
    
    if (this.autoExport) {
      this.startAutoExport();
    }
  }

  /**
   * 禁用存档
   */
  disable() {
    this.enabled = false;
    // 清空已有消息
    this.messages = [];
    this.metadata.messageCount = 0;
    console.log('📦 消息存档已禁用');

    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = undefined;
    }
  }

  /**
   * 记录消息
   */
  archive(method: string, msgId: string, payload: Uint8Array, decoded?: any, displayId?: string) {
    if (!this.enabled) return;

    // 尝试转换 Base64，失败则跳过该字段
    let payloadBase64: string;
    try {
      payloadBase64 = this.uint8ArrayToBase64(payload);
    } catch (e) {
      console.warn('📦 消息存档 Base64 转换失败，跳过该条:', method);
      payloadBase64 = '';
    }

    const archived: ArchivedMessage = {
      timestamp: Date.now(),
      method,
      msgId,
      payload: payloadBase64
    };

    // 添加 displayId（如果有）
    if (displayId) {
      archived.displayId = displayId;
    }

    if (this.includeDecoded && decoded) {
      archived.decoded = this.simplifyDecoded(decoded);
    }

    this.messages.push(archived);
    this.metadata.messageCount++;

    // 溢出处理
    if (this.messages.length > this.maxMessages) {
      if (this.autoExport) {
        // autoExport=true 时才导出文件
        console.warn(`📦 消息数量达到上限 (${this.maxMessages})，自动导出...`);
        this.exportToFile();
      } else {
        // autoExport=false 时丢弃最旧消息
        this.messages.shift();
        this.droppedCount++;
      }
    }
  }

  /**
   * 将 Uint8Array 转换为 Base64
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    try {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (e) {
      throw new Error('Base64 conversion failed');
    }
  }

  /**
   * 将 Base64 转换为 Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * 简化解码后的数据（移除过大的字段）
   */
  private simplifyDecoded(decoded: any): any {
    if (!decoded) return null;

    const simplified: any = {};
    
    // 只保留重要字段，避免数据过大
    const importantFields = [
      'common', 'user', 'content', 'gift', 'count', 'total',
      'memberCount', 'followCount', 'action', 'status',
      'fansLevel', 'fansClubName', 'title', 'describe'
    ];

    for (const field of importantFields) {
      if (decoded[field] !== undefined) {
        simplified[field] = decoded[field];
      }
    }

    return simplified;
  }

  /**
   * 导出存档数据
   */
  export(): ArchiveData {
    this.metadata.endTime = Date.now();
    
    const data: ArchiveData = {
      metadata: { ...this.metadata },
      messages: [...this.messages]
    };

    return data;
  }

  /**
   * 导出为 JSON 字符串
   */
  exportJSON(): string {
    const data = this.export();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出并下载为文件
   */
  exportToFile(filename?: string) {
    const json = this.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const defaultFilename = `archive-${this.metadata.roomNum}-${Date.now()}.json`;
    const finalFilename = filename || defaultFilename;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    this.exportCount++;
    console.log(`📦 已导出存档文件: ${finalFilename}`);
    
    // 导出后清空消息（保留元数据）
    this.messages = [];
    this.metadata.startTime = Date.now();
    this.metadata.messageCount = 0;
  }

  /**
   * 开始自动导出
   */
  private startAutoExport() {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }

    this.exportTimer = setInterval(() => {
      if (this.messages.length > 0) {
        console.log(`📦 自动导出存档 (${this.messages.length} 条消息)...`);
        this.exportToFile();
      }
    }, this.exportInterval);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      enabled: this.enabled,
      messageCount: this.messages.length,
      totalExported: this.exportCount,
      droppedCount: this.droppedCount,
      startTime: this.metadata.startTime,
      duration: Date.now() - this.metadata.startTime,
      estimatedSize: this.estimateSize()
    };
  }

  /**
   * 估算数据大小（字节）
   */
  private estimateSize(): number {
    if (this.messages.length === 0) return 0;
    
    // 估算单条消息的平均大小
    const sampleSize = Math.min(10, this.messages.length);
    let totalSize = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      const json = JSON.stringify(this.messages[i]);
      totalSize += json.length;
    }
    
    const avgSize = totalSize / sampleSize;
    return Math.round(avgSize * this.messages.length);
  }

  /**
   * 清空存档
   */
  clear() {
    this.messages = [];
    this.metadata.messageCount = 0;
    this.metadata.startTime = Date.now();
    console.log('📦 存档已清空');
  }

  /**
   * 从存档数据中恢复消息
   */
  static loadFromJSON(json: string): ArchiveData {
    return JSON.parse(json);
  }

  /**
   * 从存档中提取原始 payload
   */
  static extractPayload(archived: ArchivedMessage): Uint8Array {
    const binary = atob(archived.payload);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * 回放存档消息
   * @param data 存档数据
   * @param callback 回调函数，接收每条消息
   * @param speed 回放速度倍数（1 = 实时，2 = 2倍速）
   */
  static async replay(
    data: ArchiveData,
    callback: (message: ArchivedMessage, payload: Uint8Array) => void,
    speed: number = 1
  ) {
    console.log(`📦 开始回放存档: ${data.metadata.roomNum}`);
    console.log(`   消息数量: ${data.messages.length}`);
    console.log(`   时间范围: ${new Date(data.metadata.startTime).toLocaleString()} - ${data.metadata.endTime ? new Date(data.metadata.endTime).toLocaleString() : '进行中'}`);
    
    if (data.messages.length === 0) {
      console.log('📦 没有消息可回放');
      return;
    }

    const startTime = data.messages[0].timestamp;
    
    for (let i = 0; i < data.messages.length; i++) {
      const message = data.messages[i];
      const payload = MessageArchiver.extractPayload(message);
      
      // 计算延迟时间
      if (i > 0) {
        const prevTime = data.messages[i - 1].timestamp;
        const delay = (message.timestamp - prevTime) / speed;
        
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      callback(message, payload);
      
      if ((i + 1) % 100 === 0) {
        console.log(`📦 回放进度: ${i + 1}/${data.messages.length}`);
      }
    }
    
    console.log('📦 回放完成');
  }

  /**
   * 分析存档数据
   */
  static analyze(data: ArchiveData) {
    const stats = new Map<string, number>();
    
    data.messages.forEach(msg => {
      stats.set(msg.method, (stats.get(msg.method) || 0) + 1);
    });
    
    const sorted = Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1]);
    
    console.log('\n📊 存档分析报告');
    console.log('================');
    console.log(`房间号: ${data.metadata.roomNum}`);
    console.log(`消息总数: ${data.messages.length}`);
    console.log(`时间跨度: ${data.metadata.endTime ? Math.round((data.metadata.endTime - data.metadata.startTime) / 1000) : '未知'} 秒`);
    console.log('\n消息类型分布:');
    
    sorted.forEach(([type, count], index) => {
      const percentage = ((count / data.messages.length) * 100).toFixed(2);
      console.log(`${index + 1}. ${type}: ${count} (${percentage}%)`);
    });
    
    return {
      totalMessages: data.messages.length,
      messageTypes: sorted.length,
      distribution: sorted,
      timeSpan: data.metadata.endTime ? data.metadata.endTime - data.metadata.startTime : 0
    };
  }
}

// 创建全局实例（可选）
export const globalArchiver: MessageArchiver | null = null;
