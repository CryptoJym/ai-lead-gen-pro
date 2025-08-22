// Test environment setup
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.DEFAULT_CLIENT_ID = 'test-client-id';
process.env.DAILY_RESEARCH_CAP_PER_TENANT = '50';
process.env.MAX_CONCURRENT_RESEARCH_JOBS = '3';
process.env.ENABLE_CACHE = 'true';
process.env.ENABLE_MOCK_MODE = 'true'; // Enable mock mode for testing
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
// Explicitly set REDIS_URL to 'memory' to use in-memory implementations
process.env.REDIS_URL = 'memory';