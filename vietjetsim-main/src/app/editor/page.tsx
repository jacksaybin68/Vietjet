'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import Monaco Editor to avoid SSR window issues
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  initialContent: string;
  isDirty: boolean;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function VSCodeWebEditorPage() {
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src/app': true,
    'src/app/trang-chu': true,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);
  const [previewKey, setPreviewKey] = useState<number>(1);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showClaude, setShowClaude] = useState<boolean>(false);
  const [claudeInput, setClaudeInput] = useState('');
  const [claudeMessages, setClaudeMessages] = useState<ClaudeMessage[]>([]);
  const [isClaudeSending, setIsClaudeSending] = useState(false);
  const editorRef = useRef<any>(null);

  // Load File Tree
  const loadTree = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/editor/files?action=tree');
      const data = await res.json();
      if (data.ok) {
        setFileTree(data.tree);
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
    // Default open homepage file
    openFile('src/app/trang-chu/page.tsx', 'page.tsx');
  }, []);

  // Open a file
  const openFile = async (filePath: string, fileName: string) => {
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    try {
      const res = await fetch(`/api/editor/files?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.ok) {
        const newTab: OpenTab = {
          path: filePath,
          name: fileName,
          content: data.content,
          initialContent: data.content,
          isDirty: false,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabPath(filePath);
      }
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const closeTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const tabToClose = openTabs.find((t) => t.path === path);
    if (tabToClose?.isDirty) {
      if (!confirm(`Tệp ${tabToClose.name} có thay đổi chưa lưu. Bạn có chắc muốn đóng?`)) {
        return;
      }
    }

    const nextTabs = openTabs.filter((t) => t.path !== path);
    setOpenTabs(nextTabs);
    if (activeTabPath === path) {
      setActiveTabPath(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : '');
    }
  };

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  const askClaude = async () => {
    const prompt = claudeInput.trim();
    if (!prompt || isClaudeSending) return;

    const userMessage: ClaudeMessage = { role: 'user', content: prompt };
    setClaudeInput('');
    setClaudeMessages((prev) => [...prev, userMessage]);
    setIsClaudeSending(true);

    try {
      const response = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: activeTab ? `Tệp: ${activeTab.path}\n\n${activeTab.content}` : '',
          history: claudeMessages,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Claude API request failed');
      setClaudeMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      setClaudeMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? `Lỗi Claude: ${error.message}`
              : 'Không thể kết nối tới Claude.',
        },
      ]);
    } finally {
      setIsClaudeSending(false);
    }
  };

  // Handle editor content changes
  const handleContentChange = (value: string | undefined) => {
    if (value === undefined || !activeTab) return;
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.path === activeTabPath
          ? {
              ...t,
              content: value,
              isDirty: value !== t.initialContent,
            }
          : t
      )
    );
  };

  // Save current active file
  const saveCurrentFile = useCallback(async () => {
    if (!activeTab || isSaving) return;
    try {
      setIsSaving(true);
      const res = await fetch('/api/editor/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeTab.path,
          content: activeTab.content,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === activeTab.path
              ? {
                  ...t,
                  initialContent: t.content,
                  isDirty: false,
                }
              : t
          )
        );
        // Trigger live preview iframe refresh
        setPreviewKey((k) => k + 1);
      } else {
        alert(`Lưu thất bại: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu file: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, isSaving]);

  // Keyboard shortcut Cmd+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentFile]);

  // Determine Monaco language
  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.jsx') || fileName.endsWith('.js') || fileName.endsWith('.cjs'))
      return 'javascript';
    if (fileName.endsWith('.json')) return 'json';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Render tree node
  const renderTree = (items: FileItem[]) => {
    return items.map((item) => {
      if (
        searchTerm &&
        !item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        item.type === 'file'
      ) {
        return null;
      }

      if (item.type === 'directory') {
        const isExpanded = !!expandedFolders[item.path];
        return (
          <div key={item.path} style={{ marginLeft: '12px' }}>
            <div
              onClick={() => toggleFolder(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                borderRadius: '4px',
                color: '#CCCCCC',
                fontSize: '13px',
                userSelect: 'none',
              }}
              className="hover:bg-[#2A2D2E]"
            >
              <span style={{ fontSize: '10px', width: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
              <span style={{ color: '#E5A900' }}>📁</span>
              <span>{item.name}</span>
            </div>
            {isExpanded && item.children && renderTree(item.children)}
          </div>
        );
      }

      // File item
      const isActive = item.path === activeTabPath;
      const getFileIcon = (name: string) => {
        if (name.endsWith('.tsx') || name.endsWith('.ts')) return '🔷';
        if (name.endsWith('.css')) return '🎨';
        if (name.endsWith('.json')) return '🟨';
        if (name.endsWith('.svg') || name.endsWith('.png') || name.endsWith('.webp')) return '🖼️';
        if (name.endsWith('.md')) return '📝';
        return '📄';
      };

      return (
        <div
          key={item.path}
          onClick={() => openFile(item.path, item.name)}
          style={{
            marginLeft: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '13px',
            color: isActive ? '#FFFFFF' : '#969696',
            backgroundColor: isActive ? '#37373D' : 'transparent',
            userSelect: 'none',
          }}
          className="hover:bg-[#2A2D2E]"
        >
          <span>{getFileIcon(item.name)}</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.name}
          </span>
        </div>
      );
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#1E1E1E',
        color: '#CCCCCC',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Top Titlebar */}
      <div
        style={{
          height: '36px',
          backgroundColor: '#323233',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid #252526',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#E30613' }}>
            ✈️ Vietjet Air
          </span>
          <span style={{ fontSize: '12px', color: '#858585' }}>VS Code Web Studio</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            style={{
              background: showLivePreview ? '#E30613' : '#3C3C3C',
              color: '#FFF',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{showLivePreview ? '👁️ Đang Mở Live Preview' : '👁️ Mở Live Preview'}</span>
          </button>

          <button
            onClick={() => setShowClaude((isOpen) => !isOpen)}
            style={{
              background: showClaude ? '#D97706' : '#3C3C3C',
              color: '#FFF',
              border: '1px solid #5A5A5A',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✦ Claude
          </button>

          <button
            onClick={saveCurrentFile}
            style={{
              background: activeTab?.isDirty ? '#E30613' : '#0E639C',
              color: '#FFF',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>
              {isSaving ? '⏳ Đang lưu...' : activeTab?.isDirty ? '● Lưu File (Cmd+S)' : '✓ Đã Lưu'}
            </span>
          </button>

          <Link
            href="/trang-chu"
            target="_blank"
            style={{
              background: '#2D2D2D',
              color: '#CCCCCC',
              border: '1px solid #454545',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ↗ Mở Tab Riêng
          </Link>
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Activity Bar (Icons) */}
        <div
          style={{
            width: '48px',
            backgroundColor: '#333333',
            borderRight: '1px solid #252526',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            gap: '16px',
          }}
        >
          <div style={{ cursor: 'pointer', fontSize: '20px', color: '#FFFFFF' }} title="Explorer">
            📁
          </div>
          <div style={{ cursor: 'pointer', fontSize: '20px', color: '#858585' }} title="Search">
            🔍
          </div>
          <div
            style={{ cursor: 'pointer', fontSize: '20px', color: '#858585' }}
            title="Source Control"
          >
            🌿
          </div>
        </div>

        {/* Sidebar File Explorer */}
        <div
          style={{
            width: '260px',
            backgroundColor: '#252526',
            borderRight: '1px solid #1E1E1E',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#BBBBBB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>EXPLORER: VIETJET-APP</span>
            <span
              style={{ cursor: 'pointer', fontSize: '14px' }}
              onClick={loadTree}
              title="Làm mới"
            >
              ↻
            </span>
          </div>

          <div style={{ padding: '0 10px 8px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm tệp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#3C3C3C',
                border: '1px solid #3C3C3C',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#FFF',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {isLoading ? (
              <div style={{ padding: '16px', fontSize: '12px', color: '#858585' }}>
                Đang tải danh sách file...
              </div>
            ) : (
              renderTree(fileTree)
            )}
          </div>
        </div>

        {/* Code Editor Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#1E1E1E',
          }}
        >
          {/* Tabs Bar */}
          <div
            style={{
              height: '35px',
              backgroundColor: '#252526',
              display: 'flex',
              alignItems: 'center',
              overflowX: 'auto',
              borderBottom: '1px solid #1E1E1E',
            }}
          >
            {openTabs.map((tab) => {
              const isActive = tab.path === activeTabPath;
              return (
                <div
                  key={tab.path}
                  onClick={() => setActiveTabPath(tab.path)}
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 14px',
                    fontSize: '13px',
                    backgroundColor: isActive ? '#1E1E1E' : '#2D2D2D',
                    color: isActive ? '#FFFFFF' : '#969696',
                    borderRight: '1px solid #252526',
                    borderTop: isActive ? '2px solid #E30613' : '2px solid transparent',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <span>{tab.name}</span>
                  {tab.isDirty && (
                    <span style={{ color: '#E30613', fontSize: '14px', fontWeight: 'bold' }}>
                      ●
                    </span>
                  )}
                  <span
                    onClick={(e) => closeTab(e, tab.path)}
                    style={{
                      fontSize: '12px',
                      borderRadius: '4px',
                      padding: '0 2px',
                      marginLeft: '4px',
                    }}
                    className="hover:bg-[#444444]"
                  >
                    ✕
                  </span>
                </div>
              );
            })}
          </div>

          {/* Breadcrumb Bar */}
          {activeTab && (
            <div
              style={{
                height: '22px',
                backgroundColor: '#1E1E1E',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                color: '#858585',
                borderBottom: '1px solid #282828',
              }}
            >
              <span>vietjetsim &gt; {activeTab.path.replace(/\//g, ' > ')}</span>
            </div>
          )}

          {/* Monaco Editor Container */}
          <div style={{ flex: 1, position: 'relative' }}>
            {activeTab ? (
              <Editor
                height="100%"
                path={activeTab.path}
                language={getLanguage(activeTab.name)}
                value={activeTab.content}
                theme="vs-dark"
                onChange={handleContentChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                  });
                }}
                options={{
                  fontSize: 14,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#858585',
                }}
              >
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</span>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>
                  Chọn một tệp từ Explorer để chỉnh sửa
                </span>
                <span style={{ fontSize: '13px', marginTop: '6px' }}>
                  Nhấn Cmd+S để lưu tệp và cập nhật giao diện trực tiếp
                </span>
              </div>
            )}
          </div>
        </div>

        {showClaude && (
          <div
            style={{
              width: '340px',
              backgroundColor: '#252526',
              borderLeft: '1px solid #3C3C3C',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                borderBottom: '1px solid #3C3C3C',
                color: '#F3F4F6',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <span>✦ CLAUDE CODE ASSISTANT</span>
              <button
                onClick={() => setClaudeMessages([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
                title="Xóa hội thoại"
              >
                Xóa
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {claudeMessages.length === 0 && (
                <div style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: 1.5 }}>
                  Hỏi Claude về tệp đang mở, lỗi TypeScript hoặc cách cải thiện code.
                </div>
              )}
              {claudeMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    alignSelf: message.role === 'user' ? 'flex-end' : 'stretch',
                    maxWidth: '100%',
                  }}
                >
                  <div
                    style={{
                      color: message.role === 'user' ? '#FDE68A' : '#D1D5DB',
                      fontSize: '10px',
                      marginBottom: '3px',
                    }}
                  >
                    {message.role === 'user' ? 'Bạn' : 'Claude'}
                  </div>
                  <div
                    style={{
                      backgroundColor: message.role === 'user' ? '#5B4210' : '#1E1E1E',
                      color: '#E5E7EB',
                      borderRadius: '4px',
                      padding: '8px',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isClaudeSending && (
                <div style={{ color: '#D97706', fontSize: '12px' }}>Claude đang suy nghĩ...</div>
              )}
            </div>

            <div style={{ padding: '10px', borderTop: '1px solid #3C3C3C' }}>
              <textarea
                value={claudeInput}
                onChange={(event) => setClaudeInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    askClaude();
                  }
                }}
                placeholder={activeTab ? `Hỏi về ${activeTab.name}...` : 'Hỏi Claude...'}
                disabled={isClaudeSending}
                rows={3}
                style={{
                  width: '100%',
                  resize: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #454545',
                  borderRadius: '4px',
                  color: '#F3F4F6',
                  padding: '8px',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={askClaude}
                disabled={!claudeInput.trim() || isClaudeSending}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  backgroundColor: '#D97706',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '7px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: !claudeInput.trim() || isClaudeSending ? 0.5 : 1,
                }}
              >
                {isClaudeSending ? 'Đang gửi...' : 'Gửi cho Claude'}
              </button>
            </div>
          </div>
        )}

        {/* Live Preview Split Pane */}
        {showLivePreview && (
          <div
            style={{
              width: '48%',
              backgroundColor: '#0F1216',
              borderLeft: '2px solid #333333',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                height: '35px',
                backgroundColor: '#252526',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                borderBottom: '1px solid #1E1E1E',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFED00' }}>
                  🌐 Live Website:
                </span>
                <span style={{ fontSize: '12px', color: '#969696' }}>
                  http://localhost:4028/trang-chu
                </span>
              </div>
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#CCCCCC',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                title="Làm mới trang"
              >
                ↻
              </button>
            </div>

            <iframe
              key={previewKey}
              src="/trang-chu"
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#FFFFFF',
              }}
              title="Live Preview"
            />
          </div>
        )}
      </div>

      {/* VS Code Status Bar */}
      <div
        style={{
          height: '22px',
          backgroundColor: '#007ACC',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '11px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>🌿 main</span>
          <span>✓ 0 errors</span>
          {activeTab?.isDirty ? <span>● Có thay đổi chưa lưu</span> : <span>✓ Đã đồng bộ</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>{activeTab ? getLanguage(activeTab.name).toUpperCase() : 'TEXT'}</span>
          <span>⚡ Turbopack (4028)</span>
        </div>
      </div>
    </div>
  );
}
