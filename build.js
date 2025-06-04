#!/usr/bin/env node

/**
 * 简单的构建脚本
 * 将TypeScript文件编译为JavaScript
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始构建 AI术语解释器...');

// 检查是否安装了TypeScript
try {
  execSync('npx tsc --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ TypeScript未安装，请运行: npm install -g typescript');
  process.exit(1);
}

// TypeScript文件列表
const tsFiles = [
  'src/types/app.ts',
  'src/types/api.ts',
  'src/utils/storage.ts',
  'src/utils/i18n.ts',
  'src/utils/api.ts',
  'src/utils/models.ts',
  'src/background/background.ts',
  'src/content/content.ts',
  'src/popup/popup.ts',
  'src/fullscreen/fullscreen.ts'
];

// 编译每个TypeScript文件
tsFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  文件不存在: ${file}`);
    return;
  }
  
  const outputFile = file.replace('.ts', '.js');
  const outputDir = path.dirname(outputFile);
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    console.log(`📝 编译: ${file} -> ${outputFile}`);
    execSync(`npx tsc "${file}" --target es2020 --module es2020 --moduleResolution node --strict --outDir "${outputDir}"`, {
      stdio: 'pipe'
    });
    
    // 移动编译后的文件到正确位置
    const compiledFile = path.join(outputDir, path.basename(file).replace('.ts', '.js'));
    if (fs.existsSync(compiledFile) && compiledFile !== outputFile) {
      fs.renameSync(compiledFile, outputFile);
    }
    
  } catch (error) {
    console.error(`❌ 编译失败: ${file}`);
    console.error(error.message);
  }
});

// 复制必要的文件
const filesToCopy = [
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'src/popup/popup.html', dest: 'src/popup/popup.html' },
  { src: 'src/popup/popup.css', dest: 'src/popup/popup.css' },
  { src: 'src/fullscreen/fullscreen.html', dest: 'src/fullscreen/fullscreen.html' },
  { src: 'src/fullscreen/fullscreen.css', dest: 'src/fullscreen/fullscreen.css' }
];

console.log('📋 复制静态文件...');
filesToCopy.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`✅ 复制: ${src} -> ${dest}`);
  } else {
    console.warn(`⚠️  源文件不存在: ${src}`);
  }
});

// 创建images目录（如果不存在）
if (!fs.existsSync('images')) {
  fs.mkdirSync('images');
  console.log('📁 创建images目录');
}

console.log('✨ 构建完成！');
console.log('💡 提示：');
console.log('  - 请确保将图标文件放置在 images/ 目录中');
console.log('  - 图标文件名：icon16.png, icon32.png, icon48.png, icon128.png');
console.log('  - 在Chrome中加载扩展程序时，选择项目根目录'); 