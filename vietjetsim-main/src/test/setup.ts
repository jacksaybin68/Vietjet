import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterAll } from 'vitest';

// ─── Mock Environment Variables ──────────────────────────────────────────────

// Set environment variables directly
if (process.env.NODE_ENV !== 'test') {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true,
    enumerable: true,
  });
}
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long-for-testing';
process.env.JWT_REFRESH_SECRET =
  'test-jwt-refresh-secret-key-at-least-32-characters-long-for-testing';

// ─── Mock Next.js cookies() ─────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

// ─── Mock Next.js App Router ────────────────────────────────────────────────
// Components rendered in isolation (no <AppRouterContext> provider) throw
// "invariant expected app router to be mounted" from useRouter/usePathname.
// Tests exercise component markup, not navigation, so stub the router hooks.

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  };
});

// ─── Mock fetch ─────────────────────────────────────────────────────────────

global.fetch = vi.fn();

// ─── Mock IntersectionObserver ──────────────────────────────────────────────

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    private callback: IntersectionObserverCallback,
    private options?: IntersectionObserverInit
  ) {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
});

// ─── Mock ResizeObserver ─────────────────────────────────────────────────────

class MockResizeObserver implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

// ─── Mock Element.scrollIntoView ────────────────────────────────────────────
// jsdom does not implement it, and message panes (chat, timeline) call it on mount.

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// ─── Mock matchMedia ─────────────────────────────────────────────────────────

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// ─── Suppress console.error in tests ───────────────────────────────────────

const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress specific React warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
});
