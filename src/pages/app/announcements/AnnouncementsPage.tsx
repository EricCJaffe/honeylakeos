import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Megaphone, Check, Clock, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { useActiveAnnouncements, useAnnouncementMutations } from "@/hooks/useAnnouncements";

// Lazy load rich text display
const RichTextDisplay = React.lazy(() =>
  import("@/components/ui/rich-text-editor").then((m) => ({ default: m.RichTextDisplay }))
);

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { data: announcements, isLoading } = useActiveAnnouncements();
  const { acknowledgeAnnouncement } = useAnnouncementMutations();
  const [filter, setFilter] = React.useState<"unread" | "all">("unread");

  const unreadAnnouncements = announcements?.filter((a) => !a.is_read) || [];
  const displayAnnouncements = filter === "unread" ? unreadAnnouncements : announcements;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Announcements" description="Company-wide announcements and updates" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Company-wide announcements and updates" />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "unread" | "all")}>
        <TabsList>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <EyeOff className="h-3 w-3" />
            Unread
            {unreadAnnouncements.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {unreadAnnouncements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Eye className="h-3 w-3" />
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {!displayAnnouncements || displayAnnouncements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={filter === "unread" ? "All caught up!" : "No announcements"}
              description={
                filter === "unread"
                  ? "You've read all announcements."
                  : "There are no announcements yet."
              }
            />
          ) : (
            <div className="space-y-4">
              {displayAnnouncements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={announcement.is_read ? "opacity-75" : ""}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Link
                            to={`/app/announcements/${announcement.id}`}
                            className="text-lg font-semibold hover:underline"
                          >
                            {announcement.title}
                          </Link>
                          {announcement.is_read && (
                            <Badge variant="outline" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Read
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(
                              new Date(announcement.publish_at || announcement.created_at),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(
                              new Date(announcement.publish_at || announcement.created_at),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <React.Suspense fallback={<Skeleton className="h-16 w-full" />}>
                            <RichTextDisplay content={announcement.body_rte} />
                          </React.Suspense>
                        </div>
                      </div>
                      {!announcement.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAnnouncement.mutate(announcement.id)}
                          disabled={acknowledgeAnnouncement.isPending}
                          className="shrink-0"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}