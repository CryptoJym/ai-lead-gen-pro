// Jest setup file
import '@testing-library/jest-dom';

// Mock external services
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: [], error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      update: jest.fn().mockResolvedValue({ data: [], error: null }),
      delete: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
});

// Suppress console errors in tests unless explicitly testing error cases
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});