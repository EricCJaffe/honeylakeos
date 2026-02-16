import * as React from "react";
import { useState } from "react";
import { addMonths, format } from "date-fns";
import { Calendar, ChevronDown, ChevronUp, AlertCircle, Loader2, SkipForward } from "lucide-react";
import { RRule } from "rrule";
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
import { useEventOccurrences } from "@/hooks/useEventRecurrence";
import { useEventOccurrenceActions } from "@/hooks/useEventOccurrenceActions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RecurringEventOccurrencesProps {
  event: {
    id: string;
    title: string;
    is_recurring_template: boolean;
    recurrence_rules?: string | null;
    recurrence_end_at?: string | null;
    recurrence_count?: number | null;
    timezone?: string;
    company_id: string;
  };
  onEditOccurrence?: (occurrenceDate: Date) => void;
}

// Parse RRULE to human-readable text
function rruleToText(rruleStr: string): string {
  try {
    // Extract just the RRULE part if there's a DTSTART
    const rrulePart = rruleStr.includes("RRULE:") 
      ? rruleStr.split("RRULE:")[1] 
      : rruleStr;
    
    const rule = RRule.fromString(`RRULE:${rrulePart}`);
    return rule.toText();
  } catch (e) {
    // Fallback: parse manually
    const freq = rruleStr.match(/FREQ=(\w+)/)?.[1];
    const interval = rruleStr.match(/INTERVAL=(\d+)/)?.[1] || "1";
    const until = rruleStr.match(/UNTIL=([^;]+)/)?.[1];
    const count = rruleStr.match(/COUNT=(\d+)/)?.[1];
    
    let text = "Repeats ";
    if (freq === "DAILY") text += `every ${interval === "1" ? "" : interval + " "}day${interval !== "1" ? "s" : ""}`;
    else if (freq === "WEEKLY") text += `every ${interval === "1" ? "" : interval + " "}week${interval !== "1" ? "s" : ""}`;
    else if (freq === "MONTHLY") text += `every ${interval === "1" ? "" : interval + " "}month${interval !== "1" ? "s" : ""}`;
    else if (freq === "YEARLY") text += `every ${interval === "1" ? "" : interval + " "}year${interval !== "1" ? "s" : ""}`;
    else text += freq?.toLowerCase() || "custom";
    
    if (until) {
      try {
        const untilDate = new Date(until.replace(/(\d{4})(\d{2})(\d{2}).*/, "$1-$2-$3"));
        text += ` until ${format(untilDate, "MMM d, yyyy")}`;
      } catch {
        // Keep fallback summary when UNTIL parsing fails.
      }
    }
    if (count) text += `, ${count} times`;
    
    return text;
  }
}

export function RecurringEventOccurrences({ 
  event,
  onEditOccurrence,
}: RecurringEventOccurrencesProps) {
  const [showSkipped, setShowSkipped] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState<Date | null>(null);
  const now = new Date();
  const rangeStart = now;
  const rangeEnd = addMonths(now, 3);

  const { data: occurrences = [], isLoading: loadingOccurrences } = useEventOccurrences(
    event.id,
    rangeStart,
    rangeEnd,
    event.is_recurring_template
  );

  const { skipOccurrence } = useEventOccurrenceActions();

  // Fetch skipped occurrences (exceptions)
  const { data: exceptions = [], isLoading: loadingExceptions } = useQuery({
    queryKey: ["event-exceptions", event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_recurrence_exceptions")
        .select("*")
        .eq("event_id", event.id)
        .order("exception_date", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: event.is_recurring_template,
  });

  if (!event.is_recurring_template) {
    return null;
  }

  // Filter to upcoming occurrences (not exceptions), limit to 10
  const upcomingOccurrences = occurrences
    .filter(occ => !occ.is_exception)
    .slice(0, 10);

  const rruleSummary = event.recurrence_rules 
    ? rruleToText(event.recurrence_rules) 
    : "Custom recurrence";

  const handleSkipClick = (occDate: Date) => {
    setSkipConfirm(occDate);
  };

  const handleConfirmSkip = async () => {
    try {
      if (skipConfirm) {
        await skipOccurrence.mutateAsync({
          seriesEventId: event.id,
          occurrenceDate: skipConfirm,
        });
      }
    } finally {
      setSkipConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recurrence Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recurrence Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground capitalize">
            {rruleSummary}
          </p>
          {event.recurrence_end_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Ends {format(new Date(event.recurrence_end_at), "MMM d, yyyy")}
            </p>
          )}
          {event.recurrence_count && (
            <p className="text-xs text-muted-foreground mt-1">
              {event.recurrence_count} occurrences
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Occurrences */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming Occurrences</CardTitle>
            {upcomingOccurrences.length > 0 && (
              <Badge variant="secondary">{upcomingOccurrences.length}</Badge>
            )}
          </div>
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
                const occDate = new Date(occ.occurrence_date);
                return (
                  <div
                    key={`${occ.occurrence_date}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleSkipClick(occDate)}
                        disabled={skipOccurrence.isPending}
                      >
                        {skipOccurrence.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <SkipForward className="h-3 w-3 mr-1" />
                            Skip
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skipped/Deleted Occurrences */}
      {exceptions.length > 0 && (
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
              This will skip the event scheduled for{" "}
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
              {skipOccurrence.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Skip Occurrence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
