import * as React from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAnnouncementMutations, type Announcement } from "@/hooks/useAnnouncements";

// Lazy load rich text editor
const RichTextEditor = React.lazy(() =>
  import("@/components/ui/rich-text-editor").then((m) => ({ default: m.RichTextEditor }))
);

interface AnnouncementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
}

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  announcement,
}: AnnouncementFormDialogProps) {
  const [title, setTitle] = React.useState("");
  const [bodyRte, setBodyRte] = React.useState("");
  const [publishAt, setPublishAt] = React.useState<Date | undefined>();
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { createAnnouncement, updateAnnouncement, publishAnnouncement } = useAnnouncementMutations();

  const isEditing = !!announcement;

  React.useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setBodyRte(announcement.body_rte);
      setPublishAt(announcement.publish_at ? new Date(announcement.publish_at) : undefined);
      setExpiresAt(announcement.expires_at ? new Date(announcement.expires_at) : undefined);
    } else {
      setTitle("");
      setBodyRte("");
      setPublishAt(undefined);
      setExpiresAt(undefined);
    }
  }, [announcement, open]);

  const handleSaveDraft = async () => {
    if (!title.trim() || !bodyRte.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateAnnouncement.mutateAsync({
          id: announcement.id,
          title,
          body_rte: bodyRte,
          publish_at: publishAt?.toISOString() || null,
          expires_at: expiresAt?.toISOString() || null,
        });
      } else {
        await createAnnouncement.mutateAsync({
          title,
          body_rte: bodyRte,
          status: "draft",
          publish_at: publishAt?.toISOString() || null,
          expires_at: expiresAt?.toISOString() || null,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNow = async () => {
    if (!title.trim() || !bodyRte.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateAnnouncement.mutateAsync({
          id: announcement.id,
          title,
          body_rte: bodyRte,
          expires_at: expiresAt?.toISOString() || null,
        });
        await publishAnnouncement.mutateAsync(announcement.id);
      } else {
        const created = await createAnnouncement.mutateAsync({
          title,
          body_rte: bodyRte,
          status: "draft",
          expires_at: expiresAt?.toISOString() || null,
        });
        await publishAnnouncement.mutateAsync(created.id);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = title.trim() && bodyRte.trim() && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the announcement details."
              : "Create a new announcement for your company."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
            />
          </div>

          <div className="space-y-2">
            <Label>Content *</Label>
            <React.Suspense
              fallback={
                <div className="h-48 border rounded-md flex items-center justify-center text-muted-foreground">
                  Loading editor...
                </div>
              }
            >
              <RichTextEditor
                value={bodyRte}
                onChange={setBodyRte}
                placeholder="Write your announcement..."
              />
            </React.Suspense>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Schedule Publish (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !publishAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {publishAt ? format(publishAt, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={publishAt}
                    onSelect={setPublishAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Expires On (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP") : "No expiry"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Draft
          </Button>
          <Button onClick={handlePublishNow} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Publish Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}