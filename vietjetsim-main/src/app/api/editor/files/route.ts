import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyAdminRequest } from '@/lib/admin-auth';

const PROJECT_ROOT = path.resolve(process.cwd());

// Files/dirs the editor must never read or write.
const IGNORED_NAMES = new Set(['node_modules', '.next', '.git', '.env', '.env.local']);
const SENSITIVE_PATTERNS = [
  /^\.env($|\.)/,
  /(^|\/)\.git($|\/)/,
  /\.pem$/,
  /\.key$/,
  /(^|\/)secrets?($|\.)/i,
];

function isSensitive(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));
}

// Resolve `relativePath` inside the project root, rejecting traversal and
// secret-bearing files (env files, keys, .git, …).
function getSafePath(relativePath: string): string | null {
  if (!relativePath || isSensitive(relativePath)) return null;

  const resolved = path.resolve(PROJECT_ROOT, relativePath);
  const rootWithSep = PROJECT_ROOT + path.sep;
  if (resolved !== PROJECT_ROOT && !resolved.startsWith(rootWithSep)) return null;

  return resolved;
}

// Recursively build file tree
function getFileTree(dir: string, baseDir: string = ''): any[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: any[] = [];

  for (const entry of entries) {
    if (
      IGNORED_NAMES.has(entry.name) ||
      entry.name.startsWith('.DS_Store') ||
      isSensitive(path.join(baseDir, entry.name))
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
  const { error, response } = await verifyAdminRequest(req, 'system:config');
  if (error) return response;

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
  const { error, response } = await verifyAdminRequest(req, 'system:config');
  if (error) return response;

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
