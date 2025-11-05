import { NextRequest } from 'next/server';
import { AuthenticationError, AuthorizationError } from '../errors';

/**
 * Authentication middleware for API routes
 * Validates API keys or bearer tokens
 */

export interface AuthContext {
  clientId: string;
  userId?: string;
  role?: 'admin' | 'user';
}

/**
 * Extract client ID from various sources
 * Priority: X-Client-ID header > API key > Bearer token > anonymous
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext> {
  // Check for explicit client ID header (for testing/development)
  const clientIdHeader = request.headers.get('X-Client-ID');
  if (clientIdHeader) {
    return {
      clientId: clientIdHeader,
      role: 'user'
    };
  }

  // Check for API key in header
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) {
    const clientId = await validateApiKey(apiKey);
    if (clientId) {
      return {
        clientId,
        role: 'user'
      };
    }
  }

  // Check for Bearer token
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const context = await validateBearerToken(token);
    if (context) {
      return context;
    }
  }

  // In development mode, allow anonymous access
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS === 'true') {
    return {
      clientId: process.env.DEFAULT_CLIENT_ID || 'anonymous',
      role: 'user'
    };
  }

  throw new AuthenticationError('Authentication required. Provide X-API-Key or Authorization header.');
}

/**
 * Validate API key and return client ID
 * In production, this would query the database
 */
async function validateApiKey(apiKey: string): Promise<string | null> {
  // For now, check against environment variable
  // In production, this should query the database
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // If no API key configured, accept any key in development
    if (process.env.NODE_ENV === 'development') {
      return process.env.DEFAULT_CLIENT_ID || 'dev-client';
    }
    return null;
  }

  if (apiKey === validApiKey) {
    return process.env.DEFAULT_CLIENT_ID || 'default-client';
  }

  // TODO: In production, query database:
  // const client = await prisma.client.findUnique({
  //   where: { apiKey },
  //   select: { id: true, isActive: true }
  // });
  // if (client && client.isActive) {
  //   return client.id;
  // }

  return null;
}

/**
 * Validate Bearer token (JWT) and extract user context
 * In production, this would verify JWT signature
 */
async function validateBearerToken(token: string): Promise<AuthContext | null> {
  // For now, accept a simple token format
  // In production, this should use JWT verification

  if (process.env.NODE_ENV === 'development') {
    // In dev mode, accept simple tokens like "user:clientId:userId"
    const parts = token.split(':');
    if (parts.length >= 2) {
      return {
        clientId: parts[1],
        userId: parts[2],
        role: parts[0] as 'admin' | 'user'
      };
    }
  }

  // TODO: In production, verify JWT:
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   return {
  //     clientId: decoded.clientId,
  //     userId: decoded.userId,
  //     role: decoded.role
  //   };
  // } catch (error) {
  //   return null;
  // }

  return null;
}

/**
 * Require admin role
 */
export function requireAdmin(context: AuthContext): void {
  if (context.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
}

/**
 * Check if user belongs to client
 */
export function requireClientAccess(context: AuthContext, resourceClientId: string): void {
  if (context.role !== 'admin' && context.clientId !== resourceClientId) {
    throw new AuthorizationError('Access denied to this resource');
  }
}
