import { useState, useEffect } from "react";
import { Link2, Plus, X, Search, ArrowRight, Loader2, Lock, Archive, User, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyModules, ENTITY_TO_MODULE_MAP } from "@/hooks/useCompanyModules";
import { useCompanyTerminology } from "@/hooks/useCompanyTerminology";
import {
  useEntityLinks,
  useModuleAwareEntitySearch,
  EntityType,
  LinkType,
  EntityLink,
} from "@/hooks/useEntityLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const ENTITY_TYPES: { value: EntityType; label: string; icon: string }[] = [
  { value: "task", label: "Task", icon: "✓" },
  { value: "project", label: "Project", icon: "📋" },
  { value: "note", label: "Note", icon: "📝" },
  { value: "document", label: "Document", icon: "📄" },
  { value: "event", label: "Event", icon: "📅" },
  { value: "crm_client", label: "Client", icon: "🤝" },
  { value: "external_contact", label: "Contact", icon: "👤" },
  { value: "coach_profile", label: "Coach/Partner", icon: "🎓" },
];

const LINK_TYPES: { value: LinkType; label: string; color: string }[] = [
  { value: "related", label: "Related", color: "bg-muted text-muted-foreground" },
  { value: "blocks", label: "Blocks", color: "bg-destructive/10 text-destructive" },
  { value: "depends_on", label: "Depends on", color: "bg-warning/10 text-warning" },
  { value: "reference", label: "Reference", color: "bg-primary/10 text-primary" },
];

interface EntityLinksPanelProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
}

interface EntityDetails {
  id: string;
  name: string;
  subtitle?: string;
  status?: string;
  isArchived?: boolean;
  type?: string;
}

