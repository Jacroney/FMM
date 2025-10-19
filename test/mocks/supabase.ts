import { vi } from 'vitest';

export const createMockSupabaseClient = () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-access-token',
          user: { id: 'test-user-id' }
        }
      },
      error: null
    }),
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' }
      },
      error: null
    })
  },
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    then: vi.fn((callback) => Promise.resolve().then(() => callback({ data: [], error: null })))
  })),
  rpc: vi.fn().mockResolvedValue({ data: [], error: null })
});

// Mock for vi.mock('@supabase/supabase-js')
export const mockSupabase = createMockSupabaseClient();
