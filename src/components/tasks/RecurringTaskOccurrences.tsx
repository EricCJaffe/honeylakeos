import * as React from "react";
import { useState } from "react";
import { addMonths, format } from "date-fns";
import { CheckCircle2, History, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  useExpandedTaskOccurrences, 
  useTaskOccurrenceCompletions,
  useTaskOccurrenceActions 
} from "@/hooks/useTaskOccurrenceCompletions";

interface RecurringTaskOccurrencesProps {
  task: {
    id: string;
    title: string;
    is_recurring_template: boolean;
    recurrence_rules?: string;
  };
  onEditOccurrence?: (occurrenceDate: Date) => void;
  onEditFuture?: (occurrenceDate: Date) => void;
}

export function RecurringTaskOccurrences({ 
  task,
  onEditOccurrence,
  onEditFuture,
}: RecurringTaskOccurrencesProps) {
  const [showHistory, setShowHistory] = useState(false);
  const now = new Date();
  const rangeStart = now;
  const rangeEnd = addMonths(now, 3);

  const { data: occurrences = [], isLoading: loadingOccurrences } = useExpandedTaskOccurrences(
    task.id,
    rangeStart,
    rangeEnd,
    task.is_recurring_template
  );

  const { data: completions = [], isLoading: loadingCompletions } = useTaskOccurrenceCompletions(
    task.id
  );

  const { completeOccurrence, uncompleteOccurrence, skipOccurrence } = useTaskOccurrenceActions();

  if (!task.is_recurring_template) {
    return null;
  }

  // Filter to upcoming (uncompleted) occurrences, limit to 10
  const upcomingOccurrences = occurrences
    .filter(occ => !occ.is_completed)
    .slice(0, 10);

  // Recent completions (last 20)
  const recentCompletions = completions.slice(0, 20);

  const handleComplete = async (occurrenceStartAt: Date, isCurrentlyCompleted: boolean) => {
    if (isCurrentlyCompleted) {
      await uncompleteOccurrence.mutateAsync({
        seriesTaskId: task.id,
        occurrenceStartAt,
      });
    } else {
      await completeOccurrence.mutateAsync({
        seriesTaskId: task.id,
        occurrenceStartAt,
      });
    }
  };

  const handleSkip = async (occurrenceDate: Date) => {
    await skipOccurrence.mutateAsync({
      seriesTaskId: task.id,
      occurrenceDate,
    });
  };

  return (
    <div className="space-y-4">
      {/* Upcoming Occurrences */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Occurrences
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
              No upcoming occurrences in the next 3 months
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingOccurrences.map((occ, index) => {
                const occDate = new Date(occ.occurrence_start_at);
                return (
                  <div
                    key={`${occ.occurrence_date}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleComplete(occDate, occ.is_completed)}
                        disabled={completeOccurrence.isPending || uncompleteOccurrence.isPending}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {occ.is_completed ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                        )}
                      </button>
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
                      {onEditFuture && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditFuture(occDate)}
                        >
                          Edit Future
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleSkip(occDate)}
                        disabled={skipOccurrence.isPending}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion History */}
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
              ) : recentCompletions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No completions yet
                </p>
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
    </div>
  );
}
