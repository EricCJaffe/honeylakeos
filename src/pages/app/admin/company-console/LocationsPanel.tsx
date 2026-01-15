import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Search,
  Archive,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useFriendlyError } from "@/hooks/useFriendlyError";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LocationFormDialog } from "@/pages/app/locations/LocationFormDialog";
import { LocationMembersDialog } from "@/pages/app/locations/LocationMembersDialog";
import type { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

interface LocationWithMembers extends Location {
  location_members: { user_id: string; role: string }[];
}

export default function LocationsPanel() {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const { getToastMessage } = useFriendlyError();
  const { log: auditLog } = useAuditLog(activeCompanyId);
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [membersLocation, setMembersLocation] = useState<Location | null>(null);
  const [search, setSearch] = useState("");

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("locations")
        .select("*, location_members(user_id, role)")
        .eq("company_id", activeCompanyId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as LocationWithMembers[];
    },
    enabled: !!activeCompanyId,
  });

  const isLocationManager = (location: LocationWithMembers) => {
    if (!user) return false;
    return location.location_members?.some((m) => m.user_id === user.id && m.role === "manager");
  };

  const canManageMembers = (location: LocationWithMembers) => {
    return isCompanyAdmin || isLocationManager(location);
  };

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        (l.name || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q) ||
        (l.state || "").toLowerCase().includes(q)
    );
  }, [locations, search]);

  const activeLocations = filteredLocations.filter((l) => l.status !== "archived");
  const archivedLocations = filteredLocations.filter((l) => l.status === "archived");

  const deleteLocation = useMutation({
    mutationFn: async (location: Location) => {
      const { error } = await supabase.from("locations").delete().eq("id", location.id);
      if (error) throw error;
      return location;
    },
    onSuccess: (location) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location deleted");
      auditLog("location.deleted", "location", location.id, { name: location.name });
    },
    onError: (error) => {
      toast.error(
        getToastMessage(error, {
          contextMessages: { "42501": "You don't have permission to delete locations." },
        })
      );
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ location, status }: { location: Location; status: string }) => {
      const { error } = await supabase.from("locations").update({ status }).eq("id", location.id);
      if (error) throw error;
      return { location, status };
    },
    onSuccess: ({ location, status }) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(status === "archived" ? "Location archived" : "Location restored");
      auditLog(
        status === "archived" ? "location.archived" : "location.restored",
        "location",
        location.id,
        { name: location.name }
      );
    },
    onError: (error) => {
      toast.error(
        getToastMessage(error, {
          contextMessages: { "42501": "You don't have permission to manage locations." },
        })
      );
    },
  });

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsFormDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    setIsFormDialogOpen(true);
  };

  const handleManageMembers = (location: Location) => {
    setMembersLocation(location);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="text-xs">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
      case "archived":
        return <Badge variant="outline" className="text-xs">Archived</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const formatAddress = (location: Location) => {
    const parts = [location.city, location.state].filter(Boolean);
    return parts.join(", ") || "No address";
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Locations</h3>
          <p className="text-sm text-muted-foreground">
            Manage your company locations and branches
          </p>
        </div>
        {isCompanyAdmin && (
          <Button onClick={handleCreate} className="shrink-0">
            <MapPin className="h-4 w-4 mr-2" />
            New Location
          </Button>
        )}
      </div>

      {locations.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isCompanyAdmin ? (
              <>
                No locations yet.{" "}
                <Button variant="link" onClick={handleCreate} className="p-0 h-auto">
                  Create your first location
                </Button>
              </>
            ) : (
              "No locations have been created for this company yet."
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeLocations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{location.name}</CardTitle>
                          {getStatusBadge(location.status)}
                        </div>
                      </div>
                      {(isCompanyAdmin || canManageMembers(location)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManageMembers(location) && (
                              <DropdownMenuItem onClick={() => handleManageMembers(location)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Manage Members
                              </DropdownMenuItem>
                            )}
                            {isCompanyAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(location)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatus.mutate({ location, status: "archived" })
                                  }
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteLocation.mutate(location)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{formatAddress(location)}</p>
                    {location.type && (
                      <Badge variant="outline" className="text-xs mr-2">
                        {location.type}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <UserPlus className="h-4 w-4" />
                      <span>{location.location_members?.length || 0} members</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {archivedLocations.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-medium text-muted-foreground mb-4">
                Archived Locations
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedLocations.map((location) => (
                  <Card key={location.id} className="opacity-60">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{location.name}</CardTitle>
                            {getStatusBadge(location.status)}
                          </div>
                        </div>
                        {isCompanyAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ location, status: "active" })}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteLocation.mutate(location)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{formatAddress(location)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <LocationFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        location={editingLocation}
      />

      <LocationMembersDialog
        open={!!membersLocation}
        onOpenChange={(open) => !open && setMembersLocation(null)}
        location={membersLocation}
      />
    </div>
  );
}
