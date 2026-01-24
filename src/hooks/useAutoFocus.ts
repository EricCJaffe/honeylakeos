import * as React from "react";

/**
 * Hook to auto-focus an input element when a dialog/form opens.
 * Returns a ref to attach to the input element.
 * 
 * @param shouldFocus - Whether to trigger focus (e.g., dialog open state)
 * @param delay - Optional delay in ms before focusing (default: 100)
 */
export function useAutoFocus<T extends HTMLElement = HTMLInputElement>(
  shouldFocus: boolean,
  delay = 100
): React.RefObject<T> {
  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    if (shouldFocus && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.focus();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus, delay]);

  return ref;
}

/**
 * Hook for auto-focusing within a form with multiple inputs.
 * Returns a function to register inputs and auto-focuses the first one.
 */
export function useFormAutoFocus(isOpen: boolean) {
  const firstInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const registerFirstInput = React.useCallback(
    (element: HTMLInputElement | null) => {
      if (element && !firstInputRef.current) {
        firstInputRef.current = element;
      }
    },
    []
  );

  return { registerFirstInput, firstInputRef };
}

/**
 * Combines a forwarded ref with an internal ref for auto-focus.
 * Useful when you need both auto-focus and ref forwarding.
 */
export function useCombinedRef<T extends HTMLElement>(
  forwardedRef: React.ForwardedRef<T>,
  shouldFocus: boolean,
  delay = 100
): React.RefCallback<T> {
  const autoFocusRef = useAutoFocus<T>(shouldFocus, delay);

  return React.useCallback(
    (element: T | null) => {
      // Update auto-focus ref
      (autoFocusRef as React.MutableRefObject<T | null>).current = element;

      // Update forwarded ref
      if (typeof forwardedRef === "function") {
        forwardedRef(element);
      } else if (forwardedRef) {
        forwardedRef.current = element;
      }
    },
    [forwardedRef, autoFocusRef]
  );
}
