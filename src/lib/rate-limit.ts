import { Redis } from 'ioredis';
import { MemoryRateLimiter } from './rate-limit/memory-rate-limit';

// Use Redis if available, otherwise fall back to in-memory rate limiter
let rateLimiter: Redis | MemoryRateLimiter;

if (process.env.REDIS_URL && process.env.REDIS_URL !== 'memory') {
  try {
    rateLimiter = new Redis(process.env.REDIS_URL);
  } catch (error) {
    console.log('Redis connection failed, falling back to in-memory rate limiter');
    rateLimiter = new MemoryRateLimiter();
  }
} else {
  rateLimiter = new MemoryRateLimiter();
}

// Rate limit configuration
const DAILY_LIMIT = parseInt(process.env.DAILY_RESEARCH_CAP_PER_TENANT || '50');
const CONCURRENT_LIMIT = parseInt(process.env.MAX_CONCURRENT_RESEARCH_JOBS || '3');

export async function checkRateLimit(clientId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `rate:daily:${clientId}:${today}`;
  const concurrentKey = `rate:concurrent:${clientId}`;
  
  try {
    // Check daily limit
    const dailyCount = await rateLimiter.incr(dailyKey);
    if (dailyCount === 1) {
      // First request of the day, set expiry
      await rateLimiter.expire(dailyKey, 86400); // 24 hours
    }
    
    if (dailyCount > DAILY_LIMIT) {
      await rateLimiter.decr(dailyKey); // Revert increment
      return false;
    }
    
    // Check concurrent limit
    const concurrentCount = await rateLimiter.get(concurrentKey);
    if (concurrentCount && parseInt(concurrentCount) >= CONCURRENT_LIMIT) {
      await rateLimiter.decr(dailyKey); // Revert daily increment
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is down
    return true;
  }
}

export async function incrementConcurrent(clientId: string): Promise<void> {
  const concurrentKey = `rate:concurrent:${clientId}`;
  await rateLimiter.incr(concurrentKey);
  // Set expiry in case of orphaned keys
  await rateLimiter.expire(concurrentKey, 3600); // 1 hour
}

export async function decrementConcurrent(clientId: string): Promise<void> {
  const concurrentKey = `rate:concurrent:${clientId}`;
  const count = await rateLimiter.decr(concurrentKey);
  if (count <= 0) {
    await rateLimiter.del(concurrentKey);
  }
}

export async function getRateLimitStatus(clientId: string): Promise<{
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  concurrentUsed: number;
  concurrentLimit: number;
  resetAt: string;
}> {
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `rate:daily:${clientId}:${today}`;
  const concurrentKey = `rate:concurrent:${clientId}`;
  
  const [dailyUsed, concurrentUsed] = await Promise.all([
    rateLimiter.get(dailyKey).then(val => parseInt(val || '0')),
    rateLimiter.get(concurrentKey).then(val => parseInt(val || '0'))
  ]);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  return {
    dailyUsed,
    dailyLimit: DAILY_LIMIT,
    dailyRemaining: Math.max(0, DAILY_LIMIT - dailyUsed),
    concurrentUsed,
    concurrentLimit: CONCURRENT_LIMIT,
    resetAt: tomorrow.toISOString()
  };
}