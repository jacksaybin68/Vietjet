const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function replaceInFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(/if\s*\(error\s*\|\|\s*!response\)\s*return\s*response!?;/g, 'if (error) return response;');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed:', filePath);
  }
}

walkDir('c:\\Users\\tp685\\new\\Vietjet\\vietjetsim-main\\src\\app\\api\\admin', replaceInFile);
console.log('Done replacing.');
