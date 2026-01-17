import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Copy,
  Pencil,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useWfForm,
  useWfFormFields,
  useWfFormMutations,
  useWfFormFieldMutations,
  useWfFormStats,
  useWfFormSubmissions,
} from "@/hooks/useWorkflowForms";
import { useMembership } from "@/lib/membership";
import { useAuditLog } from "@/hooks/useAuditLog";
import { FormFieldDialog } from "./FormFieldDialog";
import { FormPreviewPanel } from "./FormPreviewPanel";
import type { WfFormField } from "@/hooks/useWorkflowForms";

const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  multi_select: "Multi-Select",
  checkbox: "Checkbox",
  rating: "Rating",
  yes_no: "Yes/No",
};

export default function FormDetailPage() {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const { log } = useAuditLog();
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<WfFormField | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const defaultTab = searchParams.get("tab") || "builder";
  const [activeTab, setActiveTab] = useState<"builder" | "submissions" | "stats">(
    defaultTab as "builder" | "submissions" | "stats"
  );

  const { data: form, isLoading: formLoading } = useWfForm(formId);
  const { data: fields, isLoading: fieldsLoading } = useWfFormFields(formId);
  const { data: stats } = useWfFormStats(formId);
  const { data: submissions } = useWfFormSubmissions({ formId });

  const { publishForm, archiveForm, deleteForm, updateForm } = useWfFormMutations();
  const { deleteField, reorderFields } = useWfFormFieldMutations(formId ?? "");

  const canManage = isCompanyAdmin;
  const isDraft = form?.status === "draft";
  const hasFields = fields && fields.length > 0;

  if (formLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found</p>
        <Button variant="link" onClick={() => navigate("/app/workflows")}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  const handlePublish = async () => {
    if (!hasFields) {
      alert("Please add at least one field before publishing.");
      return;
    }
    await publishForm.mutateAsync(form.id);
    log("form.published", "form", form.id);
  };

  const handleUnpublish = async () => {
    await updateForm.mutateAsync({ id: form.id, status: "draft", published_at: null });
    log("form.unpublished", "form", form.id);
  };

  const handleArchive = async () => {
    await archiveForm.mutateAsync(form.id);
    log("form.archived", "form", form.id);
    navigate("/app/workflows");
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this form? This cannot be undone.")) {
      await deleteForm.mutateAsync(form.id);
      log("form.deleted", "form", form.id);
      navigate("/app/workflows");
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (confirm("Are you sure you want to delete this field?")) {
      await deleteField.mutateAsync(fieldId);
      log("form.field_deleted", "form", form.id, { field_id: fieldId });
    }
  };

  const handleEditField = (field: WfFormField) => {
    setEditingField(field);
    setShowFieldDialog(true);
  };

  const handleMoveField = async (index: number, direction: "up" | "down") => {
    if (!fields) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newOrder = [...fields];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    await reorderFields.mutateAsync(newOrder.map((f) => f.id));
    log("form.fields_reordered", "form", form.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader title={form.title} description={form.description || "No description"} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={form.status === "published" ? "default" : "secondary"}>
            {form.status}
          </Badge>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          {canManage && isDraft && (
            <Button onClick={handlePublish} disabled={publishForm.isPending || !hasFields}>
              Publish
            </Button>
          )}
          {canManage && form.status === "published" && (
            <Button variant="outline" onClick={handleUnpublish} disabled={updateForm.isPending}>
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Validation Warnings */}
      {isDraft && !hasFields && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Add at least one field before publishing this form.
          </AlertDescription>
        </Alert>
      )}

      {showPreview ? (
        <FormPreviewPanel form={form} fields={fields ?? []} onClose={() => setShowPreview(false)} />
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="builder">Form Builder</TabsTrigger>
              <TabsTrigger value="submissions">
                Submissions {submissions && submissions.length > 0 && `(${submissions.length})`}
              </TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Form Fields</CardTitle>
                    <CardDescription>
                      {isDraft
                        ? "Define the fields for this form. Drag or use arrows to reorder."
                        : "View form fields. Unpublish to make changes."}
                    </CardDescription>
                  </div>
                  {canManage && isDraft && (
                    <Button
                      onClick={() => {
                        setEditingField(null);
                        setShowFieldDialog(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {fieldsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : fields && fields.length > 0 ? (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            <span className="text-sm font-medium w-6">{index + 1}</span>
                          </div>

                          {/* Move buttons */}
                          {canManage && isDraft && (
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={index === 0}
                                onClick={() => handleMoveField(index, "up")}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={index === fields.length - 1}
                                onClick={() => handleMoveField(index, "down")}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <div className="flex-1 cursor-pointer" onClick={() => handleEditField(field)}>
                            <p className="font-medium">
                              {field.label}
                              {field.is_required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                              {field.help_text && ` • ${field.help_text}`}
                            </p>
                          </div>

                          <code className="text-xs bg-muted px-2 py-1 rounded">{field.key}</code>

                          {canManage && isDraft && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditField(field)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteField(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No fields defined yet</p>
                      {canManage && isDraft && (
                        <Button
                          variant="link"
                          className="mt-2"
                          onClick={() => {
                            setEditingField(null);
                            setShowFieldDialog(true);
                          }}
                        >
                          Add your first field
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Submissions</CardTitle>
                  <CardDescription>View all submissions for this form</CardDescription>
                </CardHeader>
                <CardContent>
                  {submissions && submissions.length > 0 ? (
                    <div className="space-y-2">
                      {submissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/app/workflows/submissions/${submission.id}`)}
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              Submission {submission.id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge>{submission.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No submissions yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Completion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{(stats?.completionRate ?? 0).toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      By Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {stats?.byStatus &&
                        Object.entries(stats.byStatus).map(([status, count]) => (
                          <div key={status} className="flex justify-between">
                            <span className="capitalize">{status}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {canManage && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                {form.status === "published" && (
                  <Button variant="outline" onClick={handleArchive} disabled={archiveForm.isPending}>
                    Archive Form
                  </Button>
                )}
                <Button variant="destructive" onClick={handleDelete} disabled={deleteForm.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Form
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <FormFieldDialog
        open={showFieldDialog}
        onOpenChange={setShowFieldDialog}
        formId={formId ?? ""}
        field={editingField}
      />
    </div>
  );
}
