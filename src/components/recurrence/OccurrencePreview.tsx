import * as React from "react";
import { useState } from "react";
import { addMonths, format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  History,
  AlertCircle,
  SkipForward,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";

export interface Occurrence {
  id?: string;
  occurrence_date: string;
  occurrence_start_at?: string;
  is_exception?: boolean;
  is_override?: boolean;
  is_completed?: boolean;
  completed_at?: string;
  completed_by?: string;
}

export interface CompletionRecord {
  id: string;
  occurrence_start_at: string;
  completed_at: string;
  completed_by?: string;
}

interface OccurrencePreviewProps {
  /** Type of entity for proper labeling */
  entityType: "task" | "event";
  /** The series entity for reference */
  entityId: string;
  /** Whether the entity is a recurring template */
  isRecurring: boolean;
  /** Upcoming occurrences to display */
  occurrences: Occurrence[];
  /** Whether occurrences are loading */
  loadingOccurrences?: boolean;
  /** Completion history (for tasks) */
  completions?: CompletionRecord[];
  /** Whether completions are loading */
  loadingCompletions?: boolean;
  /** Exceptions/skipped dates (for events) */
  exceptions?: Array<{ id: string; exception_date: string }>;
  /** Whether exceptions are loading */
  loadingExceptions?: boolean;
  /** Handler to skip/delete an occurrence */
  onSkip?: (occurrenceDate: Date) => Promise<void>;
  /** Handler to complete an occurrence (tasks only) */
  onComplete?: (occurrenceStartAt: Date, isCurrentlyCompleted: boolean) => Promise<void>;
  /** Handler to edit a single occurrence */
  onEditOccurrence?: (occurrenceDate: Date) => void;
  /** Handler to edit this and future occurrences */
  onEditFuture?: (occurrenceDate: Date) => void;
  /** Whether skip action is pending */
  isSkipPending?: boolean;
  /** Whether complete action is pending */
  isCompletePending?: boolean;
  /** Max occurrences to show */
  maxOccurrences?: number;
  /** Max months to look ahead */
  monthsAhead?: number;
}

export function OccurrencePreview({
  entityType,
  entityId,
  isRecurring,
  occurrences,
  loadingOccurrences = false,
  completions = [],
  loadingCompletions = false,
  exceptions = [],
  loadingExceptions = false,
  onSkip,
  onComplete,
  onEditOccurrence,
  onEditFuture,
  isSkipPending = false,
  isCompletePending = false,
  maxOccurrences = 10,
  monthsAhead = 3,
}: OccurrencePreviewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState<Date | null>(null);

  if (!isRecurring) {
    return null;
  }

  // Filter to upcoming (non-excepted, non-completed for tasks) occurrences
  const upcomingOccurrences = occurrences
    .filter(occ => !occ.is_exception && (entityType === "event" || !occ.is_completed))
    .slice(0, maxOccurrences);

  // Recent completions (for tasks)
  const recentCompletions = completions.slice(0, 20);

  const handleSkipClick = (occDate: Date) => {
    setSkipConfirm(occDate);
  };

  const handleConfirmSkip = async () => {
    if (skipConfirm && onSkip) {
      await onSkip(skipConfirm);
    }
    setSkipConfirm(null);
  };

  const entityLabel = entityType === "task" ? "task" : "event";

  return (
    <div className="space-y-4">
      {/* Upcoming Occurrences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Upcoming Occurrences
            {upcomingOccurrences.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {upcomingOccurrences.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOccurrences ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : upcomingOccurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No upcoming occurrences in the next {monthsAhead} months
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingOccurrences.map((occ, index) => {
                const occDate = new Date(occ.occurrence_start_at || occ.occurrence_date);
                return (
                  <div
                    key={`${occ.occurrence_date}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {entityType === "task" && onComplete ? (
                        <button
                          onClick={() => onComplete(occDate, !!occ.is_completed)}
                          disabled={isCompletePending}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {occ.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      <span className="text-sm">
                        {format(occDate, "EEEE, MMM d, yyyy")}
                      </span>
                      {occ.is_override && (
                        <Badge variant="outline" className="text-xs">Modified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditOccurrence && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditOccurrence(occDate)}
                        >
                          Edit
                        </Button>
                      )}
                      {onEditFuture && entityType === "task" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditFuture(occDate)}
                        >
                          Edit Future
                        </Button>
                      )}
                      {onSkip && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleSkipClick(occDate)}
                          disabled={isSkipPending}
                        >
                          {isSkipPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <SkipForward className="h-3 w-3 mr-1" />
                              Skip
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion History (Tasks only) */}
      {entityType === "task" && recentCompletions.length > 0 && (
        <Card>
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Completion History
                    <Badge variant="secondary" className="ml-2">
                      {recentCompletions.length}
                    </Badge>
                  </CardTitle>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {loadingCompletions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentCompletions.map((completion) => {
                      const occDate = new Date(completion.occurrence_start_at);
                      const completedDate = new Date(completion.completed_at);
                      return (
                        <div
                          key={completion.id}
                          className={cn(
                            "flex items-center justify-between py-2 px-3 rounded-md",
                            "bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {format(occDate, "MMM d, yyyy")}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Completed {format(completedDate, "MMM d 'at' h:mm a")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Skipped/Deleted Occurrences (Events) */}
      {entityType === "event" && exceptions.length > 0 && (
        <Card>
          <Collapsible open={showSkipped} onOpenChange={setShowSkipped}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Skipped Occurrences
                    <Badge variant="secondary" className="ml-2">
                      {exceptions.length}
                    </Badge>
                  </CardTitle>
                  {showSkipped ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {loadingExceptions ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {exceptions.map((exception) => {
                      const excDate = new Date(exception.exception_date);
                      return (
                        <div
                          key={exception.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30"
                        >
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                          <span className="text-sm text-muted-foreground line-through">
                            {format(excDate, "MMM d, yyyy")}
                          </span>
                          <Badge variant="outline" className="text-xs">Skipped</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={!!skipConfirm} onOpenChange={(open) => !open && setSkipConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will skip the {entityLabel} scheduled for{" "}
              <strong>
                {skipConfirm ? format(skipConfirm, "EEEE, MMMM d, yyyy") : ""}
              </strong>. 
              The rest of the series will continue as scheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSkip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSkipPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Skip Occurrence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
