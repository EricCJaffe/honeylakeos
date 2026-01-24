import { useState } from "react";
import {
  useFramework,
  useFrameworkMutations,
  useConceptMutations,
  useCadenceMutations,
  useDashboardMutations,
  useHealthMetricMutations,
  FrameworkConcept,
  FrameworkCadence,
  FrameworkDashboard,
  FrameworkHealthMetric,
} from "@/hooks/useFrameworks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen, Calendar, LayoutDashboard, Activity, Save } from "lucide-react";

interface FrameworkEditorProps {
  frameworkId: string;
  readOnly?: boolean;
}

export function FrameworkEditor({ frameworkId, readOnly = false }: FrameworkEditorProps) {
  const { data, isLoading } = useFramework(frameworkId);
  const { updateFramework } = useFrameworkMutations();
  const { createConcept, updateConcept, deleteConcept } = useConceptMutations();
  const { createCadence, updateCadence, deleteCadence } = useCadenceMutations();
  const { createDashboard, updateDashboard, deleteDashboard } = useDashboardMutations();
  const { createMetric, updateMetric, deleteMetric } = useHealthMetricMutations();

  const [activeTab, setActiveTab] = useState("concepts");
  const [editingConcept, setEditingConcept] = useState<Partial<FrameworkConcept> | null>(null);
  const [editingCadence, setEditingCadence] = useState<Partial<FrameworkCadence> | null>(null);
  const [editingDashboard, setEditingDashboard] = useState<Partial<FrameworkDashboard> | null>(null);
  const [editingMetric, setEditingMetric] = useState<Partial<FrameworkHealthMetric> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.framework) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Framework not found
        </CardContent>
      </Card>
    );
  }

  const { framework, concepts, cadences, dashboards, metrics } = data;

  const handlePublish = () => {
    updateFramework.mutate({
      id: frameworkId,
      updates: { status: "published" },
    });
  };

  const handleSaveConcept = () => {
    if (!editingConcept) return;
    if (editingConcept.id) {
      updateConcept.mutate({
        id: editingConcept.id,
        frameworkId,
        updates: editingConcept,
      });
    } else {
      createConcept.mutate({
        framework_id: frameworkId,
        key: editingConcept.key || "",
        display_name_singular: editingConcept.display_name_singular || "",
        display_name_plural: editingConcept.display_name_plural || "",
        description: editingConcept.description || null,
        sort_order: editingConcept.sort_order || concepts.length,
        enabled: editingConcept.enabled ?? true,
      });
    }
    setEditingConcept(null);
  };

  const handleSaveCadence = () => {
    if (!editingCadence) return;
    if (editingCadence.id) {
      updateCadence.mutate({
        id: editingCadence.id,
        frameworkId,
        updates: editingCadence,
      });
    } else {
      createCadence.mutate({
        framework_id: frameworkId,
        key: editingCadence.key || "",
        display_name: editingCadence.display_name || "",
        frequency_type: editingCadence.frequency_type || "weekly",
        interval_n: editingCadence.interval_n || null,
        target_day_of_week: editingCadence.target_day_of_week || null,
        target_day_of_month: editingCadence.target_day_of_month || null,
        duration_minutes: editingCadence.duration_minutes || null,
        default_owner_role_hint: editingCadence.default_owner_role_hint || null,
        sort_order: editingCadence.sort_order || cadences.length,
        enabled: editingCadence.enabled ?? true,
      });
    }
    setEditingCadence(null);
  };

  const handleSaveDashboard = () => {
    if (!editingDashboard) return;
    if (editingDashboard.id) {
      updateDashboard.mutate({
        id: editingDashboard.id,
        frameworkId,
        updates: editingDashboard,
      });
    } else {
      createDashboard.mutate({
        framework_id: frameworkId,
        key: editingDashboard.key || "",
        display_name: editingDashboard.display_name || "",
        audience: editingDashboard.audience || "member",
        sort_order: editingDashboard.sort_order || dashboards.length,
        enabled: editingDashboard.enabled ?? true,
      });
    }
    setEditingDashboard(null);
  };

  const handleSaveMetric = () => {
    if (!editingMetric) return;
    if (editingMetric.id) {
      updateMetric.mutate({
        id: editingMetric.id,
        frameworkId,
        updates: editingMetric,
      });
    } else {
      createMetric.mutate({
        framework_id: frameworkId,
        key: editingMetric.key || "",
        display_name: editingMetric.display_name || "",
        description: editingMetric.description || null,
        metric_type: editingMetric.metric_type || "count",
        data_source_type: editingMetric.data_source_type || "tasks",
        calculation_key: editingMetric.calculation_key || "",
        thresholds: editingMetric.thresholds || { green: null, yellow: null, red: null },
        enabled: editingMetric.enabled ?? true,
        sort_order: editingMetric.sort_order || metrics.length,
      });
    }
    setEditingMetric(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    switch (type) {
      case "concept":
        deleteConcept.mutate({ id, frameworkId });
        break;
      case "cadence":
        deleteCadence.mutate({ id, frameworkId });
        break;
      case "dashboard":
        deleteDashboard.mutate({ id, frameworkId });
        break;
      case "metric":
        deleteMetric.mutate({ id, frameworkId });
        break;
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Framework Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{framework.name}</CardTitle>
              <CardDescription className="mt-1">
                <Badge variant={framework.status === "published" ? "default" : "secondary"}>
                  {framework.status}
                </Badge>
                {framework.version_label && (
                  <span className="ml-2 text-muted-foreground">{framework.version_label}</span>
                )}
              </CardDescription>
            </div>
            {!readOnly && framework.status === "draft" && (
              <Button onClick={handlePublish} disabled={updateFramework.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Publish Framework
              </Button>
            )}
          </div>
          {framework.description && (
            <p className="text-sm text-muted-foreground mt-2">{framework.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Component Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="concepts" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Concepts ({concepts.length})
          </TabsTrigger>
          <TabsTrigger value="cadences" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cadences ({cadences.length})
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboards ({dashboards.length})
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health Metrics ({metrics.length})
          </TabsTrigger>
        </TabsList>

        {/* Concepts Tab */}
        <TabsContent value="concepts" className="space-y-4">
          {!readOnly && (
            <Button onClick={() => setEditingConcept({})}>
              <Plus className="h-4 w-4 mr-2" />
              Add Concept
            </Button>
          )}
          <div className="grid gap-4">
            {concepts.map((concept) => (
              <Card key={concept.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={concept.enabled}
                        disabled={readOnly}
                        onCheckedChange={(enabled) =>
                          updateConcept.mutate({
                            id: concept.id,
                            frameworkId,
                            updates: { enabled },
                          })
                        }
                      />
                      <div>
                        <CardTitle className="text-base">
                          {concept.display_name_singular} / {concept.display_name_plural}
                        </CardTitle>
                        <CardDescription>Key: {concept.key}</CardDescription>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingConcept(concept)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm({ type: "concept", id: concept.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cadences Tab */}
        <TabsContent value="cadences" className="space-y-4">
          {!readOnly && (
            <Button onClick={() => setEditingCadence({})}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cadence
            </Button>
          )}
          <div className="grid gap-4">
            {cadences.map((cadence) => (
              <Card key={cadence.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={cadence.enabled}
                        disabled={readOnly}
                        onCheckedChange={(enabled) =>
                          updateCadence.mutate({
                            id: cadence.id,
                            frameworkId,
                            updates: { enabled },
                          })
                        }
                      />
                      <div>
                        <CardTitle className="text-base">{cadence.display_name}</CardTitle>
                        <CardDescription>
                          {cadence.frequency_type}
                          {cadence.duration_minutes && ` • ${cadence.duration_minutes} min`}
                        </CardDescription>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingCadence(cadence)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm({ type: "cadence", id: cadence.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Dashboards Tab */}
        <TabsContent value="dashboards" className="space-y-4">
          {!readOnly && (
            <Button onClick={() => setEditingDashboard({})}>
              <Plus className="h-4 w-4 mr-2" />
              Add Dashboard
            </Button>
          )}
          <div className="grid gap-4">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={dashboard.enabled}
                        disabled={readOnly}
                        onCheckedChange={(enabled) =>
                          updateDashboard.mutate({
                            id: dashboard.id,
                            frameworkId,
                            updates: { enabled },
                          })
                        }
                      />
                      <div>
                        <CardTitle className="text-base">{dashboard.display_name}</CardTitle>
                        <CardDescription>
                          Audience: {dashboard.audience.replace("_", " ")}
                        </CardDescription>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingDashboard(dashboard)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm({ type: "dashboard", id: dashboard.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Health Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {!readOnly && (
            <Button onClick={() => setEditingMetric({})}>
              <Plus className="h-4 w-4 mr-2" />
              Add Health Metric
            </Button>
          )}
          <div className="grid gap-4">
            {metrics.map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={metric.enabled}
                        disabled={readOnly}
                        onCheckedChange={(enabled) =>
                          updateMetric.mutate({
                            id: metric.id,
                            frameworkId,
                            updates: { enabled },
                          })
                        }
                      />
                      <div>
                        <CardTitle className="text-base">{metric.display_name}</CardTitle>
                        <CardDescription>
                          {metric.metric_type} • {metric.data_source_type}
                        </CardDescription>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingMetric(metric)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm({ type: "metric", id: metric.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Concept Dialog */}
      <Dialog open={!!editingConcept} onOpenChange={() => setEditingConcept(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingConcept?.id ? "Edit Concept" : "Add Concept"}</DialogTitle>
            <DialogDescription>Define a vocabulary term for your framework.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key (internal identifier)</Label>
              <Input
                value={editingConcept?.key || ""}
                onChange={(e) => setEditingConcept({ ...editingConcept, key: e.target.value })}
                placeholder="e.g., quarterly_priorities"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Singular Name</Label>
                <Input
                  value={editingConcept?.display_name_singular || ""}
                  onChange={(e) =>
                    setEditingConcept({ ...editingConcept, display_name_singular: e.target.value })
                  }
                  placeholder="e.g., Rock"
                />
              </div>
              <div className="space-y-2">
                <Label>Plural Name</Label>
                <Input
                  value={editingConcept?.display_name_plural || ""}
                  onChange={(e) =>
                    setEditingConcept({ ...editingConcept, display_name_plural: e.target.value })
                  }
                  placeholder="e.g., Rocks"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editingConcept?.description || ""}
                onChange={(e) => setEditingConcept({ ...editingConcept, description: e.target.value })}
                placeholder="Describe this concept"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConcept(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConcept}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cadence Dialog */}
      <Dialog open={!!editingCadence} onOpenChange={() => setEditingCadence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCadence?.id ? "Edit Cadence" : "Add Cadence"}</DialogTitle>
            <DialogDescription>Define a recurring meeting or rhythm.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={editingCadence?.key || ""}
                onChange={(e) => setEditingCadence({ ...editingCadence, key: e.target.value })}
                placeholder="e.g., weekly_meeting"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editingCadence?.display_name || ""}
                onChange={(e) => setEditingCadence({ ...editingCadence, display_name: e.target.value })}
                placeholder="e.g., Weekly L10 Meeting"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={editingCadence?.frequency_type || "weekly"}
                  onValueChange={(value) =>
                    setEditingCadence({
                      ...editingCadence,
                      frequency_type: value as FrameworkCadence["frequency_type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={editingCadence?.duration_minutes || ""}
                  onChange={(e) =>
                    setEditingCadence({
                      ...editingCadence,
                      duration_minutes: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="e.g., 90"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCadence(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCadence}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dashboard Dialog */}
      <Dialog open={!!editingDashboard} onOpenChange={() => setEditingDashboard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDashboard?.id ? "Edit Dashboard" : "Add Dashboard"}</DialogTitle>
            <DialogDescription>Define a dashboard view for your framework.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={editingDashboard?.key || ""}
                onChange={(e) => setEditingDashboard({ ...editingDashboard, key: e.target.value })}
                placeholder="e.g., leadership_dashboard"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editingDashboard?.display_name || ""}
                onChange={(e) => setEditingDashboard({ ...editingDashboard, display_name: e.target.value })}
                placeholder="e.g., Leadership Dashboard"
              />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={editingDashboard?.audience || "member"}
                onValueChange={(value) =>
                  setEditingDashboard({
                    ...editingDashboard,
                    audience: value as FrameworkDashboard["audience"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_admin">Company Admin</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="coach_manager">Coach Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDashboard(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDashboard}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metric Dialog */}
      <Dialog open={!!editingMetric} onOpenChange={() => setEditingMetric(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMetric?.id ? "Edit Health Metric" : "Add Health Metric"}</DialogTitle>
            <DialogDescription>Define a health indicator for your framework.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={editingMetric?.key || ""}
                  onChange={(e) => setEditingMetric({ ...editingMetric, key: e.target.value })}
                  placeholder="e.g., rocks_completion"
                />
              </div>
              <div className="space-y-2">
                <Label>Calculation Key</Label>
                <Input
                  value={editingMetric?.calculation_key || ""}
                  onChange={(e) => setEditingMetric({ ...editingMetric, calculation_key: e.target.value })}
                  placeholder="e.g., rocks_completion_rate"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editingMetric?.display_name || ""}
                onChange={(e) => setEditingMetric({ ...editingMetric, display_name: e.target.value })}
                placeholder="e.g., Rocks Completion Rate"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metric Type</Label>
                <Select
                  value={editingMetric?.metric_type || "count"}
                  onValueChange={(value) =>
                    setEditingMetric({
                      ...editingMetric,
                      metric_type: value as FrameworkHealthMetric["metric_type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="trend">Trend</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select
                  value={editingMetric?.data_source_type || "tasks"}
                  onValueChange={(value) =>
                    setEditingMetric({ ...editingMetric, data_source_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="calendar">Calendar</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="lms">LMS</SelectItem>
                    <SelectItem value="crm">CRM</SelectItem>
                    <SelectItem value="custom_derived">Custom Derived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editingMetric?.description || ""}
                onChange={(e) => setEditingMetric({ ...editingMetric, description: e.target.value })}
                placeholder="Describe this metric"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMetric(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMetric}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirm?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
