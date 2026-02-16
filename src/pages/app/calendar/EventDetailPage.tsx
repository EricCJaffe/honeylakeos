import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Pencil, Trash2, Clock, MapPin, Users, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { EventFormDialog } from "./EventFormDialog";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { RecurringEventOccurrences } from "@/components/calendar/RecurringEventOccurrences";
import { EventAttendeesManager } from "@/components/calendar/EventAttendeesManager";
import { AttachmentsPanel } from "@/components/attachments";
import { safeFormatDate } from "@/core/runtime/safety";
import type { Tables } from "@/integrations/supabase/types";

type EventDetailRecord = Tables<"events"> & {
  project?: { id: string; name: string; emoji: string | null } | null;
  event_attendees?: Array<{ user_id: string }> | null;
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<"single" | "series">("series");
  const [occurrenceToEdit, setOccurrenceToEdit] = useState<Date | undefined>();

  const { data: event, isLoading } = useQuery<EventDetailRecord | null>({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          project:projects(id, name, emoji),
          event_attendees(user_id)
        `)
        .eq("id", eventId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const deleteEvent = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("No event");
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      navigate("/app/calendar");
    },
    onError: () => {
      toast.error("Failed to delete event");
    },
  });

  const canEdit = event && (isCompanyAdmin || event.created_by === user?.id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Calendar}
          title="Event not found"
          description="This event may have been deleted or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={event.title}
        backHref="/app/calendar"
      >
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteEvent.mutate()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        {event.all_day && (
          <Badge variant="secondary">All Day</Badge>
        )}
        {event.is_recurring_template && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            Recurring
          </Badge>
        )}
        {event.project && (
          <Badge variant="outline">
            {event.project.emoji} {event.project.name}
          </Badge>
        )}
        {event.color && (
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: event.color }}
          />
        )}
      </div>

      {/* Recurring Event Occurrences */}
      {event.is_recurring_template && (
        <div className="mb-6">
          <RecurringEventOccurrences 
            event={event}
            onEditOccurrence={(date) => {
              setOccurrenceToEdit(date);
              setEditMode("single");
              setIsFormDialogOpen(true);
            }}
          />
        </div>
      )}

      {/* Links */}
      <div className="mb-6">
        <EntityLinksPanel entityType="event" entityId={event.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{safeFormatDate(event.start_at, "EEEE, MMMM d, yyyy")}</span>
              </div>
              {!event.all_day && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {safeFormatDate(event.start_at, "h:mm a", "Invalid time")}
                    {event.end_at && ` - ${safeFormatDate(event.end_at, "h:mm a", "Invalid time")}`}
                  </span>
                </div>
              )}
              {event.location_text && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location_text}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            {event.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendees */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventAttendeesManager eventId={event.id} canManage={canEdit || false} />
        </CardContent>
      </Card>

      {/* Attachments */}
      <div className="mt-6">
        <AttachmentsPanel entityType="event" entityId={event.id} />
      </div>

      <EventFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) {
            setEditMode("series");
            setOccurrenceToEdit(undefined);
          }
        }}
        event={event}
        editMode={editMode}
        occurrenceDate={occurrenceToEdit}
      />
    </div>
  );
}
