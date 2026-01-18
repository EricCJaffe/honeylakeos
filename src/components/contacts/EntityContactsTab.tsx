import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  MoreVertical,
  Star,
  StarOff,
  Unlink,
  Pencil,
  Mail,
  Phone,
  User,
  Search,
  Loader2,
  UserPlus,
  Link2,
} from "lucide-react";
import {
  useEntityContacts,
  useEntityContactMutations,
  EntityContactType,
  EntityContact,
} from "@/hooks/useEntityContacts";
import { useExternalContacts } from "@/hooks/useExternalContacts";

interface EntityContactsTabProps {
  entityType: EntityContactType;
  entityId: string;
  entityName?: string;
  canEdit?: boolean;
}

export function EntityContactsTab({
  entityType,
  entityId,
  entityName,
  canEdit = true,
}: EntityContactsTabProps) {
  const { data: contacts, isLoading } = useEntityContacts(entityType, entityId);
  const { data: allContacts } = useExternalContacts();
  const { findOrCreateAndLink, linkContact, updateLink, unlinkContact, setPrimary } =
    useEntityContactMutations();

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<EntityContact | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Form state for new contact
  const [newContact, setNewContact] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    roleTitle: "",
    isPrimary: false,
  });

  // Form state for editing
  const [editForm, setEditForm] = React.useState({
    roleTitle: "",
  });

  const resetNewContact = () => {
    setNewContact({ fullName: "", email: "", phone: "", roleTitle: "", isPrimary: false });
  };

  const handleAddNew = async () => {
    if (!newContact.fullName.trim()) return;

    await findOrCreateAndLink.mutateAsync({
      entityType,
      entityId,
      fullName: newContact.fullName,
      email: newContact.email || null,
      phone: newContact.phone || null,
      roleTitle: newContact.roleTitle || undefined,
      isPrimary: newContact.isPrimary || contacts?.length === 0,
    });

    resetNewContact();
    setAddDialogOpen(false);
  };

  const handleLinkExisting = async (contactId: string) => {
    await linkContact.mutateAsync({
      entityType,
      entityId,
      contactId,
      isPrimary: contacts?.length === 0,
    });
    setSearchOpen(false);
    setLinkDialogOpen(false);
  };

  const handleUnlink = async (contact: EntityContact) => {
    await unlinkContact.mutateAsync({
      id: contact.id,
      entityType,
      entityId,
    });
  };

  const handleSetPrimary = async (contact: EntityContact) => {
    await setPrimary.mutateAsync({
      id: contact.id,
      entityType,
      entityId,
    });
  };

  const handleUpdateRole = async () => {
    if (!editingContact) return;

    await updateLink.mutateAsync({
      id: editingContact.id,
      entityType,
      entityId,
      roleTitle: editForm.roleTitle || null,
    });

    setEditingContact(null);
  };

  const openEditDialog = (contact: EntityContact) => {
    setEditForm({ roleTitle: contact.role_title || "" });
    setEditingContact(contact);
  };

  // Filter out already linked contacts
  const availableContacts = allContacts?.filter(
    (c) => !contacts?.some((ec) => ec.contact_id === c.id)
  );

  // Filter by search
  const filteredContacts = availableContacts?.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.organization_name?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const primaryContact = contacts?.find((c) => c.is_primary);
  const otherContacts = contacts?.filter((c) => !c.is_primary) ?? [];

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      {canEdit && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {contacts?.length ?? 0} Contact{contacts?.length !== 1 ? "s" : ""}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinkDialogOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Link Existing
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Add New
            </Button>
          </div>
        </div>
      )}

      {/* Primary Contact Card */}
      {primaryContact && (
        <Card className="border-primary/50">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <CardTitle className="text-base">Primary Contact</CardTitle>
              </div>
              {canEdit && (
                <ContactActions
                  contact={primaryContact}
                  isPrimary
                  onEdit={() => openEditDialog(primaryContact)}
                  onUnlink={() => handleUnlink(primaryContact)}
                  onSetPrimary={() => {}}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="py-3">
            <ContactCard contact={primaryContact} />
          </CardContent>
        </Card>
      )}

      {/* Other Contacts */}
      {otherContacts.length > 0 && (
        <div className="space-y-2">
          {otherContacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <ContactCard contact={contact} />
                  {canEdit && (
                    <ContactActions
                      contact={contact}
                      isPrimary={false}
                      onEdit={() => openEditDialog(contact)}
                      onUnlink={() => handleUnlink(contact)}
                      onSetPrimary={() => handleSetPrimary(contact)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {contacts?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No contacts linked to this {entityType}
            </p>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add New Contact Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Create a new contact and link it to {entityName || `this ${entityType}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={newContact.fullName}
                onChange={(e) =>
                  setNewContact((s) => ({ ...s, fullName: e.target.value }))
                }
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) =>
                    setNewContact((s) => ({ ...s, email: e.target.value }))
                  }
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact((s) => ({ ...s, phone: e.target.value }))
                  }
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleTitle">Role/Title</Label>
              <Input
                id="roleTitle"
                value={newContact.roleTitle}
                onChange={(e) =>
                  setNewContact((s) => ({ ...s, roleTitle: e.target.value }))
                }
                placeholder="e.g. CEO, Accountant, Primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNew}
              disabled={!newContact.fullName.trim() || findOrCreateAndLink.isPending}
            >
              {findOrCreateAndLink.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Existing Contact Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Existing Contact</DialogTitle>
            <DialogDescription>
              Search and select a contact to link to {entityName || `this ${entityType}`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start"
                >
                  <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                  Search contacts...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No contacts found.</CommandEmpty>
                    <CommandGroup>
                      {filteredContacts?.slice(0, 10).map((contact) => (
                        <CommandItem
                          key={contact.id}
                          value={contact.id}
                          onSelect={() => handleLinkExisting(contact.id)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{contact.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {contact.email || contact.organization_name || "No email"}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {availableContacts?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                All existing contacts are already linked.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Role</DialogTitle>
            <DialogDescription>
              Update the role for {editingContact?.contact?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="editRoleTitle">Role/Title</Label>
              <Input
                id="editRoleTitle"
                value={editForm.roleTitle}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, roleTitle: e.target.value }))
                }
                placeholder="e.g. CEO, Accountant, Primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateLink.isPending}>
              {updateLink.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Contact Card Component
function ContactCard({ contact }: { contact: EntityContact }) {
  const c = contact.contact;
  if (!c) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{c.full_name}</span>
        {contact.role_title && (
          <Badge variant="secondary" className="text-xs">
            {contact.role_title}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {c.email && (
          <a
            href={`mailto:${c.email}`}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Mail className="h-3 w-3" />
            {c.email}
          </a>
        )}
        {c.phone && (
          <a
            href={`tel:${c.phone}`}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Phone className="h-3 w-3" />
            {c.phone}
          </a>
        )}
      </div>
    </div>
  );
}

// Contact Actions Dropdown
function ContactActions({
  contact,
  isPrimary,
  onEdit,
  onUnlink,
  onSetPrimary,
}: {
  contact: EntityContact;
  isPrimary: boolean;
  onEdit: () => void;
  onUnlink: () => void;
  onSetPrimary: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Role
        </DropdownMenuItem>
        {!isPrimary && (
          <DropdownMenuItem onClick={onSetPrimary}>
            <Star className="h-4 w-4 mr-2" />
            Set as Primary
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onUnlink} className="text-destructive">
          <Unlink className="h-4 w-4 mr-2" />
          Unlink Contact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
