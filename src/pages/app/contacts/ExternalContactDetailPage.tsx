import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load rich text display for consistent rendering
const RichTextDisplay = React.lazy(() => 
  import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay }))
);
import { EmptyState } from "@/components/EmptyState";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Mail,
  Phone,
  Building2,
  Globe,
  User,
} from "lucide-react";
import {
  useExternalContact,
  useExternalContactMutations,
} from "@/hooks/useExternalContacts";
import { ExternalContactFormDialog } from "./ExternalContactFormDialog";
import { toast } from "sonner";

import { format } from "date-fns";

export default function ExternalContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading, error } = useExternalContact(id);
  const { archive, unarchive, remove } = useExternalContactMutations();

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="container py-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container py-6 max-w-4xl">
        <EmptyState
          icon={User}
          title="Contact Not Found"
          description="The contact you're looking for doesn't exist or you don't have access."
          actionLabel="Go Back"
          onAction={() => navigate("/app/contacts")}
        />
      </div>
    );
  }

  const isArchived = !!contact.archived_at;

  const handleArchive = async () => {
    try {
      await archive.mutateAsync(contact.id);
      toast.success("Contact archived");
    } catch {
      toast.error("Failed to archive contact");
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchive.mutateAsync(contact.id);
      toast.success("Contact restored");
    } catch {
      toast.error("Failed to restore contact");
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(contact.id);
      toast.success("Contact deleted");
      navigate("/app/contacts");
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/app/contacts")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <PageHeader
        title={contact.full_name}
        description={
          contact.organization_name
            ? `${contact.title ? `${contact.title} at ` : ""}${contact.organization_name}`
            : contact.title || "External Contact"
        }
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {isArchived ? (
              <DropdownMenuItem onClick={handleUnarchive}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {isArchived && (
        <Badge variant="secondary" className="mb-4">
          Archived
        </Badge>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-sm hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}
            {contact.organization_name && (
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="text-sm">{contact.organization_name}</p>
                </div>
              </div>
            )}
            {contact.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {contact.website}
                  </a>
                </div>
              </div>
            )}
            {!contact.email && !contact.phone && !contact.organization_name && !contact.website && (
              <p className="text-sm text-muted-foreground italic">
                No contact information provided
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.notes ? (
              <React.Suspense fallback={<Skeleton className="h-8 w-full" />}>
                <RichTextDisplay content={contact.notes} className="text-sm" />
              </React.Suspense>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <EntityLinksPanel
          entityType="external_contact"
          entityId={contact.id}
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Created: {format(new Date(contact.created_at), "PPp")}</p>
            <p>Updated: {format(new Date(contact.updated_at), "PPp")}</p>
          </CardContent>
        </Card>
      </div>

      <ExternalContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={contact}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{contact.full_name}" and remove all
              associated links. This action cannot be undone.
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
