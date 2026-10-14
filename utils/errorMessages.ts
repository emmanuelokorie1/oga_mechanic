// Secure error messages without information disclosure
export const getErrorMessage = (error: any, context?: string): string => {
  // Handle throttling errors first
  if (error?.response?.status === 429 || error?.response?.data?.detail?.includes('throttled')) {
    const detail = error?.response?.data?.detail;
    const waitTimeMatch = detail?.match(/(\d+)\s*seconds?/i);
    const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;
    return `Too many requests. Please wait ${waitTime} seconds before trying again.`;
  }

  // Handle user-friendly message from axios interceptor
  if (error?.userMessage) {
    return error.userMessage;
  }

  // Network errors
  if (error?.message === 'Network Error' || !error?.response) {
    return 'Unable to connect. Please check your internet connection.';
  }
  
  if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // HTTP Status codes - Generic messages to avoid information disclosure
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please sign in again.';
      case 403:
        return 'Access denied. You don\'t have permission for this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timeout. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
  
  // API-specific error messages - Sanitized to avoid information disclosure
  if (error.response?.data?.message) {
    const message = error.response.data.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('invalid credentials') || message.includes('wrong password')) {
      return 'Invalid login credentials. Please check your email and password.';
    }
    
    if (message.includes('user not found') || message.includes('email not found')) {
      return 'No account found with this email address.';
    }
    
    if (message.includes('account locked') || message.includes('account disabled')) {
      return 'Account is temporarily locked. Please contact support.';
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    
    // Generic fallback for API messages
    return 'An error occurred. Please try again.';
  }
  
  // Generic error messages based on context
  switch (context) {
    case 'login':
      return 'Login failed. Please check your credentials and try again.';
    case 'register':
      return 'Registration failed. Please check your information and try again.';
    case 'profile':
      return 'Profile update failed. Please try again.';
    case 'payment':
      return 'Payment failed. Please check your payment information.';
    case 'upload':
      return 'File upload failed. Please try again.';
    case 'network':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

// Success messages based on context
export const getSuccessMessage = (context: string): string => {
  switch (context) {
    case 'cart_add':
      return 'Item added to cart successfully';
    case 'cart_remove':
      return 'Item removed from cart';
    case 'cart_update':
      return 'Cart updated successfully';
    case 'cart_clear':
      return 'Cart cleared successfully';
    default:
      return 'Operation successful';
  }
};

// Secure error logging without sensitive information
export const logErrorSecurely = (error: any, context: string = 'general'): void => {
  try {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      type: error?.name || 'Unknown',
      code: error?.code || 'UNKNOWN',
      status: error?.response?.status || null,
      message: getErrorMessage(error, context),
      // Don't log sensitive information
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    };
    
    console.error('Secure Error Log:', errorInfo);
    
    // In production, you might want to send this to a secure logging service
    // that doesn't store sensitive information
  } catch (logError) {
    console.error('Failed to log error securely:', logError);
  }
};

// Error categories for better handling
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

// Get error category for better error handling
export const getErrorCategory = (error: any): ErrorCategory => {
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return ErrorCategory.NETWORK;
  }
  
  if (error.response?.status === 401) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (error.response?.status === 403) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  if (error.response?.status === 400) {
    return ErrorCategory.VALIDATION;
  }
  
  if (error.response?.status >= 500) {
    return ErrorCategory.SERVER;
  }
  
  if (error.response?.status >= 400) {
    return ErrorCategory.CLIENT;
  }
  
  return ErrorCategory.UNKNOWN;
};

// User-friendly error messages by category
export const getCategoryErrorMessage = (category: ErrorCategory): string => {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection problem. Please check your internet connection.';
    case ErrorCategory.AUTHENTICATION:
      return 'Please sign in to continue.';
    case ErrorCategory.AUTHORIZATION:
      return 'You don\'t have permission for this action.';
    case ErrorCategory.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorCategory.SERVER:
      return 'Server error. Please try again later.';
    case ErrorCategory.CLIENT:
      return 'Invalid request. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
};

