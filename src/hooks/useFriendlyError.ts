/**
 * Friendly error helper - maps common Supabase/DB error codes to user-friendly messages.
 * Use this to provide consistent, understandable error feedback across the app.
 */

interface FriendlyErrorOptions {
  /** Context-specific messages for certain error codes */
  contextMessages?: Partial<Record<string, string>>;
  /** Fallback message if no mapping found */
  fallback?: string;
}

interface ParsedError {
  message: string;
  isPermissionError: boolean;
  isDuplicateError: boolean;
  isNetworkError: boolean;
  originalCode?: string;
}

const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  // PostgreSQL / RLS errors
  "42501": "You don't have permission to do this.",
  "42503": "You don't have permission to do this.",
  "PGRST301": "You don't have permission to do this.",
  
  // Duplicate / Unique constraint
  "23505": "This already exists.",
  "23503": "This references data that doesn't exist.",
  "23502": "Required information is missing.",
  
  // Network errors
  "NETWORK_ERROR": "Network error. Please check your connection and try again.",
  "FETCH_ERROR": "Network error. Please check your connection and try again.",
  "TIMEOUT": "Request timed out. Please try again.",
  
  // Auth errors
  "INVALID_CREDENTIALS": "Invalid email or password.",
  "USER_NOT_FOUND": "User not found.",
  "EMAIL_NOT_CONFIRMED": "Please confirm your email first.",
  
  // Generic
  "UNKNOWN": "Something went wrong. Please try again.",
};

/**
 * Parse a Supabase error and return a user-friendly message
 */
export function parseFriendlyError(
  error: unknown,
  options: FriendlyErrorOptions = {}
): ParsedError {
  const { contextMessages = {}, fallback = "Something went wrong. Please try again." } = options;

  // Handle null/undefined
  if (!error) {
    return {
      message: fallback,
      isPermissionError: false,
      isDuplicateError: false,
      isNetworkError: false,
    };
  }

  // Extract error details
  let code: string | undefined;
  let message = "";

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
    // Check for Supabase error structure
    const anyError = error as any;
    code = anyError.code || anyError.status || anyError.statusCode;
  } else if (typeof error === "object") {
    const obj = error as Record<string, any>;
    code = obj.code || obj.status || obj.statusCode || obj.error_code;
    message = obj.message || obj.error_description || obj.error || "";
  }

  // Detect network errors
  const isNetworkError =
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("fetch") ||
    message.toLowerCase().includes("failed to fetch") ||
    message.toLowerCase().includes("networkerror") ||
    code === "NETWORK_ERROR" ||
    code === "FETCH_ERROR";

  if (isNetworkError) {
    return {
      message: DEFAULT_ERROR_MESSAGES.NETWORK_ERROR,
      isPermissionError: false,
      isDuplicateError: false,
      isNetworkError: true,
      originalCode: code,
    };
  }

  // Detect permission errors
  const isPermissionError =
    code === "42501" ||
    code === "42503" ||
    code === "PGRST301" ||
    message.toLowerCase().includes("permission") ||
    message.toLowerCase().includes("policy") ||
    message.toLowerCase().includes("denied") ||
    message.toLowerCase().includes("unauthorized");

  // Detect duplicate errors
  const isDuplicateError =
    code === "23505" ||
    message.toLowerCase().includes("duplicate") ||
    message.toLowerCase().includes("already exists") ||
    message.toLowerCase().includes("unique constraint");

  // Get friendly message
  let friendlyMessage: string;

  // First check context-specific messages
  if (code && contextMessages[code]) {
    friendlyMessage = contextMessages[code]!;
  }
  // Then check default messages
  else if (code && DEFAULT_ERROR_MESSAGES[code]) {
    friendlyMessage = DEFAULT_ERROR_MESSAGES[code];
  }
  // Check for policy-related messages
  else if (isPermissionError) {
    friendlyMessage = DEFAULT_ERROR_MESSAGES["42501"];
  }
  // Check for duplicate
  else if (isDuplicateError) {
    friendlyMessage = DEFAULT_ERROR_MESSAGES["23505"];
  }
  // Fallback
  else {
    friendlyMessage = fallback;
  }

  return {
    message: friendlyMessage,
    isPermissionError,
    isDuplicateError,
    isNetworkError,
    originalCode: code,
  };
}

/**
 * Hook version for React components
 */
export function useFriendlyError() {
  return {
    parse: parseFriendlyError,
    
    /**
     * Get error message for toast display
     */
    getToastMessage: (error: unknown, context?: FriendlyErrorOptions) => {
      return parseFriendlyError(error, context).message;
    },
    
    /**
     * Check if error is a permission error (useful for UI hints)
     */
    isPermissionError: (error: unknown) => {
      return parseFriendlyError(error).isPermissionError;
    },
    
    /**
     * Check if error is a duplicate/already exists error
     */
    isDuplicateError: (error: unknown) => {
      return parseFriendlyError(error).isDuplicateError;
    },
  };
}
