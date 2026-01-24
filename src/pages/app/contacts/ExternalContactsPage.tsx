import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
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
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Archive,
  ArchiveRestore,
  Trash2,
  Pencil,
  Users,
} from "lucide-react";
import {
  useExternalContacts,
  useExternalContactMutations,
  ExternalContact,
  formatExternalContactLabel,
} from "@/hooks/useExternalContacts";
import { ExternalContactFormDialog } from "./ExternalContactFormDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function ContactCard({
  contact,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  contact: ExternalContact;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const isArchived = !!contact.archived_at;
  const navigate = useNavigate();

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${isArchived ? "opacity-60" : ""}`}
      onClick={() => navigate(`/app/contacts/${contact.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">
                {formatExternalContactLabel(contact)}
              </h3>
              {isArchived && (
                <Badge variant="secondary" className="text-xs">
                  Archived
                </Badge>
              )}
            </div>
            {contact.title && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {contact.title}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </span>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </span>
              )}
              {contact.organization_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {contact.organization_name}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {isArchived ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnarchive();
                  }}
                >
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
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

export default function ExternalContactsPage() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ExternalContact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ExternalContact | null>(null);

  const { data: contacts = [], isLoading } = useExternalContacts({
    search,
    showArchived,
  });
  const { archive, unarchive, remove } = useExternalContactMutations();

  const handleEdit = (contact: ExternalContact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleArchive = async (contact: ExternalContact) => {
    try {
      await archive.mutateAsync(contact.id);
      toast.success("Contact archived");
    } catch {
      toast.error("Failed to archive contact");
    }
  };

  const handleUnarchive = async (contact: ExternalContact) => {
    try {
      await unarchive.mutateAsync(contact.id);
      toast.success("Contact restored");
    } catch {
      toast.error("Failed to restore contact");
    }
  };

  const handleDeleteClick = (contact: ExternalContact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    try {
      await remove.mutateAsync(contactToDelete.id);
      toast.success("Contact deleted");
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingContact(null);
  };

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title="Contacts"
        description="Manage external contacts, clients, and partners"
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived" className="text-sm whitespace-nowrap">
            Show archived
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description={
            search
              ? "No contacts match your search"
              : "Add your first external contact to get started"
          }
          actionLabel={!search ? "Add Contact" : undefined}
          onAction={!search ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => handleEdit(contact)}
              onArchive={() => handleArchive(contact)}
              onUnarchive={() => handleUnarchive(contact)}
              onDelete={() => handleDeleteClick(contact)}
            />
          ))}
        </div>
      )}

      <ExternalContactFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        contact={editingContact}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{contactToDelete?.full_name}" and remove
              all associated links. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
