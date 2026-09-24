#!/usr/bin/env python3
"""
Clean tailwind.css - remove all dark mode related code
"""

import re

def clean_tailwind_css():
    backup_path = '/Users/user/Downloads/vietjet air/vietjetsim-main/src/styles/tailwind.css.backup'
    file_path = '/Users/user/Downloads/vietjet air/vietjetsim-main/src/styles/tailwind.css'
    
    with open(backup_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    skip_until_closing_brace = False
    skip_next_empty = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Skip dark mode token block
        if stripped == '/* Dark mode tokens */':
            # Skip until we find the closing brace of .dark block
            i += 1
            while i < len(lines):
                if stripped == '}':
                    i += 1
                    break
                i += 1
            continue
        
        # Skip .dark selector blocks
        if stripped.startswith('.dark'):
            # Check if it's a selector with {
            if '{' in line:
                # This is a single-line block like .dark .something { ... }
                # Skip this line
                i += 1
                continue
            else:
                # Multi-line block, skip until closing brace
                i += 1
                brace_count = 0
                while i < len(lines):
                    if '{' in lines[i]:
                        brace_count += lines[i].count('{')
                    if '}' in lines[i]:
                        brace_count -= lines[i].count('}')
                    i += 1
                    if brace_count == 0:
                        break
                continue
        
        # Skip dark mode body styles comment and block
        if stripped == '/* Dark mode body styles */':
            i += 1
            while i < len(lines):
                if '{' in lines[i]:
                    brace_count = 1
                    i += 1
                    while i < len(lines) and brace_count > 0:
                        brace_count += lines[i].count('{')
                        brace_count -= lines[i].count('}')
                        i += 1
                    continue
                i += 1
                if stripped == '}' or not stripped:
                    break
            continue
        
        # Skip dark mode badge styles comment and following blocks
        if stripped == '/* Badge styles - Dark mode */':
            # Skip this comment and the next 4 .dark blocks
            i += 1
            dark_block_count = 0
            while i < len(lines) and dark_block_count < 4:
                if stripped.startswith('.dark'):
                    dark_block_count += 1
                    # Skip the block
                    if '{' in line:
                        brace_count = 1
                        i += 1
                        while i < len(lines) and brace_count > 0:
                            brace_count += lines[i].count('{')
                            brace_count -= lines[i].count('}')
                            i += 1
                        continue
                    else:
                        i += 1
                        brace_count = 0
                        while i < len(lines):
                            if '{' in lines[i]:
                                brace_count += lines[i].count('{')
                            if '}' in lines[i]:
                                brace_count -= lines[i].count('}')
                            i += 1
                            if brace_count == 0:
                                break
                        continue
                else:
                    i += 1
            continue
        
        # Keep the line
        new_lines.append(line)
        i += 1
    
    new_content = '\n'.join(new_lines)
    
    # Remove excessive empty lines
    new_content = re.sub(r'\n{4,}', '\n\n', new_content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Original: {len(lines)} lines")
    print(f"New: {len(new_lines)} lines")
    print(f"Removed: {len(lines) - len(new_lines)} lines")
    print("✅ Cleaned tailwind.css")

if __name__ == '__main__':
    clean_tailwind_css()
