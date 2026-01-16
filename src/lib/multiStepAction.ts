/**
 * Multi-Step Action Handler
 * 
 * Provides best-effort atomicity for multi-step operations.
 * If secondary steps fail, primary record still saves and user gets clear feedback.
 */

import { parseFriendlyError } from "@/hooks/useFriendlyError";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MultiStepResult<T = unknown> {
  /** Overall success - true if primary step succeeded */
  success: boolean;
  /** Primary step result */
  primary: StepResult<T>;
  /** Secondary step results by name */
  secondary: Record<string, StepResult>;
  /** List of failed secondary steps */
  failedSteps: string[];
  /** User-friendly summary message */
  message: string;
}

export interface StepConfig<T = unknown> {
  /** Step name for tracking */
  name: string;
  /** Async operation to execute */
  execute: () => Promise<T>;
  /** Whether this is the primary step (default: false) */
  isPrimary?: boolean;
  /** Optional success message */
  successMessage?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Execute a multi-step action with best-effort atomicity.
 * Primary step must succeed; secondary steps are best-effort.
 */
export async function executeMultiStep<TPrimary = unknown>(
  primaryStep: StepConfig<TPrimary>,
  secondarySteps: StepConfig[]
): Promise<MultiStepResult<TPrimary>> {
  const result: MultiStepResult<TPrimary> = {
    success: false,
    primary: { success: false },
    secondary: {},
    failedSteps: [],
    message: "",
  };

  // Execute primary step
  try {
    const data = await primaryStep.execute();
    result.primary = { success: true, data };
    result.success = true;
  } catch (error) {
    const parsed = parseFriendlyError(error);
    result.primary = { success: false, error: parsed.message };
    result.message = parsed.message;
    return result;
  }

  // Execute secondary steps (best-effort, continue on failure)
  for (const step of secondarySteps) {
    try {
      const data = await step.execute();
      result.secondary[step.name] = { success: true, data };
    } catch (error) {
      const parsed = parseFriendlyError(error);
      result.secondary[step.name] = { success: false, error: parsed.message };
      result.failedSteps.push(step.name);
      // Log but don't throw - best-effort
      console.warn(`Secondary step "${step.name}" failed:`, parsed.message);
    }
  }

  // Build result message
  if (result.failedSteps.length === 0) {
    result.message = primaryStep.successMessage || "Saved successfully";
  } else {
    const failedNames = result.failedSteps.join(", ");
    result.message = `Saved, but some actions could not be completed: ${failedNames}`;
  }

  return result;
}

/**
 * Show appropriate toast based on multi-step result
 */
export function showMultiStepToast(result: MultiStepResult): void {
  if (!result.success) {
    toast.error(result.message);
    return;
  }

  if (result.failedSteps.length > 0) {
    toast.warning(result.message);
  } else {
    toast.success(result.message);
  }
}

/**
 * Wrap a simple async action with error handling
 */
export async function safeAction<T>(
  action: () => Promise<T>,
  errorContext?: string
): Promise<StepResult<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    const parsed = parseFriendlyError(error, {
      fallback: errorContext || "Action failed",
    });
    return { success: false, error: parsed.message };
  }
}

/**
 * Execute multiple independent actions in parallel with partial failure handling
 */
export async function executeParallel<T extends Record<string, () => Promise<unknown>>>(
  actions: T
): Promise<Record<keyof T, StepResult>> {
  const entries = Object.entries(actions);
  const results = await Promise.allSettled(
    entries.map(([_, action]) => action())
  );

  const output: Record<string, StepResult> = {};

  results.forEach((result, index) => {
    const [name] = entries[index];
    if (result.status === "fulfilled") {
      output[name] = { success: true, data: result.value };
    } else {
      const parsed = parseFriendlyError(result.reason);
      output[name] = { success: false, error: parsed.message };
    }
  });

  return output as Record<keyof T, StepResult>;
}

// ============================================================================
// DEV Diagnostics
// ============================================================================

const isDev = import.meta.env.DEV;

/**
 * Log multi-step action details (DEV mode only)
 */
export function debugMultiStep(
  actionName: string,
  result: MultiStepResult
): void {
  if (!isDev) return;

  console.debug(`[MultiStep] ${actionName}:`, {
    success: result.success,
    failedSteps: result.failedSteps,
    message: result.message,
  });
}
