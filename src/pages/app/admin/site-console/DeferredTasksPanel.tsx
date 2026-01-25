import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ListTodo, Plus, Pencil, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DeferredTask | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDetails, setFormDetails] = useState("");

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

  const openCreate = () => {
    setEditingTask(null);
    setFormTitle("");
    setFormDetails("");
    setDialogOpen(true);
  };

  const openEdit = (task: DeferredTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDetails(task.details);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;

    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id ? { ...t, title: formTitle.trim(), details: formDetails.trim() } : t
        )
      );
    } else {
      const newTask: DeferredTask = {
        id: `task-${Date.now()}`,
        title: formTitle.trim(),
        details: formDetails.trim(),
        done: false,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    setDialogOpen(false);
    setEditingTask(null);
    setFormTitle("");
    setFormDetails("");
  };

  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Dev Tasks
              <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-500/10 ml-2">
                DEV
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                Reset
              </Button>
            </div>
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
              <p className="text-muted-foreground text-center py-8">No dev tasks. All caught up!</p>
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
                    {task.details && (
                      <p
                        className={`text-xs mt-1 ${task.done ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                      >
                        {task.details}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Dev Task" : "Add Dev Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="What needs to be done?"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-details">Details (optional)</Label>
              <Textarea
                id="task-details"
                placeholder="Additional notes or context..."
                value={formDetails}
                onChange={(e) => setFormDetails(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formTitle.trim()}>
              {editingTask ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}