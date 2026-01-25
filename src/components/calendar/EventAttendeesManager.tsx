import * as React from "react";
import { useState } from "react";
import { Check, X, HelpCircle, UserPlus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useEventAttendees,
  useCompanyMembers,
  useEventAttendeeActions,
  AttendeeResponseStatus,
  EventAttendee,
} from "@/hooks/useEventAttendees";
import { useAuth } from "@/lib/auth";
import { useActiveCompany } from "@/hooks/useActiveCompany";

interface EventAttendeesManagerProps {
  eventId: string;
  canManage: boolean;
}

const responseStatusConfig: Record<
  AttendeeResponseStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  needs_action: {
    label: "Awaiting response",
    icon: <HelpCircle className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  },
  accepted: {
    label: "Accepted",
    icon: <Check className="h-3 w-3" />,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  declined: {
    label: "Declined",
    icon: <X className="h-3 w-3" />,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  tentative: {
    label: "Maybe",
    icon: <HelpCircle className="h-3 w-3" />,
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
};

export function EventAttendeesManager({
  eventId,
  canManage,
}: EventAttendeesManagerProps) {
  const { user } = useAuth();
  const { isCompanyAdmin } = useActiveCompany();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: attendees = [], isLoading } = useEventAttendees(eventId);
  const { data: members = [] } = useCompanyMembers();
  const { addAttendee, removeAttendee, updateResponse, updateRole } =
    useEventAttendeeActions();

  const currentUserAttendee = attendees.find((a) => a.user_id === user?.id);
  const attendeeUserIds = new Set(attendees.map((a) => a.user_id));
  const availableMembers = members.filter(
    (m: any) => !attendeeUserIds.has(m.user_id)
  );

  const handleAddAttendee = (userId: string) => {
    addAttendee.mutate({ eventId, userId });
    setIsAddOpen(false);
  };

  const handleRemoveAttendee = (userId: string) => {
    removeAttendee.mutate({ eventId, userId });
  };

  const handleResponseChange = (status: AttendeeResponseStatus) => {
    updateResponse.mutate({ eventId, responseStatus: status });
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current user's response (if invited) */}
      {currentUserAttendee && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-sm font-medium mb-2">Your Response</div>
          <div className="flex gap-2">
            {(["accepted", "tentative", "declined"] as AttendeeResponseStatus[]).map(
              (status) => {
                const config = responseStatusConfig[status];
                const isSelected = currentUserAttendee.response_status === status;
                return (
                  <Button
                    key={status}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleResponseChange(status)}
                    disabled={updateResponse.isPending}
                    className={cn(
                      "flex items-center gap-1.5",
                      isSelected && status === "accepted" && "bg-green-600 hover:bg-green-700",
                      isSelected && status === "declined" && "bg-red-600 hover:bg-red-700",
                      isSelected && status === "tentative" && "bg-yellow-600 hover:bg-yellow-700"
                    )}
                  >
                    {config.icon}
                    {config.label === "Awaiting response" ? "Pending" : config.label}
                  </Button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Attendees list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Attendees ({attendees.length})
          </span>
          {canManage && (
            <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search members..." />
                  <CommandList>
                    <CommandEmpty>No members found.</CommandEmpty>
                    <CommandGroup>
                      {availableMembers.map((member: any) => (
                        <CommandItem
                          key={member.user_id}
                          value={member.full_name || member.email}
                          onSelect={() => handleAddAttendee(member.user_id)}
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">
                              {(member.full_name || member.email || "?")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {member.full_name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {attendees.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No attendees added yet
          </div>
        ) : (
          <div className="space-y-2">
            {attendees.map((attendee) => (
              <AttendeeRow
                key={attendee.user_id}
                attendee={attendee}
                canManage={canManage}
                isCurrentUser={attendee.user_id === user?.id}
                onRemove={() => handleRemoveAttendee(attendee.user_id)}
                onRoleChange={(role) =>
                  updateRole.mutate({
                    eventId,
                    userId: attendee.user_id,
                    role,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AttendeeRowProps {
  attendee: EventAttendee;
  canManage: boolean;
  isCurrentUser: boolean;
  onRemove: () => void;
  onRoleChange: (role: "required" | "optional") => void;
}

function AttendeeRow({
  attendee,
  canManage,
  isCurrentUser,
  onRemove,
  onRoleChange,
}: AttendeeRowProps) {
  const statusConfig = responseStatusConfig[attendee.response_status];
  const displayName =
    attendee.profile?.full_name || attendee.profile?.email || "Unknown";
  const initials = displayName[0].toUpperCase();

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border bg-background">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {displayName}
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">You</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {attendee.role === "optional" ? "Optional" : "Required"}
            </Badge>
            <Badge
              variant="secondary"
              className={cn("text-xs flex items-center gap-1", statusConfig.className)}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      {canManage && !isCurrentUser && (
        <div className="flex items-center gap-1">
          <Select
            value={attendee.role}
            onValueChange={(value) => onRoleChange(value as "required" | "optional")}
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="required">Required</SelectItem>
              <SelectItem value="optional">Optional</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
