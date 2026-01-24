import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type KbCategory = Database["public"]["Tables"]["kb_categories"]["Row"];
type KbArticle = Database["public"]["Tables"]["kb_articles"]["Row"];
type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
type TicketMessage = Database["public"]["Tables"]["support_ticket_messages"]["Row"];
type TicketEvent = Database["public"]["Tables"]["support_ticket_events"]["Row"];

type KbArticleStatus = Database["public"]["Enums"]["kb_article_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];
type TicketStatus = Database["public"]["Enums"]["ticket_status"];

// =============================================
// KB Categories Hooks
// =============================================

export function useKbCategories() {
  return useQuery({
    queryKey: ["kb-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kb_categories")
        .select("*")
        .is("archived_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as KbCategory[];
    },
  });
}

export function useKbCategoryMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCategory = useMutation({
    mutationFn: async (input: { site_id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("kb_categories")
        .insert({
          site_id: input.site_id,
          name: input.name,
          description: input.description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
      toast({ title: "Category created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create category", description: error.message, variant: "destructive" });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string; sort_order?: number }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("kb_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
      toast({ title: "Category updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update category", description: error.message, variant: "destructive" });
    },
  });

  const archiveCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kb_categories")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
      toast({ title: "Category archived" });
    },
    onError: (error) => {
      toast({ title: "Failed to archive category", description: error.message, variant: "destructive" });
    },
  });

  return { createCategory, updateCategory, archiveCategory };
}

// =============================================
// KB Articles Hooks
// =============================================

export function useKbArticles(options?: { categoryId?: string; status?: KbArticleStatus; search?: string }) {
  return useQuery({
    queryKey: ["kb-articles", options],
    queryFn: async () => {
      let query = supabase
        .from("kb_articles")
        .select("*, category:kb_categories(id, name)")
        .order("updated_at", { ascending: false });

      if (options?.categoryId) {
        query = query.eq("category_id", options.categoryId);
      }

      if (options?.status) {
        query = query.eq("status", options.status);
      }

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,body_rich_text.ilike.%${options.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (KbArticle & { category: { id: string; name: string } | null })[];
    },
  });
}

export function useKbArticle(articleId: string | undefined) {
  return useQuery({
    queryKey: ["kb-article", articleId],
    queryFn: async () => {
      if (!articleId) return null;
      const { data, error } = await supabase
        .from("kb_articles")
        .select("*, category:kb_categories(id, name)")
        .eq("id", articleId)
        .single();

      if (error) throw error;
      return data as KbArticle & { category: { id: string; name: string } | null };
    },
    enabled: !!articleId,
  });
}

export function useKbArticleMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createArticle = useMutation({
    mutationFn: async (input: {
      site_id: string;
      title: string;
      body_rich_text?: string;
      category_id?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("kb_articles")
        .insert({
          site_id: input.site_id,
          title: input.title,
          body_rich_text: input.body_rich_text,
          category_id: input.category_id,
          tags: input.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast({ title: "Article created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create article", description: error.message, variant: "destructive" });
    },
  });

  const updateArticle = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      body_rich_text?: string;
      category_id?: string | null;
      tags?: string[];
    }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("kb_articles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article", variables.id] });
      toast({ title: "Article updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update article", description: error.message, variant: "destructive" });
    },
  });

  const publishArticle = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("kb_articles")
        .update({
          status: "published" as KbArticleStatus,
          published_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article", id] });
      toast({ title: "Article published" });
    },
    onError: (error) => {
      toast({ title: "Failed to publish article", description: error.message, variant: "destructive" });
    },
  });

  const archiveArticle = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("kb_articles")
        .update({ status: "archived" as KbArticleStatus })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article", id] });
      toast({ title: "Article archived" });
    },
    onError: (error) => {
      toast({ title: "Failed to archive article", description: error.message, variant: "destructive" });
    },
  });

  const markHelpful = useMutation({
    mutationFn: async ({ id, helpful }: { id: string; helpful: boolean }) => {
      const column = helpful ? "helpful_yes_count" : "helpful_no_count";
      
      // Get current count first
      const { data: current, error: fetchError } = await supabase
        .from("kb_articles")
        .select(column)
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const currentCount = (current as Record<string, number>)[column] || 0;

      const { error } = await supabase
        .from("kb_articles")
        .update({ [column]: currentCount + 1 })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kb-article", variables.id] });
      toast({ title: "Thank you for your feedback!" });
    },
  });

  return { createArticle, updateArticle, publishArticle, archiveArticle, markHelpful };
}

// =============================================
// Support Tickets Hooks
// =============================================

export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority;
  assignedTo?: string;
  companyId?: string;
  createdBy?: string;
}

export function useSupportTickets(filters?: TicketFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["support-tickets", filters],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select(`*, company:companies(id, name)`)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.assignedTo) {
        query = query.eq("assigned_to_user_id", filters.assignedTo);
      }

      if (filters?.companyId) {
        query = query.eq("company_id", filters.companyId);
      }

      if (filters?.createdBy) {
        query = query.eq("created_by_user_id", filters.createdBy);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (SupportTicket & {
        company: { id: string; name: string } | null;
      })[];
    },
    enabled: !!user,
  });
}

