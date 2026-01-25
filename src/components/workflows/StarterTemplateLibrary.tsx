import { useState, useMemo } from "react";
import {
  Users,
  FileText,
  Settings2,
  ClipboardCheck,
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertCircle,
  Lock,
  Package,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  allTemplates,
  templatesByCategory,
  categoryLabels,
  type StarterTemplate,
  type TemplateCategory,
  type FormTemplate,
  type WorkflowTemplate,
  type RequiredModule,
} from "@/data/workflowTemplates";
import { useWfFormMutations, useWfFormFieldMutations } from "@/hooks/useWorkflowForms";
import { useWfWorkflowMutations, useWfWorkflowStepMutations } from "@/hooks/useWorkflows";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useMembership } from "@/lib/membership";

interface StarterTemplateLibraryProps {
  onTemplateAdded?: () => void;
}

export function StarterTemplateLibrary({ onTemplateAdded }: StarterTemplateLibraryProps) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const { log } = useAuditLog();
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");

  const { createForm } = useWfFormMutations();
  const { createWorkflow } = useWfWorkflowMutations();

  const canAddTemplates = isCompanyAdmin || isSiteAdmin;

  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case "employee_lifecycle":
        return Users;
      case "requests":
        return ClipboardCheck;
      case "surveys":
        return MessageSquare;
      case "coaching":
        return Settings2;
      default:
        return FileText;
    }
  };

  const getTypeIcon = (type: "form" | "workflow") => {
    return type === "form" ? FileText : Settings2;
  };

  const checkModulesAvailable = (requiredModules: RequiredModule[]): { available: boolean; missing: RequiredModule[] } => {
    const missing = requiredModules.filter((mod) => !isEnabled(mod as any));
    return { available: missing.length === 0, missing };
  };

  const handleAddTemplate = async (template: StarterTemplate) => {
    if (!activeCompanyId || !canAddTemplates) return;

    setAddingTemplate(template.id);

    try {
      if (template.type === "form") {
        await addFormTemplate(template as FormTemplate);
      } else {
        await addWorkflowTemplate(template as WorkflowTemplate);
      }

      toast.success(`${template.title} added to your library`);
      log("template.duplicated" as any, template.type as any, template.id, { 
        title: template.title,
        category: template.category 
      });
      onTemplateAdded?.();
    } catch (error) {
      console.error("Failed to add template:", error);
      toast.error("Failed to add template");
    } finally {
      setAddingTemplate(null);
    }
  };

  const addFormTemplate = async (template: FormTemplate) => {
    // Create the form
    const formResult = await createForm.mutateAsync({
      title: template.title,
      description: template.description,
      scope_type: "company",
      company_id: activeCompanyId!,
      status: "draft",
    });

    // Add fields to the form
    if (formResult && template.fields.length > 0) {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Generate unique keys for each field
      const fieldInserts = template.fields.map((field, index) => ({
        form_id: formResult.id,
        key: `field_${index}_${Date.now()}`,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        help_text: field.helper_text || null,
        options: field.options ? JSON.parse(JSON.stringify(field.options)) : null,
        sort_order: field.sort_order,
      }));

      const { error } = await supabase.from("wf_form_fields").insert(fieldInserts);
      if (error) throw error;
    }

    return formResult;
  };

  const addWorkflowTemplate = async (template: WorkflowTemplate) => {
    // Create the workflow
    const workflowResult = await createWorkflow.mutateAsync({
      title: template.title,
      description: template.description,
      trigger_type: template.trigger_type,
      scope_type: "company",
      company_id: activeCompanyId!,
      status: "draft",
    });

    // Add steps to the workflow (filter out disabled module steps)
    if (workflowResult && template.steps.length > 0) {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const enabledSteps = template.steps.filter((step) => {
        if (!step.required_module) return true;
        return isEnabled(step.required_module as any);
      });

      const stepInserts = enabledSteps.map((step, index) => ({
        workflow_id: workflowResult.id,
        step_type: step.step_type,
        title: step.title,
        instructions: step.instructions || null,
        assignee_type: step.assignee_type,
        due_days_offset: step.due_offset_days || null,
        sort_order: index,
        enabled: true,
      }));

      if (stepInserts.length > 0) {
        const { error } = await supabase.from("wf_workflow_steps").insert(stepInserts);
        if (error) throw error;
      }
    }

    return workflowResult;
  };

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "all") return allTemplates;
    return templatesByCategory[activeCategory] || [];
  }, [activeCategory]);

  const categories: (TemplateCategory | "all")[] = ["all", "employee_lifecycle", "requests", "surveys"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Starter Templates</h3>
          <p className="text-sm text-muted-foreground">
            Ready-to-use workflows and forms you can customize
          </p>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          {categories.slice(1).map((cat) => {
            const Icon = getCategoryIcon(cat as TemplateCategory);
            return (
              <TabsTrigger key={cat} value={cat} className="gap-2">
                <Icon className="h-4 w-4" />
                {categoryLabels[cat as TemplateCategory].label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No templates in this category yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const TypeIcon = getTypeIcon(template.type);
                const CategoryIcon = getCategoryIcon(template.category);
                const { available, missing } = checkModulesAvailable(template.required_modules);
                const isAdding = addingTemplate === template.id;

                return (
                  <Card key={template.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <TypeIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{template.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {template.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs gap-1">
                                <CategoryIcon className="h-3 w-3" />
                                {categoryLabels[template.category].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <CardDescription className="flex-1 text-sm">
                        {template.summary}
                      </CardDescription>

                      {/* Required modules indicator */}
                      {template.required_modules.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {template.required_modules.map((mod) => {
                            const modEnabled = isEnabled(mod as any);
                            return (
                              <Badge
                                key={mod}
                                variant={modEnabled ? "outline" : "destructive"}
                                className="text-xs gap-1"
                              >
                                {modEnabled ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {mod}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Steps/Fields count */}
                      <div className="mt-3 text-xs text-muted-foreground">
                        {template.type === "form" ? (
                          <span>{(template as FormTemplate).fields.length} fields</span>
                        ) : (
                          <span>{(template as WorkflowTemplate).steps.length} steps</span>
                        )}
                      </div>

                      {/* Add button */}
                      <div className="mt-4 pt-3 border-t">
                        {!canAddTemplates ? (
                          <p className="text-xs text-muted-foreground">
                            Admin access required to add templates
                          </p>
                        ) : !available ? (
                          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                              Missing modules: {missing.join(", ")}. Steps requiring these will be skipped.
                            </span>
                          </div>
                        ) : null}

                        <Button
                          onClick={() => handleAddTemplate(template)}
                          disabled={isAdding || !canAddTemplates}
                          className="w-full mt-2"
                          variant={available ? "default" : "secondary"}
                        >
                          {isAdding ? (
                            <>Adding...</>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Add to Company
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
