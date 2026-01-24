import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useOpenTickets,
  useTicketStats,
  useSupportTicketMutations,
} from "@/hooks/useSupportCenter";
import { useMembership } from "@/lib/membership";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  triage: { label: "In Review", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  waiting_on_requester: { label: "Awaiting Response", variant: "destructive" },
  resolved: { label: "Resolved", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "text-muted-foreground" },
  normal: { label: "Normal", className: "" },
  high: { label: "High", className: "text-orange-600" },
  urgent: { label: "Urgent", className: "text-destructive font-medium" },
};

export default function TicketDashboardPage() {
  const navigate = useNavigate();
  const { isSiteAdmin } = useMembership();
  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { data: openTickets, isLoading: ticketsLoading } = useOpenTickets();
  const { updateTicket } = useSupportTicketMutations();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Filter tickets
  const filteredTickets = openTickets?.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    return true;
  });

  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    updateTicket.mutate({ id: ticketId, status: newStatus });
  };

  if (!isSiteAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You don't have permission to view the ticket dashboard.
        </p>
        <Button variant="link" onClick={() => navigate("/app/support/tickets")}>
          Go to My Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket Dashboard"
        description="Manage and respond to support tickets"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {stats?.byStatus.new || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">New Tickets</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">
                    {(stats?.byStatus.in_progress || 0) +
                      (stats?.byStatus.triage || 0)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">In Progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-2xl font-bold">
                    {stats?.byPriority.urgent || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Urgent</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {stats?.unassigned || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Unassigned</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="triage">In Review</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_on_requester">Awaiting Response</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== "all" || priorityFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Tickets</CardTitle>
          <CardDescription>
            Sorted by ticket number (newest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredTickets && filteredTickets.length > 0 ? (
            <div className="space-y-2">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/support/tickets/${ticket.id}`)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-sm font-mono text-muted-foreground shrink-0">
                      #{ticket.ticket_number}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {ticket.company?.name || "No company"} •{" "}
                        {format(new Date(ticket.created_at), "MMM d")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={PRIORITY_CONFIG[ticket.priority].className}>
                      {PRIORITY_CONFIG[ticket.priority].label}
                    </span>

                    <Select
                      value={ticket.status}
                      onValueChange={(v) =>
                        handleStatusChange(ticket.id, v as TicketStatus)
                      }
                    >
                      <SelectTrigger
                        className="w-36"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="triage">In Review</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="waiting_on_requester">
                          Awaiting Response
                        </SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Badge
                      variant="outline"
                      className={
                        ticket.assigned_to_user_id ? "" : "text-destructive border-destructive"
                      }
                    >
                      {ticket.assigned_to_user_id ? "Assigned" : "Unassigned"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No open tickets matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
