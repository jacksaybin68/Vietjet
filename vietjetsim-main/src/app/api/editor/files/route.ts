import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

// Safe paths allowed to be browsed and edited
function getSafePath(relativePath: string): string | null {
  const resolved = path.resolve(PROJECT_ROOT, relativePath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
    return null;
  }
  return resolved;
}

// Recursively build file tree
function getFileTree(dir: string, baseDir: string = ''): any[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: any[] = [];

  for (const entry of entries) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === '.git' ||
      entry.name.startsWith('.DS_Store')
    ) {
      continue;
    }

    const relPath = path.join(baseDir, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children: getFileTree(fullPath, relPath),
      });
    } else {
      results.push({
        name: entry.name,
        path: relPath,
        type: 'file',
      });
    }
  }

  return results.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });
}

// GET: Read file or get directory tree
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const filePath = searchParams.get('path');

  try {
    if (action === 'tree') {
      const tree = getFileTree(PROJECT_ROOT);
      return NextResponse.json({ ok: true, tree });
    }

    if (filePath) {
      const safePath = getSafePath(filePath);
      if (!safePath || !fs.existsSync(safePath)) {
        return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
      }

      const stat = fs.statSync(safePath);
      if (stat.isDirectory()) {
        return NextResponse.json({ ok: false, error: 'Path is a directory' }, { status: 400 });
      }

      const content = fs.readFileSync(safePath, 'utf8');
      return NextResponse.json({ ok: true, content, path: filePath });
    }

    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// POST: Save file content
export async function POST(req: NextRequest) {
  try {
    const { path: filePath, content } = await req.json();
    if (!filePath || content === undefined) {
      return NextResponse.json({ ok: false, error: 'Missing path or content' }, { status: 400 });
    }

    const safePath = getSafePath(filePath);
    if (!safePath) {
      return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 });
    }

    fs.writeFileSync(safePath, content, 'utf8');
    return NextResponse.json({ ok: true, message: 'Saved successfully', path: filePath });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
