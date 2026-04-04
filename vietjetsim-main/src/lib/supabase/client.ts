/**
 * Mock Supabase Client for Development
 * 
 * This module provides a mock implementation of Supabase client
 * for use in development and testing environments where
 * Supabase credentials are not available.
 */

export interface SupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: MockSession | null } }>;
    getUser: () => Promise<{ data: { user: MockUser | null }; error: Error | null }>;
    signUp: (options: SignUpOptions) => Promise<{ data: MockAuthData; error: Error | null }>;
    signInWithPassword: (options: SignInOptions) => Promise<{ data: MockAuthData; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    onAuthStateChange: (callback: (event: string, session: MockSession | null) => void) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
  };
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: any) => {
        single: () => Promise<{ data: any; error: Error | null }>;
        limit: (n: number) => Promise<{ data: any[]; error: Error | null }>;
      };
      order: (column: string, options?: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: any[]; error: Error | null }>;
      };
    };
    insert: (data: any) => Promise<{ data: any; error: Error | null }>;
    update: (data: any) => {
      eq: (column: string, value: any) => Promise<{ data: any; error: Error | null }>;
    };
    delete: () => {
      eq: (column: string, value: any) => Promise<{ data: any; error: Error | null }>;
    };
  };
}

interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: MockUser;
}

interface MockUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface SignUpOptions {
  email: string;
  password: string;
  options?: {
    data?: Record<string, any>;
    emailRedirectTo?: string;
  };
}

interface SignInOptions {
  email: string;
  password: string;
}

interface MockAuthData {
  user: MockUser | null;
  session: MockSession | null;
  error: Error | null;
}

// Mock implementation
const mockClient: SupabaseClient = {
  auth: {
    getSession: async () => ({
      data: { session: null },
    }),
    getUser: async () => ({
      data: { user: null },
      error: null,
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: null,
    }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (callback) => {
      callback('SIGNED_OUT', null);
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        limit: async () => ({ data: [], error: null }),
      }),
      order: () => ({
        limit: async () => ({ data: [], error: null }),
      }),
    }),
    insert: async () => ({ data: null, error: null }),
    update: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
    delete: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  }),
};

let clientInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  // In a real app, this would create a real Supabase client
  // For now, return the mock
  if (!clientInstance) {
    clientInstance = mockClient;
  }
  return clientInstance;
}

export type { SupabaseClient as Client };
