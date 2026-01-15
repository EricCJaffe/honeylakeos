import * as React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Pencil, Trash2, Clock, MapPin, Users } from "lucide-react";
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

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  const { data: event, isLoading } = useQuery({
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
                <span>{format(new Date(event.start_at), "EEEE, MMMM d, yyyy")}</span>
              </div>
              {!event.all_day && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(event.start_at), "h:mm a")}
                    {event.end_at && ` - ${format(new Date(event.end_at), "h:mm a")}`}
                  </span>
                </div>
              )}
              {event.location_text && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location_text}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.event_attendees?.length || 0} attendee(s)
                </span>
              </div>
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

      <EventFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        event={event}
      />
    </div>
  );
}
