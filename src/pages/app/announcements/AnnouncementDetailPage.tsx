import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncement, useAnnouncementMutations, useActiveAnnouncements } from "@/hooks/useAnnouncements";

// Lazy load rich text display
const RichTextDisplay = React.lazy(() =>
  import("@/components/ui/rich-text-editor").then((m) => ({ default: m.RichTextDisplay }))
);

export default function AnnouncementDetailPage() {
  const { announcementId } = useParams<{ announcementId: string }>();
  const navigate = useNavigate();
  const { data: announcement, isLoading } = useAnnouncement(announcementId);
  const { data: activeAnnouncements } = useActiveAnnouncements();
  const { acknowledgeAnnouncement } = useAnnouncementMutations();

  // Check if this announcement is read by current user
  const isRead = activeAnnouncements?.find((a) => a.id === announcementId)?.is_read || false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/app/announcements")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Announcements
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Announcement not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/announcements")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Announcements
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{announcement.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {format(
                  new Date(announcement.publish_at || announcement.created_at),
                  "MMMM d, yyyy 'at' h:mm a"
                )}
              </span>
            </div>
            {isRead && (
              <Badge variant="outline">
                <Check className="h-3 w-3 mr-1" />
                Read
              </Badge>
            )}
          </div>
        </div>
        {!isRead && (
          <Button
            variant="default"
            onClick={() => acknowledgeAnnouncement.mutate(announcement.id)}
            disabled={acknowledgeAnnouncement.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark as read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm max-w-none">
            <React.Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <RichTextDisplay content={announcement.body_rte} />
            </React.Suspense>
          </div>
        </CardContent>
      </Card>

      {announcement.expires_at && (
        <p className="text-xs text-muted-foreground text-center">
          This announcement expires{" "}
          {formatDistanceToNow(new Date(announcement.expires_at), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}