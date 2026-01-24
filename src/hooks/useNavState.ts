import { useState, useEffect, useCallback } from "react";

const NAV_STATE_KEY = "nav_expanded_sections";

/**
 * Hook to manage and persist navigation section expand/collapse state
 * State is stored per-user in localStorage
 */
export function useNavState() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(["work"]); // Default to work expanded
    
    try {
      const stored = localStorage.getItem(NAV_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : ["work"]);
      }
    } catch {
      // Ignore parse errors
    }
    
    // Default: expand "work" section
    return new Set(["work"]);
  });

  // Persist to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(NAV_STATE_KEY, JSON.stringify([...expandedSections]));
    } catch {
      // Ignore storage errors
    }
  }, [expandedSections]);

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (sectionKey: string) => expandedSections.has(sectionKey),
    [expandedSections]
  );

  const expandSection = useCallback((sectionKey: string) => {
    setExpandedSections((prev) => {
      if (prev.has(sectionKey)) return prev;
      const next = new Set(prev);
      next.add(sectionKey);
      return next;
    });
  }, []);

  return {
    expandedSections,
    toggleSection,
    isExpanded,
    expandSection,
  };
}
