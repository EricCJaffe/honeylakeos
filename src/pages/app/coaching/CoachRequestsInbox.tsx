import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ListTodo,
  Share2,
  Check,
  X,
  Clock,
  Building2,
  Calendar,
  Inbox,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useIncomingSuggestions,
  useIncomingShareRequests,
  useAcceptSuggestedTask,
  useRejectSuggestedTask,
  useDecideShareRequest,
  SuggestedTask,
  CoachShareRequest,
} from "@/hooks/useCoachPlaybooks";

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  isPending,
}: {
  suggestion: SuggestedTask;
  onAccept: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const [confirmReject, setConfirmReject] = useState(false);

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListTodo className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Building2 className="h-3 w-3" />
                  From: {suggestion.coach_company?.name || "Coach"}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestion.description_rte && (
            <p className="text-sm text-muted-foreground">{suggestion.description_rte}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {suggestion.suggested_due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due: {format(new Date(suggestion.suggested_due_date), "MMM d, yyyy")}
              </span>
            )}
            <span>
              Suggested {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isPending}
              className="gap-1"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Accept & Create Task
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmReject(true)}
              disabled={isPending}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will notify the coach that you've declined the task suggestion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReject();
                setConfirmReject(false);
              }}
            >
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ShareRequestCard({
  request,
  onApprove,
  onDeny,
  isPending,
}: {
  request: CoachShareRequest;
  onApprove: () => void;
  onDeny: () => void;
  isPending: boolean;
}) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Share2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                Share {request.request_type}: {request.entity_name || "Untitled"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Building2 className="h-3 w-3" />
                From: {request.coach_company?.name || "Coach"}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.reason && (
          <p className="text-sm text-muted-foreground">
            <strong>Reason:</strong> {request.reason}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
        </p>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isPending}
            className="gap-1"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDeny}
            disabled={isPending}
            className="gap-1"
          >
            <X className="h-3 w-3" />
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoachRequestsInbox() {
  const { data: suggestions = [], isLoading: suggestionsLoading } = useIncomingSuggestions();
  const { data: shareRequests = [], isLoading: requestsLoading } = useIncomingShareRequests();

  const acceptTask = useAcceptSuggestedTask();
  const rejectTask = useRejectSuggestedTask();
  const decideShare = useDecideShareRequest();

  const isLoading = suggestionsLoading || requestsLoading;
  const totalPending = suggestions.length + shareRequests.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Coach Requests"
        description="Review and respond to suggestions from your coaching organization"
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : totalPending === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No pending requests"
          description="You're all caught up! Coach suggestions and share requests will appear here."
        />
      ) : (
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Task Suggestions
              {suggestions.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shares" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share Requests
              {shareRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {shareRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6 space-y-4">
            {suggestions.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="No task suggestions"
                description="Your coach hasn't suggested any tasks yet."
              />
            ) : (
              suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => acceptTask.mutate({ suggestionId: suggestion.id })}
                  onReject={() => rejectTask.mutate(suggestion.id)}
                  isPending={acceptTask.isPending || rejectTask.isPending}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="shares" className="mt-6 space-y-4">
            {shareRequests.length === 0 ? (
              <EmptyState
                icon={Share2}
                title="No share requests"
                description="Your coach hasn't requested access to any reports yet."
              />
            ) : (
              shareRequests.map((request) => (
                <ShareRequestCard
                  key={request.id}
                  request={request}
                  onApprove={() => decideShare.mutate({ requestId: request.id, approve: true })}
                  onDeny={() => decideShare.mutate({ requestId: request.id, approve: false })}
                  isPending={decideShare.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
