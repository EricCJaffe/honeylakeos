import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Pencil, 
  Archive, 
  ArchiveRestore, 
  Trash2,
  Mail,
  Phone,
  Building2,
  Globe,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ModuleGuard } from "@/components/ModuleGuard";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { CoachFormDialog } from "./CoachFormDialog";
import { useCoachProfile, useCoachProfiles, CoachProfileType, getProfileTypeLabel } from "@/hooks/useCoachProfiles";
import { format } from "date-fns";

function CoachDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useCoachProfile(id);
  const { archiveProfile, unarchiveProfile, deleteProfile } = useCoachProfiles();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/app/coaches")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Coaches & Partners
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Profile not found or you don't have access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const contact = profile.external_contact;
  const isArchived = !!profile.archived_at;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties as string[] : [];

  const handleArchive = async () => {
    await archiveProfile(profile.id);
  };

  const handleUnarchive = async () => {
    await unarchiveProfile(profile.id);
  };

  const handleDelete = async () => {
    await deleteProfile(profile.id);
    navigate("/app/coaches");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/coaches")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{contact?.full_name || "Unknown"}</h1>
              <Badge variant="outline">{getProfileTypeLabel(profile.profile_type as CoachProfileType)}</Badge>
              {isArchived && <Badge variant="secondary">Archived</Badge>}
            </div>
            {contact?.title && (
              <p className="text-muted-foreground">{contact.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {isArchived ? (
            <Button variant="outline" onClick={handleUnarchive}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore
            </Button>
          ) : (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact?.organization_name && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.organization_name}</span>
                </div>
              )}
              {contact?.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {contact.website}
                  </a>
                </div>
              )}
              {!contact?.email && !contact?.phone && !contact?.organization_name && !contact?.website && (
                <p className="text-muted-foreground text-sm">No contact information available.</p>
              )}
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {specialties.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Specialties</h4>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="secondary">{specialty}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.bio && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Bio/Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}
              {!specialties.length && !profile.bio && (
                <p className="text-muted-foreground text-sm">No additional profile details.</p>
              )}
            </CardContent>
          </Card>

          {/* Linked Items */}
          <EntityLinksPanel entityId={profile.id} entityType="coach_profile" />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{format(new Date(profile.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span>{format(new Date(profile.updated_at), "MMM d, yyyy")}</span>
              </div>
              {isArchived && profile.archived_at && (
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Archived:</span>
                  <span>{format(new Date(profile.archived_at), "MMM d, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CoachFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CoachDetailPage() {
  return (
    <ModuleGuard moduleKey="coaches" moduleName="Coaches & Partners">
      <CoachDetailContent />
    </ModuleGuard>
  );
}
