// Custom error classes for better error handling

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public details?: any) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, public retryAfter?: number) {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends ApiError {
  constructor(
    service: string,
    originalError?: Error
  ) {
    super(
      502,
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR'
    );
    this.name = 'ExternalServiceError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class TimeoutError extends ApiError {
  constructor(operation: string, timeoutMs: number) {
    super(
      408,
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR'
    );
    this.name = 'TimeoutError';
  }
}

// Error handler middleware
export function errorHandler(error: Error): {
  statusCode: number;
  body: {
    error: {
      message: string;
      code?: string;
      details?: any;
    };
  };
} {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          message: error.message,
          code: error.code,
          details: (error as any).details
        }
      }
    };
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  return {
    statusCode: 500,
    body: {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }
  };
}