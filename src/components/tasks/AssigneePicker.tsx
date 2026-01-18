import * as React from "react";
import { Check, ChevronsUpDown, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCompanyMembers, CompanyMember } from "@/hooks/useCompanyMembers";
import { useAuth } from "@/lib/auth";

interface AssigneePickerProps {
  value: string[]; // Array of user_ids
  onChange: (value: string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  defaultToCurrentUser?: boolean;
  disabled?: boolean;
}

export function AssigneePicker({
  value,
  onChange,
  placeholder = "Select assignee...",
  multiple = false,
  defaultToCurrentUser = true,
  disabled = false,
}: AssigneePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { data: members = [], isLoading } = useCompanyMembers();

  // Default to current user if no value and defaultToCurrentUser is true
  React.useEffect(() => {
    if (defaultToCurrentUser && value.length === 0 && user && members.length > 0) {
      const currentUserIsMember = members.some((m) => m.user_id === user.id);
      if (currentUserIsMember) {
        onChange([user.id]);
      }
    }
  }, [defaultToCurrentUser, value.length, user, members, onChange]);

  const handleSelect = (userId: string) => {
    if (multiple) {
      if (value.includes(userId)) {
        onChange(value.filter((v) => v !== userId));
      } else {
        onChange([...value, userId]);
      }
    } else {
      onChange([userId]);
      setOpen(false);
    }
  };

  const selectedMembers = members.filter((m) => value.includes(m.user_id));

  const getInitials = (member: CompanyMember) => {
    if (member.full_name) {
      return member.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return member.email.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (member: CompanyMember) => {
    return member.full_name || member.email;
  };

  const getMemberTypeLabel = (member: CompanyMember) => {
    if (member.member_type === "external") return "External";
    if (member.role === "company_admin") return "Admin";
    return null;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled || isLoading}
        >
          {selectedMembers.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : selectedMembers.length === 1 ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {getInitials(selectedMembers[0])}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{getDisplayName(selectedMembers[0])}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{selectedMembers.length} assignees</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => {
                const isSelected = value.includes(member.user_id);
                const isCurrentUser = member.user_id === user?.id;
                const typeLabel = getMemberTypeLabel(member);

                return (
                  <CommandItem
                    key={member.user_id}
                    value={`${member.email} ${member.full_name || ""}`}
                    onSelect={() => handleSelect(member.user_id)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "opacity-50 border-muted-foreground"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{getDisplayName(member)}</span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            You
                          </Badge>
                        )}
                        {typeLabel && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {typeLabel}
                          </Badge>
                        )}
                      </div>
                      {member.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
