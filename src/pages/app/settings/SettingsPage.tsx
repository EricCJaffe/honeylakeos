import * as React from "react";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Building2, Shield, ChevronDown, Camera, Copy, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { useFriendlyError } from "@/hooks/useFriendlyError";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

// Profile form schema
const profileFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Group membership type
interface GroupMembershipData {
  group_id: string;
  role: string;
  created_at: string;
  groups: {
    id: string;
    name: string;
    group_type: string | null;
  } | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { 
    activeCompanyId, 
    activeCompany, 
    memberships, 
    siteMemberships,
    isSuperAdmin, 
    isSiteAdmin, 
    isCompanyAdmin, 
    loading: membershipLoading 
  } = useMembership();
  
  const queryClient = useQueryClient();
  const { getToastMessage } = useFriendlyError();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Fetch current profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch group memberships
  const { data: groupMemberships, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ["group-memberships", user?.id, activeCompanyId],
    queryFn: async () => {
      if (!user?.id || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          group_id,
          role,
          created_at,
          groups!inner (
            id,
            name,
            group_type,
            company_id
          )
        `)
        .eq("user_id", user.id)
        .eq("groups.company_id", activeCompanyId);
      if (error) throw error;
      return data as unknown as GroupMembershipData[];
    },
    enabled: !!user?.id && !!activeCompanyId,
  });

  // Get active membership
  const activeMembership = memberships.find(m => m.company_id === activeCompanyId);

  // Form setup
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
    },
  });

  // Update form when profile loads
  React.useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: (profile as any).phone || "",
        address: (profile as any).address || "",
      });
    }
  }, [profile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const fullName = [values.first_name, values.last_name].filter(Boolean).join(" ");
      
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          full_name: fullName || null,
          phone: values.phone || null,
          address: values.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: unknown) => {
      toast.error(getToastMessage(error));
    },
  });

  // Avatar upload handler
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (error: unknown) {
      toast.error(getToastMessage(error));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Copy debug JSON
  const handleCopyDebug = () => {
    const debugData = {
      user: { id: user?.id, email: user?.email },
      activeCompanyId,
      activeCompany,
      activeMembership,
      siteMemberships,
      groupMemberships,
      computedFlags: { isSuperAdmin, isSiteAdmin, isCompanyAdmin },
    };
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    toast.success("Debug JSON copied to clipboard");
  };

  // Helper component for key-value rows
  const KeyValueRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  const getInitials = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  if (profileLoading || membershipLoading) {
    return (
      <div className="container mx-auto py-6 px-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your profile and view your account information"
      />

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium">{profile?.full_name || "No name set"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => updateProfileMutation.mutate(values))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City, Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <KeyValueRow label="Email" value={user?.email || "—"} />
        </CardContent>
      </Card>

      {/* Company Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company
          </CardTitle>
          <CardDescription>Your active company membership</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <KeyValueRow 
            label="Company Name" 
            value={activeCompany?.name || "—"} 
          />
          <KeyValueRow 
            label="Company Status" 
            value={
              activeCompany?.status ? (
                <Badge variant={activeCompany.status === "active" ? "default" : "secondary"}>
                  {activeCompany.status}
                </Badge>
              ) : "—"
            } 
          />
          <KeyValueRow 
            label="My Role" 
            value={
              activeMembership?.role ? (
                <Badge variant="outline">{activeMembership.role.replace("_", " ")}</Badge>
              ) : "—"
            } 
          />
          <KeyValueRow 
            label="Membership Status" 
            value={
              activeMembership?.status ? (
                <Badge variant={activeMembership.status === "active" ? "default" : "secondary"}>
                  {activeMembership.status}
                </Badge>
              ) : "—"
            } 
          />
        </CardContent>
      </Card>

      {/* Access & Roles Section (Collapsible) */}
      <Collapsible open={isAccessOpen} onOpenChange={setIsAccessOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <div>
                    <CardTitle>Access & Roles</CardTitle>
                    <CardDescription>Advanced access information for debugging</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isAccessOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Copy Debug Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleCopyDebug}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Debug JSON
                </Button>
              </div>

              {/* Computed Access Flags */}
              <div>
                <h4 className="font-medium mb-3">Computed Access Flags</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={isCompanyAdmin ? "default" : "secondary"}>
                      {isCompanyAdmin ? "Yes" : "No"}
                    </Badge>
                    <span className="text-sm">Company Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isSiteAdmin ? "default" : "secondary"}>
                      {isSiteAdmin ? "Yes" : "No"}
                    </Badge>
                    <span className="text-sm">Site Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isSuperAdmin ? "default" : "secondary"}>
                      {isSuperAdmin ? "Yes" : "No"}
                    </Badge>
                    <span className="text-sm">Super Admin</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Site Memberships */}
              <div>
                <h4 className="font-medium mb-3">Site Memberships</h4>
                {siteMemberships.length > 0 ? (
                  <div className="space-y-2">
                    {siteMemberships.map((sm) => (
                      <div key={sm.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                        <span className="text-sm font-mono">{sm.site_id.slice(0, 8)}...</span>
                        <Badge variant="outline">{sm.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No site memberships</p>
                )}
              </div>

              <Separator />

              {/* Group Memberships */}
              <div>
                <h4 className="font-medium mb-3">Group Memberships</h4>
                {groupsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : groupsError ? (
                  <p className="text-sm text-destructive">
                    Error loading groups: {getToastMessage(groupsError)}
                  </p>
                ) : groupMemberships && groupMemberships.length > 0 ? (
                  <div className="space-y-2">
                    {groupMemberships.map((gm) => (
                      <div key={gm.group_id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                        <div>
                          <span className="text-sm font-medium">{gm.groups?.name || "Unknown Group"}</span>
                          {gm.groups?.group_type && (
                            <span className="text-xs text-muted-foreground ml-2">({gm.groups.group_type})</span>
                          )}
                        </div>
                        <Badge variant="outline">{gm.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No group memberships in this company</p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
