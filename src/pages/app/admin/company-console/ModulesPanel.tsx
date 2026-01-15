import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useModuleQueryInvalidation } from "@/hooks/useModuleQueries";
import { ModuleKey, CORE_MODULES } from "@/hooks/useModuleAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Boxes, CheckCircle2, XCircle, Lock, Unlock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
}

interface CompanyModule {
  id: string;
  module_id: string;
  status: string;
  expires_at: string | null;
}

export default function CompanyModulesPanel() {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { log: logAudit } = useAuditLog();
  const { invalidateModuleQueries } = useModuleQueryInvalidation();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    module: Module | null;
    action: "enable" | "disable";
  }>({ open: false, module: null, action: "enable" });

  // Fetch all available modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
  });

  // Fetch company's enabled modules
  const { data: companyModules = [], isLoading: companyModulesLoading } = useQuery({
    queryKey: ["company-modules", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("company_modules")
        .select("*")
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      return data as CompanyModule[];
    },
    enabled: !!activeCompanyId,
  });

  const enableModule = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!activeCompanyId) throw new Error("No company selected");
      
      const { error } = await supabase.from("company_modules").insert({
        company_id: activeCompanyId,
        module_id: moduleId,
        status: "active",
      });
      
      if (error) throw error;
    },
    onSuccess: (_, moduleId) => {
      const module = modules.find((m) => m.id === moduleId);
      queryClient.invalidateQueries({ queryKey: ["company-modules"] });
      queryClient.invalidateQueries({ queryKey: ["company-module"] });
      
      // Invalidate the specific module queries
      if (module?.slug) {
        invalidateModuleQueries(module.slug as ModuleKey);
      }
      
      // Log audit event
      logAudit(
        "module.enabled",
        "company_module",
        moduleId,
        { 
          module_name: module?.name,
          module_slug: module?.slug,
        }
      );
      
      toast.success(`${module?.name || "Module"} enabled`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enable module");
    },
  });

  const disableModule = useMutation({
    mutationFn: async (companyModuleId: string) => {
      const { error } = await supabase
        .from("company_modules")
        .update({ status: "suspended" })
        .eq("id", companyModuleId);
      
      if (error) throw error;
      return companyModuleId;
    },
    onSuccess: (companyModuleId) => {
      const companyModule = companyModules.find((cm) => cm.id === companyModuleId);
      const module = modules.find((m) => m.id === companyModule?.module_id);
      
      queryClient.invalidateQueries({ queryKey: ["company-modules"] });
      queryClient.invalidateQueries({ queryKey: ["company-module"] });
      
      // Invalidate the specific module queries
      if (module?.slug) {
        invalidateModuleQueries(module.slug as ModuleKey);
      }
      
      // Log audit event
      logAudit(
        "module.disabled",
        "company_module",
        companyModule?.module_id || companyModuleId,
        { 
          module_name: module?.name,
          module_slug: module?.slug,
        }
      );
      
      toast.success(`${module?.name || "Module"} disabled`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disable module");
    },
  });

  const getModuleStatus = (moduleId: string) => {
    const companyModule = companyModules.find((cm) => cm.module_id === moduleId);
    if (!companyModule) return null;
    return companyModule;
  };

  const isModuleEnabled = (moduleId: string) => {
    const companyModule = getModuleStatus(moduleId);
    return companyModule && (companyModule.status === "active" || companyModule.status === "trial");
  };

  const isCoreModule = (slug: string) => CORE_MODULES.includes(slug as ModuleKey);

  const handleToggle = (module: Module, currentlyEnabled: boolean) => {
    if (currentlyEnabled) {
      setConfirmDialog({ open: true, module, action: "disable" });
    } else {
      enableModule.mutate(module.id);
    }
  };

  const handleConfirmDisable = () => {
    if (!confirmDialog.module) return;
    const companyModule = companyModules.find((cm) => cm.module_id === confirmDialog.module!.id);
    if (companyModule) {
      disableModule.mutate(companyModule.id);
    }
    setConfirmDialog({ open: false, module: null, action: "enable" });
  };

  const isLoading = modulesLoading || companyModulesLoading;
  const isPending = enableModule.isPending || disableModule.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Separate core and premium modules
  const coreModules = modules.filter((m) => isCoreModule(m.slug));
  const premiumModules = modules.filter((m) => !isCoreModule(m.slug));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Modules
            <Badge variant="secondary" className="ml-2">
              {modules.length} available
            </Badge>
          </CardTitle>
          <CardDescription>
            Enable or disable modules for your company. Core modules are always enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Modules */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Core Modules
              <Badge variant="outline" className="text-xs">Always enabled</Badge>
            </h3>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coreModules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">{module.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {module.description || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Premium Modules */}
          {premiumModules.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Unlock className="h-4 w-4 text-muted-foreground" />
                Premium Modules
              </h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24 text-center">Status</TableHead>
                      <TableHead className="w-24 text-center">Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {premiumModules.map((module) => {
                      const enabled = isModuleEnabled(module.id);
                      const status = getModuleStatus(module.id);
                      
                      return (
                        <TableRow key={module.id}>
                          <TableCell className="font-medium">{module.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {module.description || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {enabled ? (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {status?.status === "trial" ? "Trial" : "Active"}
                              </Badge>
                            ) : status?.status === "suspended" ? (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                <XCircle className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Not enabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isCompanyAdmin ? (
                              <Switch
                                checked={enabled}
                                onCheckedChange={() => handleToggle(module, enabled)}
                                disabled={isPending}
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, module: null, action: "enable" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {confirmDialog.module?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling this module will prevent all users in your company from accessing it. 
              Any data associated with this module will be preserved but inaccessible until re-enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disable Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
