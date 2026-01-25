import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyActiveFramework, useFrameworks, useFrameworkMutations } from "@/hooks/useFrameworks";
import { useMembership } from "@/lib/membership";
import { PageHeader } from "@/components/PageHeader";
import { FrameworkMarketplaceBrowser } from "@/components/frameworks/FrameworkMarketplaceBrowser";
import { FrameworkEditor } from "@/components/frameworks/FrameworkEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Settings, AlertTriangle, Store } from "lucide-react";

export default function FrameworksPage() {
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const { data: activeFramework, isLoading: activeLoading } = useCompanyActiveFramework();
  const { data: frameworksData, isLoading: frameworksLoading } = useFrameworks();
  const { adoptFramework } = useFrameworkMutations();

  const [activeTab, setActiveTab] = useState(activeFramework ? "current" : "browse");
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null);

  const handleAdopt = (frameworkId: string) => {
    if (activeFramework) {
      // Warn before switching
      setSwitchConfirm(frameworkId);
    } else {
      adoptFramework.mutate(frameworkId);
    }
  };

  const confirmSwitch = () => {
    if (switchConfirm) {
      adoptFramework.mutate(switchConfirm);
      setSwitchConfirm(null);
    }
  };

  if (activeLoading || frameworksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Framework"
        description="Select and customize your operating methodology"
      />

      {activeFramework ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="current">Current Framework</TabsTrigger>
            <TabsTrigger value="edit" disabled={!isCompanyAdmin}>
              <Settings className="h-4 w-4 mr-2" />
              Customize
            </TabsTrigger>
            <TabsTrigger value="browse">
              <Store className="h-4 w-4 mr-2" />
              Marketplace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {activeFramework.framework?.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge
                        variant={
                          activeFramework.framework?.status === "published" ? "default" : "secondary"
                        }
                      >
                        {activeFramework.framework?.status}
                      </Badge>
                      {activeFramework.framework?.version_label && (
                        <span className="ml-2">{activeFramework.framework.version_label}</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {activeFramework.framework?.description && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {activeFramework.framework.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Adopted on {new Date(activeFramework.adopted_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>

            {/* Quick stats about framework components */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Concepts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cadences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Dashboards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Health Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="edit">
            {isCompanyAdmin ? (
              <FrameworkEditor frameworkId={activeFramework.active_framework_id} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Only company admins can customize the framework.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="browse">
            <FrameworkMarketplaceBrowser onFrameworkAdopted={() => setActiveTab("current")} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Get Started with a Framework</CardTitle>
              <CardDescription>
                Select a framework to guide your organization's operating rhythm. You can customize
                it after adoption.
              </CardDescription>
            </CardHeader>
          </Card>

          <FrameworkMarketplaceBrowser onFrameworkAdopted={() => {}} />
        </div>
      )}

      {/* Switch Framework Confirmation */}
      <AlertDialog open={!!switchConfirm} onOpenChange={() => setSwitchConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Switch Framework?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You already have an active framework. Switching will change your dashboards and
              guidance, but your existing data (tasks, projects, etc.) will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Switch Framework</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
