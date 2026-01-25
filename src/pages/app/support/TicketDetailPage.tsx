import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Clock, User, Building2, Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  useSupportTicket,
  useTicketMessages,
  useTicketEvents,
  useSupportTicketMutations,
} from "@/hooks/useSupportCenter";
import { useMembership } from "@/lib/membership";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { AttachmentsPanel } from "@/components/attachments/AttachmentsPanel";

// Lazy load rich text display for consistent rendering
const RichTextDisplay = React.lazy(() => 
  import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay }))
);

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
  normal: { label: "Normal", className: "" },
  high: { label: "High", className: "text-orange-600" },
  urgent: { label: "Urgent", className: "text-destructive font-medium" },
};

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { isSiteAdmin } = useMembership();

  const { data: ticket, isLoading: ticketLoading } = useSupportTicket(ticketId);
  const { data: messages, isLoading: messagesLoading } = useTicketMessages(ticketId);
  const { data: events } = useTicketEvents(ticketId);
  const { addMessage } = useSupportTicketMutations();

  const [newMessage, setNewMessage] = React.useState("");

  const handleSendMessage = async () => {
    if (!ticketId || !newMessage.trim()) return;

    await addMessage.mutateAsync({
      ticket_id: ticketId,
      body_rich_text: newMessage,
      author_type: isSiteAdmin ? "agent" : "requester",
    });

    setNewMessage("");
  };

  const getInitials = (userId: string | null) => {
    if (!userId) return "?";
    return userId.substring(0, 2).toUpperCase();
  };

  if (ticketLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="link" onClick={() => navigate("/app/support/tickets")}>
          Back to My Tickets
        </Button>
      </div>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app/support/tickets")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Tickets
      </Button>

      <div className="flex items-start justify-between">
        <PageHeader
          title={`#${ticket.ticket_number} - ${ticket.subject}`}
          description={`Created ${format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}`}
        />
        <Badge variant={STATUS_CONFIG[ticket.status].variant}>
          {STATUS_CONFIG[ticket.status].label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Original Description */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(ticket.created_by_user_id)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">Requester</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">
                {ticket.description || "No description provided"}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          {messagesLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-4">
              <Separator />
              <h3 className="text-sm font-medium">Conversation</h3>
              {messages.map((message) => (
                <Card
                  key={message.id}
                  className={
                    message.author_type === "agent"
                      ? "border-primary/20 bg-primary/5"
                      : ""
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(message.author_user_id)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {message.author_type === "agent" ? "Support Agent" : "You"}
                          </p>
                          {message.author_type === "agent" && (
                            <Badge variant="secondary" className="text-xs">
                              Support
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <React.Suspense fallback={<Skeleton className="h-8 w-full" />}>
                      <RichTextDisplay content={message.body_rich_text} />
                    </React.Suspense>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {/* Reply Box */}
          {!isClosed && (
            <Card>
              <CardContent className="pt-4">
                <Textarea
                  placeholder="Write a reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end mt-3">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || addMessage.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isClosed && (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                This ticket has been {ticket.status}. If you need further assistance,
                please submit a new ticket.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={STATUS_CONFIG[ticket.status].variant}>
                  {STATUS_CONFIG[ticket.status].label}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Priority:</span>
                <span className={PRIORITY_CONFIG[ticket.priority].className}>
                  {PRIORITY_CONFIG[ticket.priority].label}
                </span>
              </div>

              {ticket.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <span className="capitalize">{ticket.category}</span>
                </div>
              )}

              {ticket.assigned_to_user_id && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned:</span>
                  <span>Support Agent</span>
                </div>
              )}

              {ticket.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Company:</span>
                  <span>{ticket.company.name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <AttachmentsPanel 
            entityType="ticket" 
            entityId={ticket.id} 
            title="Screenshots & Attachments"
          />

          {/* Timeline */}
          {events && events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {events.slice(-5).map((event) => (
                    <div key={event.id} className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">
                          {event.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {format(new Date(event.created_at), "MMM d 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
