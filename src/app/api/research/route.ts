import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchOpportunities, runDeepResearch } from '@/services/research/engine';
import { errorHandler, ValidationError, RateLimitError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { ResearchRequest } from '@/types';

// Request validation schema
const ResearchRequestSchema = z.object({
  keywords: z.string().optional(),
  location: z.string().optional(),
  companyName: z.string().optional(),
  companyUrl: z.string().url().optional(),
  notes: z.string().optional(),
  clientId: z.string().uuid().optional(),
  userId: z.string().uuid().optional()
}).refine(
  data => (data.keywords && !data.companyName) || (!data.keywords && (data.companyName || data.companyUrl)),
  {
    message: 'Either keywords OR company information must be provided, not both'
  }
);

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = ResearchRequestSchema.safeParse(body);
    
    if (!validation.success) {
      throw new ValidationError(
        'Invalid request parameters',
        validation.error.flatten()
      );
    }
    
    const data = validation.data as ResearchRequest;
    
    // Check rate limits
    const clientId = data.clientId || 'anonymous';
    const rateLimitOk = await checkRateLimit(clientId);
    
    if (!rateLimitOk) {
      throw new RateLimitError(
        'Daily research limit exceeded. Please try again tomorrow.',
        86400 // 24 hours in seconds
      );
    }
    
    // Execute research based on request type
    let result;
    if (data.keywords && !data.companyName && !data.companyUrl) {
      // Opportunity search mode
      result = await searchOpportunities(data);
    } else {
      // Deep research mode
      result = await runDeepResearch(data);
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    const errorResponse = errorHandler(error as Error);
    return NextResponse.json(
      errorResponse.body,
      { status: errorResponse.statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'AI Lead Generation API',
    version: '2.0.0',
    endpoints: {
      research: {
        method: 'POST',
        path: '/api/research',
        description: 'Run AI-powered lead generation research'
      },
      status: {
        method: 'GET',
        path: '/api/status',
        description: 'Check API and rate limit status'
      }
    }
  });
}