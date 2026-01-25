import * as React from "react";
import { Plus, Megaphone, Send, Archive, Trash2, Edit, Users, Clock, MoreHorizontal } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useAnnouncements,
  useAnnouncementMutations,
  useAnnouncementReadCount,
  type Announcement,
  type AnnouncementStatus,
} from "@/hooks/useAnnouncements";
import { AnnouncementFormDialog } from "./AnnouncementFormDialog";

function AnnouncementCard({
  announcement,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: {
  announcement: Announcement;
  onEdit: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { data: readStats } = useAnnouncementReadCount(
    announcement.status === "published" ? announcement.id : undefined
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold truncate">{announcement.title}</h3>
              <Badge
                variant={
                  announcement.status === "published"
                    ? "default"
                    : announcement.status === "draft"
                    ? "secondary"
                    : "outline"
                }
              >
                {announcement.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {format(new Date(announcement.created_at), "MMM d, yyyy")}
                </span>
              </div>
              {announcement.status === "published" && readStats && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>
                    {readStats.readCount}/{readStats.totalMembers} read
                  </span>
                </div>
              )}
              {announcement.publish_at && announcement.status === "draft" && (
                <div className="flex items-center gap-1 text-primary">
                  <Clock className="h-3 w-3" />
                  <span>
                    Scheduled: {format(new Date(announcement.publish_at), "MMM d 'at' h:mm a")}
                  </span>
                </div>
              )}
              {announcement.expires_at && (
                <div className="flex items-center gap-1">
                  <span>
                    Expires: {formatDistanceToNow(new Date(announcement.expires_at), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {announcement.status === "draft" && (
                <DropdownMenuItem onClick={onPublish}>
                  <Send className="h-4 w-4 mr-2" />
                  Publish Now
                </DropdownMenuItem>
              )}
              {announcement.status === "published" && (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnnouncementsAdminPage() {
  const [activeTab, setActiveTab] = React.useState<AnnouncementStatus>("draft");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Announcement | null>(null);

  const { data: announcements, isLoading } = useAnnouncements(activeTab);
  const { publishAnnouncement, archiveAnnouncement, deleteAnnouncement } = useAnnouncementMutations();

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAnnouncement.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingAnnouncement(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Announcements"
        description="Create and manage company-wide announcements"
        actionLabel="New Announcement"
        onAction={() => setFormOpen(true)}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnnouncementStatus)}>
        <TabsList>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : !announcements || announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={`No ${activeTab} announcements`}
              description={
                activeTab === "draft"
                  ? "Create a new announcement to get started."
                  : `No ${activeTab} announcements yet.`
              }
              actionLabel={activeTab === "draft" ? "New Announcement" : undefined}
              onAction={activeTab === "draft" ? () => setFormOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onEdit={() => handleEdit(announcement)}
                  onPublish={() => publishAnnouncement.mutate(announcement.id)}
                  onArchive={() => archiveAnnouncement.mutate(announcement.id)}
                  onDelete={() => setDeleteTarget(announcement)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        announcement={editingAnnouncement}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}