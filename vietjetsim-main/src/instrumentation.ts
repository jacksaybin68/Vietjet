/**
 * Runs once when a Next.js server instance starts, before it serves requests.
 *
 * Auth secrets are read lazily by `@/lib/auth` (so `next build` can load route
 * modules without them), which means a missing secret would otherwise only
 * surface as a 500 on the first login attempt. Validate them here instead so a
 * misconfigured deployment fails fast and loudly at startup.
 */
export async function register() {
  // Only the Node.js runtime has the deployment environment; the Edge bundle
  // gets its secrets inlined at build time instead.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { assertAuthSecretsConfigured } = await import('@/lib/auth');
  assertAuthSecretsConfigured();
}
