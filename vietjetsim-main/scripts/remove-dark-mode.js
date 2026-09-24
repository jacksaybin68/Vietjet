const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/styles/tailwind.css');
const backupPath = path.join(__dirname, '../src/styles/tailwind.css.backup');

// Đọc file
let content = fs.readFileSync(backupPath, 'utf8');

// Loại bỏ tất cả các khối .dark {...}
// Sử dụng regex để match .dark { ... } (bao gồm nested blocks)
function removeDarkBlocks(content) {
  // Match .dark followed by { ... } with nested braces
  const regex = /\.dark\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/gs;
  return content.replace(regex, '');
}

// Loại bỏ các line có .dark
function removeDarkLines(content) {
  const lines = content.split('\n');
  const filteredLines = lines.filter((line) => {
    // Giữ line nếu nó không chứa .dark (trừ trong comments)
    const trimmed = line.trim();

    // Skip empty lines and lines with only closing braces
    if (!trimmed || trimmed === '}' || trimmed === '},') {
      return true;
    }

    // Check if line contains .dark but not in a comment
    const hasDarkClass = /\.dark(?:\s|\{|\)|:)/.test(trimmed);
    const isComment =
      trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//');

    if (hasDarkClass && !isComment) {
      return false;
    }
    return true;
  });

  return filteredLines.join('\n');
}

// Loại bỏ các CSS variables cho dark mode
function removeDarkVariables(content) {
  const lines = content.split('\n');
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();

    // Loại bỏ các dòng có --dark- trong :root
    if (trimmed.includes('--dark-') && !trimmed.includes('/*')) {
      return false;
    }
    return true;
  });

  return filteredLines.join('\n');
}

console.log('Processing tailwind.css...');

// Áp dụng các filter
content = removeDarkBlocks(content);
content = removeDarkLines(content);
content = removeDarkVariables(content);

// Loại bỏ các dòng trống thừa
content = content.replace(/\n{3,}/g, '\n\n');

// Ghi file mới
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Dark mode CSS removed from tailwind.css');
console.log(`Original: ${fs.readFileSync(backupPath, 'utf8').split('\n').length} lines`);
console.log(`New: ${content.split('\n').length} lines`);
