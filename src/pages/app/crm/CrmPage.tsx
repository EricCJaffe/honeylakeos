import * as React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuard } from "@/components/ModuleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  User,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { useCompanyTerminology } from "@/hooks/useCompanyTerminology";
import {
  useCrmClients,
  CrmClient,
  CrmClientFilters,
  getCrmClientDisplayName,
  getCrmClientEmail,
} from "@/hooks/useCrmClients";
import { CrmFormDialog } from "./CrmFormDialog";
import { format } from "date-fns";

function CrmClientCard({
  client,
  clientTerm,
  onClick,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  client: CrmClient;
  clientTerm: string;
  onClick: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const isArchived = !!client.archived_at;
  const email = getCrmClientEmail(client);
  const phone = client.person_phone || client.org_phone;
  
  // Determine display: org name first, then primary contact
  const orgName = client.org_name;
  const personName = client.person_full_name;
  const primaryTitle = orgName || personName || "Unknown";
  const secondaryTitle = orgName && personName ? personName : null;

  return (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${isArchived ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Primary: Org/Company Name */}
            <div className="flex items-center gap-2 mb-1">
              {client.type === "b2c" ? (
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : client.type === "b2b" ? (
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <h3 className="font-medium truncate">{primaryTitle}</h3>
            </div>

            {/* Secondary: Primary Contact Name */}
            {secondaryTitle && (
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                {secondaryTitle}
              </p>
            )}

            {/* Contact Info: Email • Phone */}
            {(email || phone) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-2">
                {email && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    {email}
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {phone}
                  </span>
                )}
              </div>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2">
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
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function CrmListContent() {
  const navigate = useNavigate();
  const { getSingular, getPlural } = useCompanyTerminology();
  const clientTerm = getSingular("crm_client");
  const clientsTermPlural = getPlural("crm_client");

  const [filters, setFilters] = React.useState<CrmClientFilters>({
    lifecycleStatus: "all",
    type: "all",
    showArchived: false,
    search: "",
  });
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<CrmClient | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const {
    clients,
    isLoading,
    archiveClient,
    unarchiveClient,
    deleteClient,
  } = useCrmClients(filters);

  const handleEdit = (client: CrmClient) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingClient(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteClient.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Count active vs archived
  const activeCount = clients.filter((c) => !c.archived_at).length;
  const archivedCount = clients.filter((c) => c.archived_at).length;

  return (
    <div className="container py-6 max-w-6xl">
      <PageHeader
        title={clientsTermPlural}
        description={`Manage your prospects and ${clientsTermPlural.toLowerCase()}`}
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add {clientTerm}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${clientsTermPlural.toLowerCase()}...`}
            className="pl-9"
            value={filters.search || ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <Select
          value={filters.lifecycleStatus || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, lifecycleStatus: v as any }))
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospects</SelectItem>
            <SelectItem value="client">{clientsTermPlural}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, type: v as any }))}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="b2c">B2C</SelectItem>
            <SelectItem value="b2b">B2B</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Active/Archived */}
      <Tabs
        value={filters.showArchived ? "archived" : "active"}
        onValueChange={(v) =>
          setFilters((f) => ({ ...f, showArchived: v === "archived" }))
        }
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived ({archivedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            filters.showArchived
              ? `No Archived ${clientsTermPlural}`
              : `No ${clientsTermPlural} Yet`
          }
          description={
            filters.showArchived
              ? `Archived ${clientsTermPlural.toLowerCase()} will appear here.`
              : filters.search
              ? `No ${clientsTermPlural.toLowerCase()} match your search.`
              : `Get started by adding your first ${clientTerm.toLowerCase()}.`
          }
          actionLabel={!filters.showArchived && !filters.search ? `Add ${clientTerm}` : undefined}
          onAction={!filters.showArchived && !filters.search ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((client) => (
            <CrmClientCard
              key={client.id}
              client={client}
              clientTerm={clientTerm}
              onClick={() => navigate(`/app/crm/${client.id}`)}
              onEdit={() => handleEdit(client)}
              onArchive={() => archiveClient.mutate(client.id)}
              onUnarchive={() => unarchiveClient.mutate(client.id)}
              onDelete={() => setDeleteConfirmId(client.id)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <CrmFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        client={editingClient}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {clientTerm}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {clientTerm.toLowerCase()} and remove all associated links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

export default function CrmPage() {
  return (
    <ModuleGuard moduleKey="crm" moduleName="CRM">
      <CrmListContent />
    </ModuleGuard>
  );
}
