#!/usr/bin/env node

/**
 * Cross-platform build script for Chrome Extension
 * Creates a zip file ready for distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building Naukri Session Exporter Chrome Extension...\n');

const rootDir = __dirname;
const zipFile = path.join(rootDir, 'naukri-session-capture.zip');

// Remove old zip if exists
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
  console.log('🗑️  Removed old zip file');
}

// Files/directories to exclude
const excludePatterns = [
  '.git',
  '.github',
  'node_modules',
  'README.md',
  'build-extension.sh',
  'build-extension.ps1',
  'build.js',
  'package.json',
  'package-lock.json',
  '.DS_Store',
  'Thumbs.db',
  '*.zip'
];

// Check if zip command is available
const isWindows = process.platform === 'win32';
let zipCommand;

if (isWindows) {
  // Try PowerShell Compress-Archive
  try {
    const testFile = path.join(rootDir, 'manifest.json');
    execSync(`powershell -Command "Compress-Archive -Path '${testFile}' -DestinationPath '${path.join(rootDir, 'test.zip')}' -Force"`, { stdio: 'ignore' });
    fs.unlinkSync(path.join(rootDir, 'test.zip'));
    zipCommand = 'powershell';
  } catch (e) {
    console.error('❌ Error: PowerShell Compress-Archive not available');
    console.log('💡 Please use build-extension.ps1 instead');
    process.exit(1);
  }
} else {
  // Try zip command (Unix/Mac)
  try {
    execSync('which zip', { stdio: 'ignore' });
    zipCommand = 'zip';
  } catch (e) {
    console.error('❌ Error: zip command not found');
    console.log('💡 Please install zip or use build-extension.sh');
    process.exit(1);
  }
}

// Get all files to include
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Check if should be excluded
    const shouldExclude = excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file) || regex.test(filePath);
      }
      return file === pattern || filePath.includes(pattern);
    });

    if (shouldExclude) {
      return;
    }

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const filesToZip = getAllFiles(rootDir);

if (zipCommand === 'powershell') {
  // Use PowerShell Compress-Archive
  const filesArg = filesToZip.map(f => `'${f.replace(/'/g, "''")}'`).join(',');
  const command = `powershell -Command "$files = @(${filesArg}); Compress-Archive -Path $files -DestinationPath '${zipFile.replace(/'/g, "''")}' -Force"`;
  
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Error creating zip file');
    process.exit(1);
  }
} else {
  // Use zip command
  const relativeFiles = filesToZip.map(f => path.relative(rootDir, f));
  const command = `zip -r "${zipFile}" ${relativeFiles.map(f => `"${f}"`).join(' ')}`;
  
  try {
    execSync(command, { cwd: rootDir, stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Error creating zip file');
    process.exit(1);
  }
}

console.log('\n✅ Extension built successfully!');
console.log(`📦 Output: ${zipFile}\n`);
console.log('📝 Next steps:');
console.log('   1. Load the extension in Chrome: chrome://extensions/');
console.log('   2. Enable Developer mode');
console.log('   3. Click \'Load unpacked\' and select this directory');
console.log('   OR');
console.log('   1. Distribute naukri-session-capture.zip to users');
console.log('   2. Users should extract and load in Chrome\n');

