let coreRoutePrefetchStarted = false;

function runWhenIdle(task: () => void) {
  if (typeof window === "undefined") return;

  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (typeof idle === "function") {
    idle(task);
    return;
  }
  window.setTimeout(task, 300);
}

export function prefetchCoreAppRoutes() {
  if (coreRoutePrefetchStarted) return;
  coreRoutePrefetchStarted = true;

  runWhenIdle(() => {
    void Promise.allSettled([
      import("@/pages/app/tasks/TasksPage"),
      import("@/pages/app/projects/ProjectsPage"),
      import("@/pages/app/calendar/CalendarPage"),
    ]);
  });
}

