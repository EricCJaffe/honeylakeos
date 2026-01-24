import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCompanyModules, ENTITY_TO_MODULE_MAP } from "./useCompanyModules";
import { EntityType } from "./useEntityLinks";

interface LinkedItemBase {
  id: string;
  name: string;
  date: string;
  entityType: EntityType;
  metadata?: Record<string, unknown>;
}

interface LinkedTask extends LinkedItemBase {
  entityType: "task";
  status: string;
  priority: string;
  dueDate: string | null;
}

interface LinkedProject extends LinkedItemBase {
  entityType: "project";
  status: string;
  emoji: string;
}

interface LinkedEvent extends LinkedItemBase {
  entityType: "event";
  startAt: string;
  endAt: string | null;
  allDay: boolean;
}

interface LinkedNote extends LinkedItemBase {
  entityType: "note";
  status: string;
  color: string | null;
}

interface LinkedDocument extends LinkedItemBase {
  entityType: "document";
  mimeType: string | null;
  fileSize: number | null;
}

// Opportunities use a direct FK to crm_client, not entity_links system
export interface LinkedOpportunity {
  id: string;
  name: string;
  date: string;
  status: "open" | "won" | "lost";
  valueAmount: number | null;
  stageName: string | null;
}

export type LinkedItem = LinkedTask | LinkedProject | LinkedEvent | LinkedNote | LinkedDocument;

export interface CrmHubLinkedItems {
  tasks: LinkedTask[];
  projects: LinkedProject[];
  events: LinkedEvent[];
  notes: LinkedNote[];
  documents: LinkedDocument[];
  opportunities: LinkedOpportunity[];
}

export interface TimelineItem {
  id: string;
  type: EntityType;
  name: string;
  date: string;
  action: "created" | "updated" | "completed" | "scheduled";
  metadata?: Record<string, unknown>;
}

const ITEMS_LIMIT = 10;
const TIMELINE_LIMIT = 20;

/**
 * Fetches all linked items for a CRM client, grouped by type.
 * Also provides a combined timeline view.
 */
