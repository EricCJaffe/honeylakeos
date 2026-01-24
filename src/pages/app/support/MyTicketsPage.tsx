import { useNavigate } from "react-router-dom";
import { Plus, Ticket, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyTickets } from "@/hooks/useSupportCenter";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  triage: { label: "In Review", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  waiting_on_requester: { label: "Awaiting Your Response", variant: "destructive" },
  resolved: { label: "Resolved", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "text-muted-foreground" },
  normal: { label: "Normal", className: "text-foreground" },
  high: { label: "High", className: "text-orange-600" },
  urgent: { label: "Urgent", className: "text-destructive font-medium" },
};

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useMyTickets();

  const openTickets = tickets?.filter(
    (t) => !["resolved", "closed"].includes(t.status)
  );
  const closedTickets = tickets?.filter((t) =>
    ["resolved", "closed"].includes(t.status)
  );

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case "resolved":
      case "closed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "waiting_on_requester":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="My Tickets"
          description="Track your support requests"
        />
        <Button onClick={() => navigate("/app/support/tickets/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No tickets yet</p>
            <p className="text-sm mb-4">
              Need help? Submit a support ticket and we'll assist you.
            </p>
            <Button onClick={() => navigate("/app/support/tickets/new")}>
              Submit a Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Open Tickets */}
          {openTickets && openTickets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Open Tickets ({openTickets.length})
              </h3>
              {openTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate(`/app/support/tickets/${ticket.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <CardTitle className="text-base">
                            #{ticket.ticket_number} - {ticket.subject}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {ticket.category && (
                              <span className="capitalize">{ticket.category} • </span>
                            )}
                            Created {format(new Date(ticket.created_at), "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={PRIORITY_CONFIG[ticket.priority].className}>
                          {PRIORITY_CONFIG[ticket.priority].label}
                        </span>
                        <Badge variant={STATUS_CONFIG[ticket.status].variant}>
                          {STATUS_CONFIG[ticket.status].label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* Closed Tickets */}
          {closedTickets && closedTickets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Resolved ({closedTickets.length})
              </h3>
              {closedTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:border-primary transition-colors opacity-75"
                  onClick={() => navigate(`/app/support/tickets/${ticket.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <CardTitle className="text-base">
                            #{ticket.ticket_number} - {ticket.subject}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {ticket.category && (
                              <span className="capitalize">{ticket.category} • </span>
                            )}
                            Closed{" "}
                            {ticket.closed_at
                              ? format(new Date(ticket.closed_at), "MMM d, yyyy")
                              : ""}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={STATUS_CONFIG[ticket.status].variant}>
                        {STATUS_CONFIG[ticket.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