function LinkedEntityItem({
  link,
  currentEntityId,
  currentEntityType,
  onDelete,
}: {
  link: EntityLink;
  currentEntityId: string;
  currentEntityType: EntityType;
  onDelete: (linkId: string) => void;
}) {
  const isSource = link.from_id === currentEntityId && link.from_type === currentEntityType;
  const targetType = isSource ? link.to_type : link.from_type;
  const targetId = isSource ? link.to_id : link.from_id;
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();
  const { getSingular } = useCompanyTerminology();

  const isTargetModuleEnabled = isEntityModuleEnabled(targetType);

  const { data: entityData, error: entityError } = useQuery({
    queryKey: ["entity-details", targetType, targetId],
    queryFn: async (): Promise<EntityDetails | null> => {
      switch (targetType) {
        case "task": {
          const { data } = await supabase.from("tasks").select("id, title, status").eq("id", targetId).single();
          return data ? { id: data.id, name: data.title, status: data.status } : null;
        }
        case "project": {
          const { data } = await supabase.from("projects").select("id, name, status").eq("id", targetId).single();
          return data ? { id: data.id, name: data.name, status: data.status } : null;
        }
        case "note": {
          const { data } = await supabase.from("notes").select("id, title, status").eq("id", targetId).single();
          return data ? { id: data.id, name: data.title, status: data.status } : null;
        }
        case "document": {
          const { data } = await supabase.from("documents").select("id, name").eq("id", targetId).single();
          return data ? { id: data.id, name: data.name } : null;
        }
        case "event": {
          const { data } = await supabase.from("events").select("id, title").eq("id", targetId).single();
          return data ? { id: data.id, name: data.title } : null;
        }
        case "crm_client": {
          const { data } = await supabase
            .from("crm_clients")
            .select("id, type, lifecycle_status, archived_at, person_full_name, org_name")
            .eq("id", targetId)
            .single();
          if (!data) return null;
          const name = data.type === "organization" ? data.org_name : data.person_full_name;
          const subtitle = data.lifecycle_status === "prospect" ? "Prospect" : "Client";
          return {
            id: data.id,
            name: name || "Unnamed",
            subtitle: `${subtitle} • ${data.type === "organization" ? "Org" : "Person"}`,
            isArchived: !!data.archived_at,
            type: data.type,
          };
        }
        case "external_contact": {
          const { data } = await supabase
            .from("external_contacts")
            .select("id, full_name, email, organization_name, archived_at")
            .eq("id", targetId)
            .single();
          if (!data) return null;
          const subtitle = [data.email, data.organization_name].filter(Boolean).join(" • ");
          return {
            id: data.id,
            name: data.full_name,
            subtitle: subtitle || undefined,
            isArchived: !!data.archived_at,
          };
        }
        case "coach_profile": {
          const { data } = await supabase
            .from("coach_profiles")
            .select("id, profile_type, archived_at, external_contacts(full_name, email)")
            .eq("id", targetId)
            .single();
          if (!data) return null;
          const contact = data.external_contacts as { full_name: string; email: string | null } | null;
          const typeLabel = data.profile_type === "coach" ? "Coach" : data.profile_type === "partner" ? "Partner" : "Vendor";
          return {
            id: data.id,
            name: contact?.full_name || "Unknown",
            subtitle: `${typeLabel}${contact?.email ? ` • ${contact.email}` : ""}`,
            isArchived: !!data.archived_at,
            type: data.profile_type,
          };
        }
        default:
          return null;
      }
    },
    enabled: !!targetId && !!activeCompanyId && isTargetModuleEnabled && !modulesLoading,
  });

  // Get dynamic label for CRM entity type
  const getEntityLabel = (type: EntityType): string => {
    if (type === "crm_client") {
      return getSingular("crm_client");
    }
    return ENTITY_TYPES.find((t) => t.value === type)?.label || type;
  };

  const entityConfig = ENTITY_TYPES.find((t) => t.value === targetType);
  const linkConfig = LINK_TYPES.find((t) => t.value === link.link_type);

  // Graceful degradation: show disabled state if module is disabled
  if (!modulesLoading && !isTargetModuleEnabled) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-dashed bg-muted/30 opacity-60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {getEntityLabel(targetType)} module disabled
            </p>
            <p className="text-xs text-muted-foreground/70">
              Enable the module to view this link
            </p>
          </div>
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Disabled
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onDelete(link.id)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-lg">{entityConfig?.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">
              {entityData?.name || (entityError ? "Unable to load" : "Loading...")}
            </p>
            {entityData?.isArchived && (
              <Archive className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {entityData?.subtitle ? (
              <span className="truncate">{entityData.subtitle}</span>
            ) : (
              <>
                <span className="capitalize">{getEntityLabel(targetType)}</span>
                {!isSource && (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    <span>links here</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <Badge variant="outline" className={linkConfig?.color}>
          {linkConfig?.label}
        </Badge>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onDelete(link.id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddLinkDialog({
  entityType,
  entityId,
  onAdd,
}: {
  entityType: EntityType;
  entityId: string;
  onAdd: (toType: EntityType, toId: string, linkType: LinkType) => void;
}) {
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();
  const { getSingular } = useCompanyTerminology();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EntityType>("task");
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>("related");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter entity types to only show enabled modules
  const availableEntityTypes = ENTITY_TYPES.filter((t) => {
    if (modulesLoading) return true;
    return isEntityModuleEnabled(t.value);
  }).map((t) => ({
    ...t,
    // Use terminology for CRM
    label: t.value === "crm_client" ? getSingular("crm_client") : t.label,
  }));

  const { data: searchResults = [], isLoading } = useModuleAwareEntitySearch(selectedType, searchQuery);

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedType, selectedId, selectedLinkType);
      setOpen(false);
      setSearchQuery("");
      setSelectedId(null);
    }
  };

  useEffect(() => {
    if (availableEntityTypes.length > 0 && !availableEntityTypes.find((t) => t.value === selectedType)) {
      setSelectedType(availableEntityTypes[0].value);
    }
  }, [availableEntityTypes, selectedType]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedId(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Entity Type</label>
              <Select
                value={selectedType}
                onValueChange={(v) => {
                  setSelectedType(v as EntityType);
                  setSelectedId(null);
                  setSearchQuery("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableEntityTypes
                    .filter((t) => t.value !== entityType || entityId !== selectedId)
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Link Type</label>
              <Select value={selectedLinkType} onValueChange={(v) => setSelectedLinkType(v as LinkType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Search {availableEntityTypes.find((t) => t.value === selectedType)?.label || selectedType}
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {searchQuery.length >= 2 && (
            <ScrollArea className="h-48 rounded-md border">
              {isLoading ? (
                <div className="flex items-center justify-center h-full p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
                  No results found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedId(result.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedId === result.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      {result.name}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedId}>
              Add Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EntityLinksPanel({ entityType, entityId, title = "Links" }: EntityLinksPanelProps) {
  const { links, isLoading, createLink, deleteLink, isModuleEnabled } = useEntityLinks(entityType, entityId);
  const { isEntityModuleEnabled, loading: modulesLoading, getEnabledModuleKeys } = useCompanyModules();
  const { getSingular } = useCompanyTerminology();

  const handleAddLink = (toType: EntityType, toId: string, linkType: LinkType) => {
    createLink.mutate({ toType, toId, linkType });
  };

  const handleDeleteLink = (linkId: string) => {
    deleteLink.mutate(linkId);
  };

  // Check if there are any other modules enabled to link to
  const enabledModuleKeys = getEnabledModuleKeys();
  const hasLinkableModules = ENTITY_TYPES.some((t) => {
    const moduleKey = ENTITY_TO_MODULE_MAP[t.value];
    return moduleKey && enabledModuleKeys.includes(moduleKey);
  });

  const canAddLinks = isModuleEnabled && hasLinkableModules && !modulesLoading;

  // Get dynamic label for the entity type
  const getEntityLabel = (type: EntityType): string => {
    if (type === "crm_client") return getSingular("crm_client");
    return ENTITY_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            {title}
          </CardTitle>
          {canAddLinks && <AddLinkDialog entityType={entityType} entityId={entityId} onAdd={handleAddLink} />}
        </div>
      </CardHeader>
      <CardContent>
        {!isModuleEnabled && !modulesLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Module disabled</p>
            <p className="text-xs mt-1">Enable the {getEntityLabel(entityType)} module to manage links</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No links yet</p>
            <p className="text-xs mt-1">Link this {getEntityLabel(entityType).toLowerCase()} to other items</p>
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <LinkedEntityItem
                key={link.id}
                link={link}
                currentEntityId={entityId}
                currentEntityType={entityType}
                onDelete={handleDeleteLink}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
