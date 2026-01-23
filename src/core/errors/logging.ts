/**
 * Safe Error Logging Utility
 * 
 * Logs errors to console while redacting sensitive information.
 * Never logs tokens, API keys, or other secrets.
 */

// Patterns to redact from error messages and context
const SENSITIVE_PATTERNS = [
  /access_token["\s:=]+["']?[A-Za-z0-9._-]+["']?/gi,
  /refresh_token["\s:=]+["']?[A-Za-z0-9._-]+["']?/gi,
  /api[_-]?key["\s:=]+["']?[A-Za-z0-9._-]+["']?/gi,
  /apikey["\s:=]+["']?[A-Za-z0-9._-]+["']?/gi,
  /secret["\s:=]+["']?[A-Za-z0-9._-]+["']?/gi,
  /password["\s:=]+["']?[^\s"']+["']?/gi,
  /bearer\s+[A-Za-z0-9._-]+/gi,
  /authorization["\s:=]+["']?[^\s"']+["']?/gi,
  /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, // JWT tokens
];

const REDACTED = "[REDACTED]";

/**
 * Redact sensitive information from a string
 */
function redactSensitive(text: string): string {
  let result = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

/**
 * Safely stringify an object, redacting sensitive fields
 */
function safeStringify(obj: unknown): string {
  try {
    const seen = new WeakSet();
    const result = JSON.stringify(obj, (key, value) => {
      // Redact known sensitive keys
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("authorization")
      ) {
        return REDACTED;
      }
      
      // Handle circular references
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      
      return value;
    }, 2);
    
    return redactSensitive(result);
  } catch {
    return "[Unable to stringify]";
  }
}

/**
 * Generate a random error ID for support reference
 */
export function generateErrorId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous chars
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Error context for structured logging
 */
export interface ErrorContext {
  /** Component or module where error occurred */
  component?: string;
  /** Current route/URL */
  route?: string;
  /** User-related info (not sensitive) */
  userId?: string;
  /** Company context */
  companyId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Log an error safely, redacting sensitive information
 */
export function logError(
  error: Error | unknown,
  context?: ErrorContext
): string {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  
  // Build safe error info
  const errorInfo = {
    errorId,
    timestamp,
    message: error instanceof Error ? redactSensitive(error.message) : String(error),
    name: error instanceof Error ? error.name : "UnknownError",
    stack: error instanceof Error && error.stack 
      ? redactSensitive(error.stack.split("\n").slice(0, 5).join("\n"))
      : undefined,
    context: context ? {
      component: context.component,
      route: context.route ? redactSensitive(context.route) : undefined,
      userId: context.userId ? context.userId.substring(0, 8) + "..." : undefined,
      companyId: context.companyId ? context.companyId.substring(0, 8) + "..." : undefined,
      metadata: context.metadata ? safeStringify(context.metadata) : undefined,
    } : undefined,
  };

  // Log to console with styling
  console.group(`🚨 Error [${errorId}]`);
  console.error("Message:", errorInfo.message);
  if (errorInfo.stack) {
    console.error("Stack:", errorInfo.stack);
  }
  if (errorInfo.context) {
    console.error("Context:", errorInfo.context);
  }
  console.groupEnd();

  return errorId;
}

/**
 * Log a warning safely
 */
export function logWarning(
  message: string,
  context?: ErrorContext
): void {
  const timestamp = new Date().toISOString();
  const safeMessage = redactSensitive(message);
  
  console.warn(`⚠️ [${timestamp}] ${safeMessage}`, context?.component ? `(${context.component})` : "");
}

/**
 * Log info for diagnostics
 */
export function logInfo(
  message: string,
  context?: ErrorContext
): void {
  const timestamp = new Date().toISOString();
  const safeMessage = redactSensitive(message);
  
  console.info(`ℹ️ [${timestamp}] ${safeMessage}`, context?.component ? `(${context.component})` : "");
}
