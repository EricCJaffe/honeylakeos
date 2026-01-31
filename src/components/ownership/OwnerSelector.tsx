import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface CompanyMember {
  user_id: string;
  profiles: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface OwnerSelectorProps {
  companyId: string;
  value: string | null | undefined;
  onChange: (userId: string) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export function OwnerSelector({
  companyId,
  value,
  onChange,
  label = "Owner",
  helperText,
  disabled = false,
}: OwnerSelectorProps) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["company-members", companyId],
    queryFn: async () => {
      // memberships table doesn't have a typed FK relationship to profiles in generated types,
      // so do it in two queries (same pattern used in MembersPanel).
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("user_id, created_at")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];

      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return memberships.map((m) => ({
        user_id: m.user_id,
        profiles: profileMap.get(m.user_id) || null,
      })) as CompanyMember[];
    },
    enabled: !!companyId,
  });

  // Sort by name alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    const nameA = a.profiles?.full_name || a.profiles?.email || "";
    const nameB = b.profiles?.full_name || b.profiles?.email || "";
    return nameA.localeCompare(nameB);
  });

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "?";
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading..." : "Select owner"} />
        </SelectTrigger>
        <SelectContent>
          {sortedMembers.map((member) => (
            <SelectItem key={member.user_id} value={member.user_id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={member.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.profiles?.full_name || null, member.profiles?.email || null)}
                  </AvatarFallback>
                </Avatar>
                <span>{member.profiles?.full_name || member.profiles?.email || "Unknown"}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