// Retry logic based on error category
export const shouldRetry = (error: any, attemptCount: number): boolean => {
  const category = getErrorCategory(error);
  const maxRetries = 3;
  
  if (attemptCount >= maxRetries) {
    return false;
  }
  
  switch (category) {
    case ErrorCategory.NETWORK:
    case ErrorCategory.SERVER:
      return true; // Retry network and server errors
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
    case ErrorCategory.VALIDATION:
      return false; // Don't retry auth, authorization, or validation errors
    default:
      return attemptCount < 2; // Retry unknown errors up to 2 times
  }
};

// Get retry delay based on error category and attempt count
export const getRetryDelay = (error: any, attemptCount: number): number => {
  const category = getErrorCategory(error);
  const baseDelay = 1000; // 1 second
  
  switch (category) {
    case ErrorCategory.NETWORK:
      return baseDelay * Math.pow(2, attemptCount); // Exponential backoff
    case ErrorCategory.SERVER:
      return baseDelay * (attemptCount + 1); // Linear backoff
    default:
      return baseDelay;
  }
};

/**
 * Hardened API error extractor that handles various response formats 
 * (Django, Custom, nested objects, arrays) and maps technical terms to 
 * user-friendly ones.
 */
export const getApiErrorMessage = (error: any, context: string = 'general'): string => {
  const apiData = error?.response?.data;
  let rawMessage = '';

  // 1. Extract raw message from various common API patterns
  if (apiData?.message) {
    if (typeof apiData.message === 'string') {
      rawMessage = apiData.message;
    } else if (typeof apiData.message === 'object') {
      const values = Object.values(apiData.message);
      if (values.length > 0) {
        const firstVal: any = values[0];
        rawMessage = Array.isArray(firstVal) ? String(firstVal[0]) : String(firstVal);
      }
    }
  } else if (apiData?.error) {
    if (typeof apiData.error === 'string') {
      rawMessage = apiData.error;
    } else if (typeof apiData.error === 'object') {
      const values = Object.values(apiData.error);
      if (values.length > 0) {
        const firstVal: any = values[0];
        rawMessage = Array.isArray(firstVal) ? String(firstVal[0]) : String(firstVal);
      }
    }
  } else if (apiData?.detail && typeof apiData.detail === 'string') {
    rawMessage = apiData.detail;
  } else if (apiData?.non_field_errors) {
    rawMessage = Array.isArray(apiData.non_field_errors) ? String(apiData.non_field_errors[0]) : String(apiData.non_field_errors);
  } else if (apiData?.data?.message || apiData?.data?.error) {
    rawMessage = apiData.data.message || apiData.data.error;
  } else if (apiData && typeof apiData === 'object' && !Array.isArray(apiData)) {
    // Check for first field error object: { field: ["Error description"] }
    const ignoredKeys = new Set(['status', 'requestType', 'requestTime', 'referenceId', 'code']);
    const keys = Object.keys(apiData).filter((k) => !ignoredKeys.has(k));
    if (keys.length > 0) {
      const val = apiData[keys[0]];
      if (Array.isArray(val) && val.length > 0) {
        rawMessage = String(val[0]);
      } else if (typeof val === 'string') {
        rawMessage = val;
      }
    }
  } else if (typeof apiData === 'string') {
    rawMessage = apiData;
  }

  // 2. Map technical strings to user-friendly ones
  if (rawMessage) {
    const technicalToFriendly: Record<string, string> = {
      "Either 'service_categories' (IDs) or 'service_type' (name) must be provided.": "Please ensure all service details are completed before proceeding.",
      "Authentication credentials were not provided.": "Your session has expired. Please log in again.",
      "You do not have permission to perform this action.": "You are not authorized to perform this action.",
      "Method \"PATCH\" not allowed.": "Operation not supported. Please try again later.",
      "Object not found.": "The requested item could not be found.",
      "This field is required.": "Required information is missing.",
      "Not found.": "The requested resource was not found.",
    };

    // Check for exact matches or partial inclusions
    for (const [tech, friendly] of Object.entries(technicalToFriendly)) {
      if (rawMessage === tech || rawMessage.includes(tech)) {
        return friendly;
      }
    }

    // If message is technical snake_case token, clean it up cleanly
    if (rawMessage.length < 100 && /^[a-z_]+$/i.test(rawMessage.trim())) {
      return rawMessage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return rawMessage;
  }

  // 3. Fallback to global handler
  return getErrorMessage(error, context);
};