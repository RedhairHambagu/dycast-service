#!/usr/bin/env node

/**
 * 密码哈希生成工具
 * 用于生成安全的 salt 和 hash 值，配置到 docker-compose.yml 中
 *
 * 使用方法：
 * node scripts/generate-hash.js <password>
 *
 * 示例：
 * node scripts/generate-hash.js mypassword123
 */

import crypto from 'crypto';

function generateSalt(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

function hashPassword(password, salt) {
  // 使用 PBKDF2 算法，与 authService.ts 保持一致
  const iterations = 1000;
  const keylen = 32; // 256 bits
  const digest = 'sha256';

  return crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
}

function main() {
  const password = process.argv[2];

  if (!password) {
    console.error('错误：请提供密码作为参数');
    console.log('\n用法：');
    console.log('  node scripts/generate-hash.js <password>');
    console.log('\n示例：');
    console.log('  node scripts/generate-hash.js mypassword123');
    process.exit(1);
  }

  console.log('正在生成安全的密码哈希...\n');

  const salt = generateSalt(16);
  const hash = hashPassword(password, salt);

  console.log('✅ 生成成功！');
  console.log('\n' + '='.repeat(60));
  console.log('配置信息：');
  console.log('='.repeat(60));
  console.log(`VITE_ADMIN_SALT=${salt}`);
  console.log(`VITE_ADMIN_HASH=${hash}`);
  console.log('='.repeat(60));

  console.log('\n📋 配置步骤：');
  console.log('1. 将上述两个值复制到您的 .env 文件中');
  console.log('2. 或者在 docker-compose.yml 的 environment 部分配置');
  console.log('\n🔒 安全提示：');
  console.log('- 请妥善保管这些值，不要泄露给第三方');
  console.log('- salt 和 hash 不会显示在构建产物中');
  console.log('- 建议定期更换密码\n');
}

main();