export function useCrmHubData(crmClientId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();

  // First fetch links for this CRM client
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["crm-hub-links", crmClientId, activeCompanyId],
    queryFn: async () => {
      if (!crmClientId || !activeCompanyId) return [];

      // Get links where CRM client is source
      const { data: fromLinks, error: fromError } = await supabase
        .from("entity_links")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("from_type", "crm_client")
        .eq("from_id", crmClientId);

      if (fromError) throw fromError;

      // Get links where CRM client is target
      const { data: toLinks, error: toError } = await supabase
        .from("entity_links")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("to_type", "crm_client")
        .eq("to_id", crmClientId);

      if (toError) throw toError;

      return [...(fromLinks || []), ...(toLinks || [])];
    },
    enabled: !!crmClientId && !!activeCompanyId && !modulesLoading,
  });

  // Group link IDs by target type
  const linkedIds = links.reduce((acc, link) => {
    const isSource = link.from_type === "crm_client" && link.from_id === crmClientId;
    const targetType = isSource ? link.to_type : link.from_type;
    const targetId = isSource ? link.to_id : link.from_id;

    if (!acc[targetType]) acc[targetType] = [];
    if (!acc[targetType].includes(targetId)) acc[targetType].push(targetId);
    return acc;
  }, {} as Record<string, string[]>);

  // Fetch linked tasks
  const { data: linkedTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["crm-hub-tasks", crmClientId, linkedIds.task],
    queryFn: async () => {
      const ids = linkedIds.task || [];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false })
        .limit(ITEMS_LIMIT);

      if (error) throw error;
      return (data || []).map((t) => ({
        id: t.id,
        name: t.title,
        date: t.created_at,
        entityType: "task" as const,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
      }));
    },
    enabled: !!crmClientId && (linkedIds.task?.length || 0) > 0 && isEnabled("tasks"),
  });

  // Fetch linked projects
  const { data: linkedProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["crm-hub-projects", crmClientId, linkedIds.project],
    queryFn: async () => {
      const ids = linkedIds.project || [];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, emoji, created_at")
        .in("id", ids)
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(ITEMS_LIMIT);

      if (error) throw error;
      return (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        date: p.created_at,
        entityType: "project" as const,
        status: p.status,
        emoji: p.emoji,
      }));
    },
    enabled: !!crmClientId && (linkedIds.project?.length || 0) > 0 && isEnabled("projects"),
  });

  // Fetch linked events
  const { data: linkedEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["crm-hub-events", crmClientId, linkedIds.event],
    queryFn: async () => {
      const ids = linkedIds.event || [];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, all_day, created_at")
        .in("id", ids)
        .order("start_at", { ascending: false })
        .limit(ITEMS_LIMIT);

      if (error) throw error;
      return (data || []).map((e) => ({
        id: e.id,
        name: e.title,
        date: e.created_at,
        entityType: "event" as const,
        startAt: e.start_at,
        endAt: e.end_at,
        allDay: e.all_day,
      }));
    },
    enabled: !!crmClientId && (linkedIds.event?.length || 0) > 0 && isEnabled("calendar"),
  });

  // Fetch linked notes
  const { data: linkedNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["crm-hub-notes", crmClientId, linkedIds.note],
    queryFn: async () => {
      const ids = linkedIds.note || [];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("notes")
        .select("id, title, status, color, created_at, updated_at")
        .in("id", ids)
        .order("updated_at", { ascending: false })
        .limit(ITEMS_LIMIT);

      if (error) throw error;
      return (data || []).map((n) => ({
        id: n.id,
        name: n.title,
        date: n.updated_at || n.created_at,
        entityType: "note" as const,
        status: n.status,
        color: n.color,
      }));
    },
    enabled: !!crmClientId && (linkedIds.note?.length || 0) > 0 && isEnabled("notes"),
  });

  // Fetch linked documents
  const { data: linkedDocuments = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["crm-hub-documents", crmClientId, linkedIds.document],
    queryFn: async () => {
      const ids = linkedIds.document || [];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("documents")
        .select("id, name, mime_type, file_size, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false })
        .limit(ITEMS_LIMIT);

      if (error) throw error;
      return (data || []).map((d) => ({
        id: d.id,
        name: d.name,
        date: d.created_at,
        entityType: "document" as const,
        mimeType: d.mime_type,
        fileSize: d.file_size,
      }));
    },
    enabled: !!crmClientId && (linkedIds.document?.length || 0) > 0 && isEnabled("documents"),
  });

  // Fetch sales opportunities linked to this CRM client (direct FK, not entity_links)
  const { data: linkedOpportunities = [], isLoading: opportunitiesLoading } = useQuery({
    queryKey: ["crm-hub-opportunities", crmClientId, activeCompanyId],
    queryFn: async () => {
      if (!crmClientId || !activeCompanyId) return [];

      const { data, error } = await supabase
        .from("sales_opportunities")
        .select(`
          id, name, status, value_amount, created_at, updated_at,
          stage:sales_pipeline_stages(name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("crm_client_id", crmClientId)
        .order("updated_at", { ascending: false })
        .limit(ITEMS_LIMIT);

      if (error) throw error;
      return (data || []).map((o) => ({
        id: o.id,
        name: o.name,
        date: o.updated_at || o.created_at,
        status: o.status as "open" | "won" | "lost",
        valueAmount: o.value_amount,
        stageName: o.stage?.name || null,
      }));
    },
    enabled: !!crmClientId && !!activeCompanyId && isEnabled("sales"),
  });

  // Build timeline from all linked items
  const timeline: TimelineItem[] = [
    ...linkedTasks.map((t) => ({
      id: t.id,
      type: "task" as EntityType,
      name: t.name,
      date: t.date,
      action: (t.status === "done" ? "completed" : "created") as TimelineItem["action"],
      metadata: { status: t.status, priority: t.priority },
    })),
    ...linkedProjects.map((p) => ({
      id: p.id,
      type: "project" as EntityType,
      name: p.name,
      date: p.date,
      action: "created" as TimelineItem["action"],
      metadata: { status: p.status, emoji: p.emoji },
    })),
    ...linkedEvents.map((e) => ({
      id: e.id,
      type: "event" as EntityType,
      name: e.name,
      date: e.startAt,
      action: "scheduled" as TimelineItem["action"],
      metadata: { allDay: e.allDay },
    })),
    ...linkedNotes.map((n) => ({
      id: n.id,
      type: "note" as EntityType,
      name: n.name,
      date: n.date,
      action: "updated" as TimelineItem["action"],
      metadata: { color: n.color },
    })),
    ...linkedDocuments.map((d) => ({
      id: d.id,
      type: "document" as EntityType,
      name: d.name,
      date: d.date,
      action: "created" as TimelineItem["action"],
      metadata: { mimeType: d.mimeType },
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, TIMELINE_LIMIT);

  const linkedItems: CrmHubLinkedItems = {
    tasks: linkedTasks,
    projects: linkedProjects,
    events: linkedEvents,
    notes: linkedNotes,
    documents: linkedDocuments,
    opportunities: linkedOpportunities,
  };

  // Count opportunities separately since they use direct FK not entity_links
  const opportunitiesCount = linkedOpportunities.length;

  const counts = {
    tasks: linkedIds.task?.length || 0,
    projects: linkedIds.project?.length || 0,
    events: linkedIds.event?.length || 0,
    notes: linkedIds.note?.length || 0,
    documents: linkedIds.document?.length || 0,
    opportunities: opportunitiesCount,
    total: links.length + opportunitiesCount,
  };

  const isLoading =
    linksLoading ||
    tasksLoading ||
    projectsLoading ||
    eventsLoading ||
    notesLoading ||
    documentsLoading ||
    opportunitiesLoading ||
    modulesLoading;

  return {
    linkedItems,
    timeline,
    counts,
    isLoading,
    isEnabled,
  };
}
