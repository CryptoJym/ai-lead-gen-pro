import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStatus, getCacheStats } from '@/lib';

export async function GET(request: NextRequest) {
  try {
    // Get client ID from header
    const clientId = request.headers.get('X-Client-ID') || 'anonymous';
    
    // Get rate limit status
    const rateLimitStatus = await getRateLimitStatus(clientId);
    
    // Get cache statistics
    const cacheStats = await getCacheStats();
    
    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      rateLimit: rateLimitStatus,
      cache: cacheStats,
      health: {
        api: 'healthy',
        cache: process.env.REDIS_URL ? 'redis' : 'in-memory',
        database: 'healthy'
      }
    });
  } catch (error) {
    console.error('Status check failed:', error);
    
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      error: 'Unable to retrieve full status'
    }, { status: 503 });
  }
}