# Development Documentation

This document contains essential information for advanced development on the `VietjetSim` project.

## 1. Build/Configuration Instructions

### Prerequisites
- Node.js v20+
- npm (Node Package Manager)
- Supabase project credentials

### Setup Steps
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    Copy the example environment file and configure it:
    ```bash
    cp .env.local.example .env.local
    ```
    Populate `.env.local` with your Supabase credentials:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3.  **Database Migration**:
    Run the SQL migrations located in `supabase/migrations/` in the Supabase SQL Editor.
4.  **Running the Server**:
    ```bash
    npm run dev
    ```
    The application will be accessible at [http://localhost:4028](http://localhost:4028).

## 2. Testing Information

### Configuration & Running Tests
This project uses **Vitest** as the test runner. 
- All tests are located in `src/test/`.
- To run the entire test suite, add a `"test": "vitest run"` script to `package.json` and run:
  ```bash
  npm run test
  ```
- To run a specific test file:
  ```bash
  npx vitest run src/test/csrf.test.ts
  ```

### Guidelines for New Tests
- Keep tests colocated with the logic being tested or inside `src/test/` for broader integration tests.
- Mock external dependencies like Supabase client when necessary.
- Focus on RLS policies and API security as these are critical.
- Use `vitest` assertions (`expect`).

### Simple Test Example
To verify your testing environment, create `src/test/demo.test.ts`:
```typescript
import { expect, test } from 'vitest';

test('environment verification', () => {
  expect(true).toBe(true);
});
```

## 3. Additional Development Information

### Code Style
- **TypeScript**: Strict mode is enabled.
- **Styling**: Tailwind CSS with custom Vietjet brand theme (`vj-` prefix for custom utilities).
- **Architecture**: Next.js App Router (Server-side rendering where applicable, client-side for dynamic interactions).
- **Environment**: Ensure `.env.local` is correctly configured for local development. Do not commit `.env.local`.

### Debugging
- Use `console.warn` and `console.error` for logging.
- Check Supabase RLS policies if data is not loading (most common cause for "empty results").
- Use `db:check` script (`npm run db:check`) to verify database connection settings.
