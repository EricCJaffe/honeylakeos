import * as React from "react";
import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";

export interface DeferredTask {
  id: string;
  title: string;
  status: "deferred" | "done";
  owner?: string;
  notes: string;
  created_at: string;
}

// Hardcoded deferred tasks - can be moved to database later
export const DEFERRED_TASKS: DeferredTask[] = [
  {
    id: "1",
    title: "Test employee invite email end-to-end (Resend)",
    status: "deferred",
    owner: "Admin",
    notes:
      "Verify domain, verify EMAIL_FROM, send invite, receive email, accept token, ensure membership + employee linking",
    created_at: "2025-01-15",
  },
];

export function getDeferredTasksCount(): number {
  return DEFERRED_TASKS.filter((t) => t.status === "deferred").length;
}

export default function DeferredTasksPage() {
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const [tasks] = useState<DeferredTask[]>(DEFERRED_TASKS);

  const hasAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  if (!hasAccess) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Access Denied"
          description="You need admin privileges to view deferred tasks."
        />
      </div>
    );
  }

  const deferredTasks = tasks.filter((t) => t.status === "deferred");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Deferred Tasks"
        description="Track unfinished items that need follow-up"
      />

      {/* Summary */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {deferredTasks.length} deferred
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-800 dark:text-green-300">
            {doneTasks.length} done
          </span>
        </div>
      </div>

      {/* Deferred Tasks */}
      {deferredTasks.length > 0 && (
        <div className="space-y-3 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pending
          </h2>
          {deferredTasks.map((task) => (
            <Card key={task.id} className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Deferred
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">{task.notes}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {task.owner && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{task.owner}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{task.created_at}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completed
          </h2>
          {doneTasks.map((task) => (
            <Card key={task.id} className="opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-through">
                    {task.title}
                  </CardTitle>
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Done
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{task.notes}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="No deferred tasks to track."
        />
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p>
          <strong>Note:</strong> This is a simple tracking list for development
          tasks. Tasks are currently hardcoded. In the future, this can be
          connected to a database table for dynamic management.
        </p>
      </div>
    </div>
  );
}
