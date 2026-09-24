#!/usr/bin/env python3
"""
Final cleaning - remove all .dark selectors and dark mode blocks
"""

import re

def clean_file():
    file_path = '/Users/user/Downloads/vietjet air/vietjetsim-main/src/styles/tailwind.css'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    in_dark_block = False
    
    for line in lines:
        stripped = line.strip()
        
        # Skip dark mode comments
        if stripped in ['/* Dark mode tokens */', '/* Dark mode body styles */', '/* Badge styles - Dark mode */']:
            in_dark_block = True
            continue
        
        # Skip .dark selector lines
        if stripped.startswith('.dark') or (in_dark_block and stripped.startswith('/*')):
            continue
        
        # If we're in a dark block and see a line with only }, end the block
        if in_dark_block and stripped == '}':
            in_dark_block = False
            continue
        
        # If we're in a dark block, skip
        if in_dark_block:
            continue
        
        # Keep the line
        new_lines.append(line)
    
    new_content = '\n'.join(new_lines)
    
    # Remove excessive empty lines
    new_content = re.sub(r'\n{4,}', '\n\n', new_content)
    
    # Also remove lines that only have CSS variables with dark in the name
    # These are only used in dark mode
    lines2 = new_content.split('\n')
    final_lines = []
    for line in lines2:
        stripped = line.strip()
        # Skip CSS variables that are only used in dark mode
        if stripped.startswith('--dark-') or stripped.startswith('--vj-red-dark') or stripped.startswith('--accent-dark') or stripped.startswith('--primary-dark'):
            continue
        final_lines.append(line)
    
    final_content = '\n'.join(final_lines)
    final_content = re.sub(r'\n{4,}', '\n\n', final_content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"✅ Cleaned tailwind.css")
    print(f"Original: {len(lines)} lines")
    print(f"Final: {len(final_lines)} lines")

if __name__ == '__main__':
    clean_file()
