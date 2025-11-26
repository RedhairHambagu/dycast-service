/**
 * 消息调试工具
 * 用于分析和统计直播间接收到的各类消息
 */

export interface MessageStat {
  type: string;
  count: number;
  lastSeen: number;
  samples: any[];
}

export class MessageDebugger {
  private stats: Map<string, MessageStat> = new Map();
  private maxSamples: number = 3; // 每种类型保存的样本数量
  private enabled: boolean = false;

  constructor(enabled: boolean = false, maxSamples: number = 3) {
    this.enabled = enabled;
    this.maxSamples = maxSamples;
  }

  /**
   * 启用调试
   */
  enable() {
    this.enabled = true;
    console.log('📊 消息调试器已启用');
  }

  /**
   * 禁用调试
   */
  disable() {
    this.enabled = false;
    console.log('📊 消息调试器已禁用');
  }

  /**
   * 记录消息
   */
  record(method: string, message: any, processed: boolean = false) {
    if (!this.enabled) return;

    const stat = this.stats.get(method) || {
      type: method,
      count: 0,
      lastSeen: Date.now(),
      samples: []
    };

    stat.count++;
    stat.lastSeen = Date.now();

    // 保存样本（只保存前几个）
    if (stat.samples.length < this.maxSamples) {
      stat.samples.push({
        timestamp: Date.now(),
        data: this.simplifyMessage(message),
        processed
      });
    }

    this.stats.set(method, stat);

    // 如果是未处理的消息，立即打印
    if (!processed) {
      console.warn(`⚠️ 未处理的消息类型: ${method}`);
      console.log('消息样本:', this.simplifyMessage(message));
    }
  }

  /**
   * 简化消息对象，只保留关键信息
   */
  private simplifyMessage(message: any): any {
    if (!message) return null;

    // 创建简化版本
    const simplified: any = {};

    // 保留常见的重要字段
    const importantFields = [
      'common',
      'user',
      'content',
      'gift',
      'count',
      'total',
      'memberCount',
      'followCount',
      'action',
      'status',
      'fansLevel',
      'fansClubName',
      'title',
      'describe',
      'bannerId',
      'effectId',
      'effectType'
    ];

    for (const field of importantFields) {
      if (message[field] !== undefined) {
        simplified[field] = message[field];
      }
    }

    return simplified;
  }

  /**
   * 获取统计信息
   */
  getStats(): MessageStat[] {
    return Array.from(this.stats.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * 打印统计报告
   */
  printReport() {
    const stats = this.getStats();
    console.log('\n📊 ===== 消息统计报告 =====');
    console.log(`总消息类型数: ${stats.length}`);
    console.log('\n消息类型分布:');

    stats.forEach((stat, index) => {
      const processed = stat.samples.some(s => s.processed);
      const status = processed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${stat.type}: ${stat.count} 次`);
    });

    console.log('\n未处理的消息类型:');
    const unprocessed = stats.filter(s => s.samples.some(sample => !sample.processed));
    if (unprocessed.length === 0) {
      console.log('✅ 所有消息类型都已处理');
    } else {
      unprocessed.forEach((stat, index) => {
        console.log(`${index + 1}. ${stat.type} (${stat.count} 次)`);
        console.log('   样本数据:', stat.samples[0]?.data);
      });
    }

    console.log('\n========================\n');
  }

  /**
   * 获取未处理的消息类型
   */
  getUnprocessedTypes(): string[] {
    return this.getStats()
      .filter(s => s.samples.some(sample => !sample.processed))
      .map(s => s.type);
  }

  /**
   * 获取某个类型的样本数据
   */
  getSamples(type: string): any[] {
    const stat = this.stats.get(type);
    return stat ? stat.samples.map(s => s.data) : [];
  }

  /**
   * 清空统计
   */
  clear() {
    this.stats.clear();
    console.log('📊 统计数据已清空');
  }

  /**
   * 导出统计数据为 JSON
   */
  exportJSON(): string {
    const data = {
      timestamp: Date.now(),
      stats: this.getStats()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 生成扩展代码建议
   */
  generateCodeSuggestions(): string {
    const unprocessed = this.getUnprocessedTypes();
    if (unprocessed.length === 0) {
      return '// 所有消息类型都已处理';
    }

    let code = '// 建议添加以下消息类型的处理:\n\n';

    // 1. 枚举定义
    code += '// 1. 在 CastMethod 枚举中添加:\n';
    unprocessed.forEach(type => {
      const enumName = this.getEnumName(type);
      code += `  ${enumName} = '${type}',\n`;
    });

    code += '\n// 2. 在 switch 语句中添加处理:\n';
    unprocessed.forEach(type => {
      const enumName = this.getEnumName(type);
      const decodeFuncName = this.getDecodeFunctionName(type);
      code += `
case CastMethod.${enumName}:
  message = ${decodeFuncName}(payload);
  data.method = CastMethod.${enumName};
  // TODO: 添加具体的数据提取逻辑
  break;
`;
    });

    code += '\n// 3. 确保导入了解码函数:\n';
    code += 'import {\n';
    unprocessed.forEach(type => {
      const decodeFuncName = this.getDecodeFunctionName(type);
      code += `  ${decodeFuncName},\n`;
    });
    code += "} from './model';\n";

    return code;
  }

  /**
   * 从消息类型生成枚举名称
   */
  private getEnumName(type: string): string {
    // WebcastChatMessage -> CHAT
    // WebcastGiftMessage -> GIFT
    return type
      .replace('Webcast', '')
      .replace('Message', '')
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .substring(1);
  }

  /**
   * 从消息类型生成解码函数名称
   */
  private getDecodeFunctionName(type: string): string {
    // WebcastChatMessage -> decodeChatMessage
    return 'decode' + type.replace('Webcast', '');
  }
}

// 创建全局实例（可选）
export const globalMessageDebugger = new MessageDebugger(false, 5);

// 在浏览器控制台中暴露调试器
if (typeof window !== 'undefined') {
  (window as any).messageDebugger = globalMessageDebugger;
}
