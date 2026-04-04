/**
 * Mock Supabase Client for Development
 * 
 * This module provides a mock implementation of Supabase client
 * for use in development and testing environments where
 * Supabase credentials are not available.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: any | null }; error: Error | null }>;
    getUser: () => Promise<{ data: { user: any | null }; error: Error | null }>;
    signUp: (options: any) => Promise<{ data: { user: any; session: any }; error: Error | null }>;
    signInWithPassword: (options: any) => Promise<{ data: { user: any; session: any }; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    onAuthStateChange: (callback: (event: string, session: any | null) => void) => {
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

// Mock implementation
const mockClient: SupabaseClient = {
  auth: {
    getSession: async () => ({
      data: { session: null },
      error: null,
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
