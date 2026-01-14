import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { EventFormDialog } from "./EventFormDialog";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { activeCompanyId, loading: membershipLoading } = useActiveCompany();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", activeCompanyId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("company_id", activeCompanyId)
        .gte("start_at", monthStart.toISOString())
        .lte("start_at", monthEnd.toISOString())
        .eq("is_recurring_template", false)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Pad the start of the month
  const startPadding = monthStart.getDay();
  const paddedDays = [...Array(startPadding).fill(null), ...days];

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => isSameDay(new Date(event.start_at), date));
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  if (membershipLoading || isLoading) {
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
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Days */}
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
                    !isSameMonth(day, currentMonth) && "opacity-50"
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
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer",
                          event.color
                            ? `bg-[${event.color}]/20 text-[${event.color}]`
                            : "bg-primary/10 text-primary"
                        )}
                        style={
                          event.color
                            ? { backgroundColor: `${event.color}20`, color: event.color }
                            : undefined
                        }
                      >
                        {event.title}
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
        </CardContent>
      </Card>

      <EventFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        event={editingEvent}
        defaultDate={selectedDate}
      />
    </div>
  );
}
