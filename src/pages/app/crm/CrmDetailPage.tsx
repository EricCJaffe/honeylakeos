import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import {
  ArrowLeft,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useCompanyTerminology } from "@/hooks/useCompanyTerminology";
import {
  useCrmClient,
  useCrmClients,
  getCrmClientDisplayName,
} from "@/hooks/useCrmClients";
import { CrmFormDialog } from "./CrmFormDialog";
import { format } from "date-fns";

function InfoRow({
  icon: Icon,
  label,
  value,
  isLink,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    </div>
  );
}

function CrmDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSingular } = useCompanyTerminology();
  const clientTerm = getSingular("crm_client");

  const { data: client, isLoading, error } = useCrmClient(id);
  const { archiveClient, unarchiveClient, deleteClient } = useCrmClients();

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const handleArchive = async () => {
    if (!client) return;
    await archiveClient.mutateAsync(client.id);
  };

  const handleUnarchive = async () => {
    if (!client) return;
    await unarchiveClient.mutateAsync(client.id);
  };

  const handleDelete = async () => {
    if (!client) return;
    await deleteClient.mutateAsync(client.id);
    navigate("/app/crm");
  };

  if (isLoading) {
    return (
      <div className="container py-6 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container py-6 max-w-4xl">
        <EmptyState
          icon={AlertCircle}
          title={`${clientTerm} Not Found`}
          description={`The ${clientTerm.toLowerCase()} you're looking for doesn't exist or you don't have access.`}
          actionLabel="Go Back"
          onAction={() => navigate("/app/crm")}
        />
        />
      </div>
    );
  }

  const displayName = getCrmClientDisplayName(client);
  const isArchived = !!client.archived_at;

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/crm")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <PageHeader title={displayName} description="">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
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
          <Button
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </PageHeader>

      {/* Status Badges */}
      <div className="flex items-center gap-2 mb-6">
        <Badge
          variant={client.lifecycle_status === "client" ? "default" : "secondary"}
        >
          {client.lifecycle_status === "client" ? clientTerm : "Prospect"}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {client.type}
        </Badge>
        {isArchived && <Badge variant="destructive">Archived</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Person Info */}
        {(client.person_full_name || client.person_email || client.person_phone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={User} label="Full Name" value={client.person_full_name} />
              <InfoRow icon={Mail} label="Email" value={client.person_email} />
              <InfoRow icon={Phone} label="Phone" value={client.person_phone} />
            </CardContent>
          </Card>
        )}

        {/* Organization Info */}
        {(client.org_name || client.org_email || client.org_phone || client.org_website) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow icon={Building2} label="Name" value={client.org_name} />
              <InfoRow icon={Mail} label="Email" value={client.org_email} />
              <InfoRow icon={Phone} label="Phone" value={client.org_phone} />
              <InfoRow icon={Globe} label="Website" value={client.org_website} isLink />
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {client.notes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Linked Items */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Linked Items</CardTitle>
            <CardDescription>
              Projects, tasks, events, notes, and documents related to this{" "}
              {clientTerm.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EntityLinksPanel entityType="task" entityId={client.id} />
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{format(new Date(client.created_at), "PPp")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p>{format(new Date(client.updated_at), "PPp")}</p>
              </div>
              {client.archived_at && (
                <div>
                  <p className="text-muted-foreground">Archived</p>
                  <p>{format(new Date(client.archived_at), "PPp")}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Active</p>
                <p>{client.is_active ? "Yes" : "No"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <CrmFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={client}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {clientTerm}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "
              {displayName}" and remove all associated links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CrmDetailPage() {
  return (
    <ModuleGuard moduleKey="crm" moduleName="CRM">
      <CrmDetailContent />
    </ModuleGuard>
  );
}
