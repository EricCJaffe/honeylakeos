import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ListTodo } from "lucide-react";
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
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }
  return DEFAULT_TASKS;
}

function saveTasks(tasks: DeferredTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export default function DeferredTasksPanel() {
  const [tasks, setTasks] = useState<DeferredTask[]>(() => loadTasks());

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Deferred Tasks (Dev)
            <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 ml-2">
              DEV
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            {pendingCount} pending
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-300">
            {doneCount} done
          </Badge>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No deferred tasks. All caught up!</p>
          ) : (
            tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  task.done ? "bg-muted/30 border-muted" : "border-amber-200 dark:border-amber-800"
                }`}
              >
                <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-medium text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}
                  >
                    {task.title}
                  </h4>
                  <p
                    className={`text-xs ${task.done ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                  >
                    {task.details}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
