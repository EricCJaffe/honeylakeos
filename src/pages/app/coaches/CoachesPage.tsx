import { useState } from "react";
import { Plus, Search, Users, Archive, MoreHorizontal, Pencil, Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuard } from "@/components/ModuleGuard";
import { CoachFormDialog } from "./CoachFormDialog";
import { useCoachProfiles, CoachProfile, CoachProfileType, getProfileTypeLabel } from "@/hooks/useCoachProfiles";
import { useNavigate } from "react-router-dom";

function CoachCard({ 
  profile, 
  onEdit, 
  onArchive, 
  onUnarchive, 
  onDelete 
}: { 
  profile: CoachProfile;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const contact = profile.external_contact;
  const isArchived = !!profile.archived_at;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties as string[] : [];

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/app/coaches/${profile.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {contact?.full_name || "Unknown"}
              {isArchived && (
                <Badge variant="secondary" className="text-xs">Archived</Badge>
              )}
            </CardTitle>
            {contact?.title && (
              <p className="text-sm text-muted-foreground">{contact.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getProfileTypeLabel(profile.profile_type as CoachProfileType)}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {isArchived ? (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnarchive(); }}>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {contact?.organization_name && (
            <p className="text-muted-foreground">{contact.organization_name}</p>
          )}
          {contact?.email && (
            <p className="text-muted-foreground">{contact.email}</p>
          )}
          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {specialties.slice(0, 3).map((specialty, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
              {specialties.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{specialties.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CoachesListContent() {
  const [search, setSearch] = useState("");
  const [profileType, setProfileType] = useState<CoachProfileType | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CoachProfile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<CoachProfile | null>(null);

  const { 
    profiles, 
    isLoading, 
    archiveProfile, 
    unarchiveProfile, 
    deleteProfile 
  } = useCoachProfiles({
    profileType: profileType === "all" ? undefined : profileType,
    showArchived,
    search,
  });

  const handleEdit = (profile: CoachProfile) => {
    setEditingProfile(profile);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProfile(null);
  };

  const handleConfirmDelete = async () => {
    if (profileToDelete) {
      await deleteProfile(profileToDelete.id);
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coaches & Partners" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaches & Partners"
        actionLabel="Add"
        onAction={() => setDialogOpen(true)}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or organization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={profileType}
          onValueChange={(v) => setProfileType(v as CoachProfileType | "all")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="coach">Coaches</SelectItem>
            <SelectItem value="partner">Partners</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived">Show Archived</Label>
        </div>
      </div>

      {/* Content */}
      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No coaches or partners yet"
          description="Add coaches, partners, or vendors to track and manage your external collaborators."
          actionLabel="Add Coach/Partner"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <CoachCard
              key={profile.id}
              profile={profile}
              onEdit={() => handleEdit(profile)}
              onArchive={() => archiveProfile(profile.id)}
              onUnarchive={() => unarchiveProfile(profile.id)}
              onDelete={() => {
                setProfileToDelete(profile);
                setDeleteDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <CoachFormDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        profile={editingProfile}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this profile? This action cannot be undone.
              The external contact record will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CoachesPage() {
  return (
    <ModuleGuard moduleKey="coaches" moduleName="Coaches & Partners">
      <CoachesListContent />
    </ModuleGuard>
  );
}
