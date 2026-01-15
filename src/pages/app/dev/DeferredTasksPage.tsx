import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface DeferredTask {
  id: string;
  title: string;
  details: string;
  done: boolean;
  created_at: string;
}

const STORAGE_KEY = "deferred_tasks_v1";

const DEFAULT_TASKS: DeferredTask[] = [
  {
    id: "invite-email-test",
    title: "Test employee invite email end-to-end (Resend + token accept)",
    details:
      "Verify domain, verify EMAIL_FROM, send invite, receive email, accept token, ensure membership + employee linking",
    done: false,
    created_at: new Date().toISOString(),
  },
];

function loadTasks(): DeferredTask[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_TASKS;
}

function saveTasks(tasks: DeferredTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export default function DeferredTasksPage() {
  const [tasks, setTasks] = useState<DeferredTask[]>(() => loadTasks());

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const resetToDefaults = () => {
    setTasks(DEFAULT_TASKS);
  };

  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title="Deferred Tasks (Dev)"
        description="Track development tasks that need follow-up. Stored in localStorage."
      />

      <div className="flex items-center gap-4 mb-6">
        <Badge variant="outline" className="text-amber-600 border-amber-300">
          {pendingCount} pending
        </Badge>
        <Badge variant="outline" className="text-green-600 border-green-300">
          {doneCount} done
        </Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No deferred tasks. All caught up!
            </CardContent>
          </Card>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={
                  task.done
                    ? "bg-muted/30 border-muted"
                    : "border-amber-200 dark:border-amber-800"
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle
                        className={`text-base ${
                          task.done
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.title}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-10">
                  <p
                    className={`text-sm ${
                      task.done ? "text-muted-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {task.details}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-2">
                    Created: {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
