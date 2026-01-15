import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isWithinInterval
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MoreHorizontal, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useRecurringEvents } from "@/hooks/useEventRecurrence";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { EventFormDialog } from "./EventFormDialog";
import { EventOccurrenceActions } from "@/components/calendar/EventOccurrenceActions";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "agenda";

export default function CalendarPage() {
  const { activeCompanyId, loading: membershipLoading } = useActiveCompany();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editMode, setEditMode] = useState<"single" | "series">("series");
  const [occurrenceDate, setOccurrenceDate] = useState<Date | undefined>();

  // Calculate range based on view mode
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === "month") {
      return {
        rangeStart: startOfMonth(currentDate),
        rangeEnd: endOfMonth(currentDate),
      };
    } else if (viewMode === "week") {
      return {
        rangeStart: startOfWeek(currentDate),
        rangeEnd: endOfWeek(currentDate),
      };
    } else {
      // Agenda - show next 30 days
      return {
        rangeStart: currentDate,
        rangeEnd: addDays(currentDate, 30),
      };
    }
  }, [currentDate, viewMode]);

  // Fetch regular (non-recurring) events
  const { data: regularEvents = [], isLoading: loadingRegular } = useQuery({
    queryKey: ["events", activeCompanyId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", false)
        .eq("is_recurrence_exception", false)
        .gte("start_at", rangeStart.toISOString())
        .lte("start_at", rangeEnd.toISOString())
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  // Fetch recurring events and their occurrences
  const { occurrences: recurringOccurrences, isLoading: loadingRecurring } = useRecurringEvents(rangeStart, rangeEnd);

  // Combine regular events with recurring occurrences
  const allEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      start_at: string;
      end_at: string | null;
      color: string | null;
      all_day: boolean;
      isRecurring: boolean;
      seriesEventId?: string;
      occurrenceDate?: Date;
      event?: any;
    }> = [];

    // Add regular events
    regularEvents.forEach((event) => {
      events.push({
        ...event,
        isRecurring: false,
      });
    });

    // Add recurring occurrences
    recurringOccurrences.forEach((occ: any) => {
      if (!occ.is_exception) {
        events.push({
          id: occ.is_override ? occ.override_event_id : `${occ.event.id}-${occ.occurrence_date}`,
          title: occ.event.title,
          start_at: occ.occurrence_date,
          end_at: occ.event.end_at,
          color: occ.event.color,
          all_day: occ.event.all_day,
          isRecurring: true,
          seriesEventId: occ.event.id,
          occurrenceDate: new Date(occ.occurrence_date),
          event: occ.event,
        });
      }
    });

    // Sort by start_at
    events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    return events;
  }, [regularEvents, recurringOccurrences]);

  const isLoading = membershipLoading || loadingRegular || loadingRecurring;

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDay = (date: Date) => {
    return allEvents.filter((event) => isSameDay(new Date(event.start_at), date));
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setEditMode("series");
    setOccurrenceDate(undefined);
    setIsDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setEditMode("series");
    setOccurrenceDate(undefined);
    setIsDialogOpen(true);
  };

  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!event.isRecurring) {
      navigate(`/app/calendar/events/${event.id}`);
    }
  };

  const handleEditOccurrence = (event: any) => {
    setEditingEvent(event.event || event);
    setEditMode("single");
    setOccurrenceDate(event.occurrenceDate);
    setIsDialogOpen(true);
  };

  const handleEditSeries = (event: any) => {
    setEditingEvent(event.event || event);
    setEditMode("series");
    setOccurrenceDate(undefined);
    setIsDialogOpen(true);
  };

  const navigatePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CalendarIcon}
          title="No company selected"
          description="Please select a company to view calendar."
        />
      </div>
    );
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPadding = monthStart.getDay();
    const paddedDays = [...Array(startPadding).fill(null), ...days];

    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {paddedDays.map((day, index) => {
          if (!day) {
            return (
              <div key={`empty-${index}`} className="bg-background p-2 min-h-24" />
            );
          }

          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-background p-2 min-h-24 cursor-pointer hover:bg-muted/50 transition-colors",
                !isSameMonth(day, currentDate) && "opacity-50"
              )}
              onClick={() => handleDayClick(day)}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1",
                  isToday && "bg-primary text-primary-foreground font-semibold"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div key={event.id} className="relative group">
                    {event.isRecurring ? (
                      <EventOccurrenceActions
                        seriesEventId={event.seriesEventId!}
                        occurrenceDate={event.occurrenceDate!}
                        onEditOccurrence={() => handleEditOccurrence(event)}
                        onEditSeries={() => handleEditSeries(event)}
                      >
                        <div
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer flex items-center gap-1",
                            "bg-primary/10 text-primary"
                          )}
                          style={
                            event.color
                              ? { backgroundColor: `${event.color}20`, color: event.color }
                              : undefined
                          }
                        >
                          <Repeat className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </div>
                      </EventOccurrenceActions>
                    ) : (
                      <div
                        onClick={(e) => handleEventClick(event, e)}
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer",
                          "bg-primary/10 text-primary"
                        )}
                        style={
                          event.color
                            ? { backgroundColor: `${event.color}20`, color: event.color }
                            : undefined
                        }
                      >
                        {event.title}
                      </div>
                    )}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground px-1.5">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()} className="min-h-[200px]">
              <div
                className={cn(
                  "text-center p-2 rounded-t-lg",
                  isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                <div className="text-xs font-medium">{format(day, "EEE")}</div>
                <div className="text-lg font-semibold">{format(day, "d")}</div>
              </div>
              <div 
                className="border border-t-0 rounded-b-lg p-2 space-y-1 min-h-[150px] cursor-pointer hover:bg-muted/30"
                onClick={() => handleDayClick(day)}
              >
                {dayEvents.map((event) => (
                  <div key={event.id}>
                    {event.isRecurring ? (
                      <EventOccurrenceActions
                        seriesEventId={event.seriesEventId!}
                        occurrenceDate={event.occurrenceDate!}
                        onEditOccurrence={() => handleEditOccurrence(event)}
                        onEditSeries={() => handleEditSeries(event)}
                      >
                        <div
                          className="text-xs p-1.5 rounded cursor-pointer flex items-center gap-1"
                          style={{
                            backgroundColor: event.color ? `${event.color}20` : undefined,
                            color: event.color || undefined,
                          }}
                        >
                          <Repeat className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </div>
                      </EventOccurrenceActions>
                    ) : (
                      <div
                        onClick={(e) => handleEventClick(event, e)}
                        className="text-xs p-1.5 rounded cursor-pointer"
                        style={{
                          backgroundColor: event.color ? `${event.color}20` : undefined,
                          color: event.color || undefined,
                        }}
                      >
                        {!event.all_day && (
                          <span className="font-medium">
                            {format(new Date(event.start_at), "h:mm a")} -{" "}
                          </span>
                        )}
                        {event.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAgendaView = () => {
    // Group events by date
    const eventsByDate: Record<string, typeof allEvents> = {};
    allEvents.forEach((event) => {
      const dateKey = format(new Date(event.start_at), "yyyy-MM-dd");
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    const sortedDates = Object.keys(eventsByDate).sort();

    if (sortedDates.length === 0) {
      return (
        <div className="py-12">
          <EmptyState
            icon={CalendarIcon}
            title="No upcoming events"
            description="Create an event to get started."
            actionLabel="New Event"
            onAction={handleCreate}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sortedDates.map((dateKey) => {
          const date = new Date(dateKey);
          const events = eventsByDate[dateKey];
          const isToday = isSameDay(date, new Date());

          return (
            <div key={dateKey} className="border rounded-lg overflow-hidden">
              <div className={cn(
                "px-4 py-2 font-medium",
                isToday ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {format(date, "EEEE, MMMM d, yyyy")}
                {isToday && <span className="ml-2 text-sm opacity-80">(Today)</span>}
              </div>
              <div className="divide-y">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => !event.isRecurring && handleEventClick(event, e)}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: event.color || "#2563eb" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{event.title}</span>
                        {event.isRecurring && (
                          <Repeat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {!event.all_day && (
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(event.start_at), "h:mm a")}
                          {event.end_at && ` - ${format(new Date(event.end_at), "h:mm a")}`}
                        </div>
                      )}
                    </div>
                    {event.isRecurring && (
                      <EventOccurrenceActions
                        seriesEventId={event.seriesEventId!}
                        occurrenceDate={event.occurrenceDate!}
                        onEditOccurrence={() => handleEditOccurrence(event)}
                        onEditSeries={() => handleEditSeries(event)}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </EventOccurrenceActions>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return `${format(currentDate, "MMM d")} - ${format(addDays(currentDate, 30), "MMM d, yyyy")}`;
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Calendar"
        description="View and manage your events"
        actionLabel="New Event"
        onAction={handleCreate}
      />

      <Card>
        <CardContent className="p-4">
          {/* View Mode Tabs & Navigation */}
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={navigatePrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {getHeaderTitle()}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Calendar Views */}
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "agenda" && renderAgendaView()}
        </CardContent>
      </Card>

      <EventFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        editMode={editMode}
        occurrenceDate={occurrenceDate}
      />
    </div>
  );
}
