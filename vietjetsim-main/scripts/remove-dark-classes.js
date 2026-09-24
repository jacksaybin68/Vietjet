const fs = require('fs');
const path = require('path');

// Function to remove dark: classes from a string
function removeDarkClasses(content) {
  // Replace dark:class with just class
  // Pattern: dark:text-xxx -> remove the dark: part
  // We need to be careful not to match things like "dark" in strings

  // Remove dark: prefix in className strings
  // This regex matches dark: followed by any characters until a space or }
  const regex = /dark:([a-zA-Z0-9_-]+)/g;

  return content.replace(regex, '');
}

// Function to process all files in a directory
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (
      stat.isFile() &&
      (file.endsWith('.tsx') ||
        file.endsWith('.ts') ||
        file.endsWith('.jsx') ||
        file.endsWith('.js'))
    ) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasDarkClass = content.includes('dark:');

      if (hasDarkClass) {
        const newContent = removeDarkClasses(content);

        // Only write if content changed
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`✅ Processed: ${filePath}`);
        }
      }
    }
  }
}

console.log('Removing dark: classes from source files...');

const srcPath = path.join(__dirname, '../src');
processDirectory(srcPath);

console.log('✅ Dark classes removal complete!');
