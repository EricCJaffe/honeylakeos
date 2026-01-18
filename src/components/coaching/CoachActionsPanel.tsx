import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  ListTodo,
  Share2,
  Clock,
  Check,
  X,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useCreateCoachingSession,
  useCreateSuggestedTask,
  useSuggestedTasks,
  useCoachingSessions,
} from "@/hooks/useCoachPlaybooks";

interface CoachActionsPanelProps {
  clientCompanyId: string;
  clientName?: string;
}

export function CoachActionsPanel({ clientCompanyId, clientName }: CoachActionsPanelProps) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: sessions = [] } = useCoachingSessions(clientCompanyId);
  const { data: suggestions = [] } = useSuggestedTasks({ clientCompanyId });

  const recentSessions = sessions.slice(0, 3);
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Coach Actions
          </CardTitle>
          <CardDescription>
            Guide {clientName || "this client"} with coaching sessions and task suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setSessionDialogOpen(true)}
          >
            <Calendar className="h-4 w-4" />
            Create Coaching Session
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setTaskDialogOpen(true)}
          >
            <ListTodo className="h-4 w-4" />
            Suggest Task to Client
          </Button>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-2 rounded-lg border text-sm"
              >
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.scheduled_at
                      ? format(new Date(session.scheduled_at), "MMM d, h:mm a")
                      : formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                  </p>
                </div>
                {session.completed_at && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Suggestions */}
      {pendingSuggestions.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Pending Suggestions
              <Badge variant="outline">{pendingSuggestions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingSuggestions.slice(0, 3).map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-2 rounded-lg border text-sm bg-yellow-500/5 border-yellow-500/20"
              >
                <div>
                  <p className="font-medium">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Awaiting client decision
                  </p>
                </div>
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        clientCompanyId={clientCompanyId}
      />

      {/* Suggest Task Dialog */}
      <SuggestTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        clientCompanyId={clientCompanyId}
      />
    </div>
  );
}

function CreateSessionDialog({
  open,
  onOpenChange,
  clientCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientCompanyId: string;
}) {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const createSession = useCreateCoachingSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSession.mutate(
      {
        clientCompanyId,
        title,
        agendaRte: agenda || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setAgenda("");
          setScheduledAt("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Coaching Session</DialogTitle>
          <DialogDescription>
            Schedule a coaching session with notes and agenda for yourself.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">Session Title</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Check-in"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-scheduled">Scheduled Date/Time (optional)</Label>
            <Input
              id="session-scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-agenda">Agenda (optional)</Label>
            <Textarea
              id="session-agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Topics to discuss..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createSession.isPending}>
              {createSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuggestTaskDialog({
  open,
  onOpenChange,
  clientCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientCompanyId: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const createSuggestion = useCreateSuggestedTask();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSuggestion.mutate(
      {
        clientCompanyId,
        title,
        descriptionRte: description || undefined,
        suggestedDueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setDescription("");
          setDueDate("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest Task to Client</DialogTitle>
          <DialogDescription>
            The client admin will need to accept this suggestion before it becomes a task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete quarterly review"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Suggested Due Date (optional)</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description (optional)</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about the task..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createSuggestion.isPending}>
              {createSuggestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Suggestion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
