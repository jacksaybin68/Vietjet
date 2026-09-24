#!/usr/bin/env python3
"""
Script to remove dark mode CSS from tailwind.css
"""

import re

def remove_dark_mode_css(content):
    """Remove all .dark blocks and dark: classes from CSS"""
    
    # Pattern to match .dark { ... } blocks (with nested braces)
    # This regex matches .dark followed by optional whitespace, then { ... }
    dark_block_pattern = r'\/\* Dark mode tokens \*\/\s*.dark\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}'
    
    # Remove the dark mode tokens comment and block
    content = re.sub(dark_block_pattern, '', content, flags=re.DOTALL)
    
    # Pattern to match .dark body styles comment and block
    dark_body_pattern = r'\/\* Dark mode body styles \*\/\s*\{[^}]*\}'
    content = re.sub(dark_body_pattern, '', content, flags=re.DOTALL)
    
    # Remove individual .dark selectors
    # Match lines like: .dark .something { ... }
    content = re.sub(r'\n\s*.dark\s+[^{]+\s*\{', '', content)
    
    # Remove any remaining .dark class definitions
    # This handles cases like .dark .class { ... }
    content = re.sub(r'\.dark\s+[^{]+\s*\{[^}]*\}\s*', '', content)
    
    # Remove empty lines (more than 2 consecutive)
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    return content

def main():
    import sys
    import os
    
    backup_path = '/Users/user/Downloads/vietjet air/vietjetsim-main/src/styles/tailwind.css.backup'
    file_path = '/Users/user/Downloads/vietjet air/vietjetsim-main/src/styles/tailwind.css'
    
    with open(backup_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_lines = content.count('\n')
    print(f"Original file: {original_lines} lines")
    
    new_content = remove_dark_mode_css(content)
    
    new_lines = new_content.count('\n')
    print(f"New file: {new_lines} lines")
    print(f"Removed: {original_lines - new_lines} lines")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Dark mode CSS removed successfully")

if __name__ == '__main__':
    main()