export function useMyTickets() {
  const { user } = useAuth();
  return useSupportTickets(user ? { createdBy: user.id } : undefined);
}

export function useOpenTickets() {
  return useSupportTickets({
    status: ["new", "triage", "in_progress", "waiting_on_requester"],
  });
}

export function useSupportTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`*, company:companies(id, name)`)
        .eq("id", ticketId)
        .single();

      if (error) throw error;
      return data as SupportTicket & {
        company: { id: string; name: string } | null;
      };
    },
    enabled: !!ticketId,
  });
}

export function useTicketMessages(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId,
  });
}

export function useTicketEvents(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["ticket-events", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_events")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TicketEvent[];
    },
    enabled: !!ticketId,
  });
}

export function useSupportTicketMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const createTicket = useMutation({
    mutationFn: async (input: {
      site_id: string;
      subject: string;
      description?: string;
      category?: string;
      priority?: TicketPriority;
      company_id?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          site_id: input.site_id,
          created_by_user_id: user.id,
          subject: input.subject,
          description: input.description,
          category: input.category,
          priority: input.priority || "normal",
          company_id: input.company_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial event
      await supabase.from("support_ticket_events").insert({
        ticket_id: data.id,
        event_type: "ticket_created",
        created_by: user.id,
        payload: { subject: input.subject, priority: input.priority || "normal" },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast({ title: "Ticket submitted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to submit ticket", description: error.message, variant: "destructive" });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (input: {
      id: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assigned_to_user_id?: string | null;
    }) => {
      const { id, ...updates } = input;

      const { data: oldTicket } = await supabase
        .from("support_tickets")
        .select("status, priority, assigned_to_user_id")
        .eq("id", id)
        .single();

      const updatePayload: Record<string, unknown> = { ...updates };
      if (updates.status === "closed" || updates.status === "resolved") {
        updatePayload.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log events for changes
      if (updates.status && oldTicket?.status !== updates.status) {
        await supabase.from("support_ticket_events").insert({
          ticket_id: id,
          event_type: "status_change",
          created_by: user?.id,
          payload: { from: oldTicket?.status, to: updates.status },
        });
      }

      if (updates.priority && oldTicket?.priority !== updates.priority) {
        await supabase.from("support_ticket_events").insert({
          ticket_id: id,
          event_type: "priority_change",
          created_by: user?.id,
          payload: { from: oldTicket?.priority, to: updates.priority },
        });
      }

      if ("assigned_to_user_id" in updates && oldTicket?.assigned_to_user_id !== updates.assigned_to_user_id) {
        await supabase.from("support_ticket_events").insert({
          ticket_id: id,
          event_type: "assignment_change",
          created_by: user?.id,
          payload: { from: oldTicket?.assigned_to_user_id || null, to: updates.assigned_to_user_id || null },
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-events", variables.id] });
      toast({ title: "Ticket updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update ticket", description: error.message, variant: "destructive" });
    },
  });

  const addMessage = useMutation({
    mutationFn: async (input: {
      ticket_id: string;
      body_rich_text: string;
      author_type: "requester" | "agent";
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: input.ticket_id,
          author_user_id: user.id,
          author_type: input.author_type,
          body_rich_text: input.body_rich_text,
        })
        .select()
        .single();

      if (error) throw error;

      // Log event
      await supabase.from("support_ticket_events").insert({
        ticket_id: input.ticket_id,
        event_type: "message_added",
        created_by: user.id,
        payload: { author_type: input.author_type },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-events", variables.ticket_id] });
      toast({ title: "Message sent" });
    },
    onError: (error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  return { createTicket, updateTicket, addMessage };
}

// =============================================
// Dashboard Stats Hook
// =============================================

export function useTicketStats() {
  return useQuery({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("status, priority, assigned_to_user_id");

      if (error) throw error;

      const stats = {
        total: data.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        unassigned: 0,
        oldTickets: 0,
      };

      data.forEach((ticket) => {
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;
        stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
        if (!ticket.assigned_to_user_id) {
          stats.unassigned++;
        }
      });

      return stats;
    },
  });
}

// =============================================
// Search KB Articles Hook
// =============================================

export function useSearchKbArticles(search: string) {
  return useQuery({
    queryKey: ["kb-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];

      const { data, error } = await supabase
        .from("kb_articles")
        .select("id, title, body_rich_text, tags, category:kb_categories(id, name)")
        .eq("status", "published")
        .or(`title.ilike.%${search}%,body_rich_text.ilike.%${search}%,tags.cs.{${search}}`)
        .limit(10);

      if (error) throw error;
      return data as (Pick<KbArticle, "id" | "title" | "body_rich_text" | "tags"> & {
        category: { id: string; name: string } | null;
      })[];
    },
    enabled: search.length >= 2,
  });
}

// =============================================
// Site ID Helper Hook
// =============================================

export function useSiteId() {
  const { memberships } = useMembership();

  return useQuery({
    queryKey: ["site-id", memberships[0]?.company_id],
    queryFn: async () => {
      if (memberships.length === 0) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("site_id")
        .eq("id", memberships[0].company_id)
        .single();

      if (error) throw error;
      return data.site_id;
    },
    enabled: memberships.length > 0,
  });
}
