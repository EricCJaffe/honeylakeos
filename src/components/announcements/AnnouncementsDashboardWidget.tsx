import { useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAnnouncements, useAnnouncementMutations } from "@/hooks/useAnnouncements";

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

export function AnnouncementsDashboardWidget() {
  const { data: announcements, isLoading } = useActiveAnnouncements();
  const { acknowledgeAnnouncement } = useAnnouncementMutations();
  const [showAll, setShowAll] = useState(false);

  const unreadAnnouncements = announcements?.filter((a) => !a.is_read) || [];
  const readAnnouncements = announcements?.filter((a) => a.is_read) || [];

  const displayAnnouncements = showAll ? announcements : unreadAnnouncements;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show widget if no announcements at all
  if (!announcements || announcements.length === 0) {
    return null;
  }

  // If all are read and we're not showing all, show a compact summary
  if (unreadAnnouncements.length === 0 && !showAll) {
    return (
      <Card className="border-muted">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Megaphone className="h-4 w-4" />
              <span>All announcements read</span>
              <Badge variant="secondary" className="text-xs">
                {readAnnouncements.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
              View all
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={unreadAnnouncements.length > 0 ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Announcements
            {unreadAnnouncements.length > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadAnnouncements.length} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {readAnnouncements.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="text-xs"
              >
                {showAll ? "Hide read" : `Show all (${announcements?.length})`}
                {showAll ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/app/announcements">
                View all
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayAnnouncements?.map((announcement) => (
          <div
            key={announcement.id}
            className={`p-3 rounded-lg border transition-colors ${
              announcement.is_read
                ? "bg-muted/30 border-muted"
                : "bg-background border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    to={`/app/announcements/${announcement.id}`}
                    className="font-medium text-sm hover:underline truncate"
                  >
                    {announcement.title}
                  </Link>
                  {announcement.is_read && (
                    <Check className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {formatDistanceToNow(new Date(announcement.publish_at || announcement.created_at), {
                    addSuffix: true,
                  })}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {truncateText(stripHtml(announcement.body_rte), 150)}
                </p>
              </div>
              {!announcement.is_read && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeAnnouncement.mutate(announcement.id)}
                  disabled={acknowledgeAnnouncement.isPending}
                  className="shrink-0"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark read
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}