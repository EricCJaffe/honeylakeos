import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Video,
  Clock,
  ChevronRight,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";

interface BoardMeeting {
  id: string;
  title: string;
  meeting_type: string;
  status: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  meeting_url: string | null;
  description: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft:       { label: "Draft",       variant: "outline" },
  scheduled:   { label: "Scheduled",   variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed:   { label: "Completed",   variant: "secondary" },
  cancelled:   { label: "Cancelled",   variant: "destructive" },
};

const TYPE_LABELS: Record<string, string> = {
  regular:   "Regular",
  special:   "Special",
  emergency: "Emergency",
  annual:    "Annual",
  committee: "Committee",
};

export default function BoardMeetingsPage() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["board-meetings", activeCompanyId, filter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      let query = client
        .from("board_meetings")
        .select("id, title, meeting_type, status, scheduled_at, duration_minutes, location, meeting_url, description, created_at")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("scheduled_at", { ascending: filter !== "past" });

      if (filter === "upcoming") {
        query = query
          .gte("scheduled_at", new Date().toISOString())
          .neq("status", "completed")
          .neq("status", "cancelled");
      } else if (filter === "past") {
        query = query.or(
          "status.eq.completed,scheduled_at.lt." + new Date().toISOString()
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BoardMeeting[];
    },
    enabled: !!activeCompanyId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Board Meetings"
        description="Schedule and manage board meetings, agendas, and minutes."
        actionLabel="New Meeting"
        onAction={() => navigate("/app/board/new")}
      />

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(["upcoming", "past", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No board meetings"
          description={
            filter === "upcoming"
              ? "No upcoming meetings scheduled. Create one to get started."
              : "No meetings found for this filter."
          }
          actionLabel={filter === "upcoming" ? "Schedule Meeting" : undefined}
          onAction={filter === "upcoming" ? () => navigate("/app/board/new") : undefined}
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const statusCfg = STATUS_CONFIG[meeting.status] ?? { label: meeting.status, variant: "outline" as const };
            return (
              <Card
                key={meeting.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                onClick={() => navigate(`/app/board/${meeting.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-foreground">{meeting.title}</span>
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}
                        </Badge>
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {meeting.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {meeting.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(meeting.scheduled_at), "MMM d, yyyy · h:mm a")}
                          </span>
                        )}
                        {meeting.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {meeting.duration_minutes} min
                          </span>
                        )}
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </span>
                        )}
                        {meeting.meeting_url && !meeting.location && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            Virtual
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
