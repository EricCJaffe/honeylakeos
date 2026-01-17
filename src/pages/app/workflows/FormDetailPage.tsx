import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Copy,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useWfForm,
  useWfFormFields,
  useWfFormMutations,
  useWfFormFieldMutations,
  useWfFormStats,
  useWfFormSubmissions,
} from "@/hooks/useWorkflowForms";
import { useMembership } from "@/lib/membership";
import { FormFieldDialog } from "./FormFieldDialog";
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
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<WfFormField | null>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "submissions" | "stats">("builder");

  const { data: form, isLoading: formLoading } = useWfForm(formId);
  const { data: fields, isLoading: fieldsLoading } = useWfFormFields(formId);
  const { data: stats } = useWfFormStats(formId);
  const { data: submissions } = useWfFormSubmissions({ formId });

  const { publishForm, archiveForm, deleteForm } = useWfFormMutations();
  const { deleteField } = useWfFormFieldMutations(formId ?? "");

  const canManage = isCompanyAdmin;

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
    await publishForm.mutateAsync(form.id);
  };

  const handleArchive = async () => {
    await archiveForm.mutateAsync(form.id);
    navigate("/app/workflows");
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this form?")) {
      await deleteForm.mutateAsync(form.id);
      navigate("/app/workflows");
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (confirm("Are you sure you want to delete this field?")) {
      await deleteField.mutateAsync(fieldId);
    }
  };

  const handleEditField = (field: WfFormField) => {
    setEditingField(field);
    setShowFieldDialog(true);
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
          {form.status === "published" && (
            <Button variant="outline" onClick={() => navigate(`/app/workflows/forms/${form.id}/submit`)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          {canManage && form.status === "draft" && (
            <Button onClick={handlePublish} disabled={publishForm.isPending}>
              Publish
            </Button>
          )}
        </div>
      </div>

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
                <CardDescription>Define the fields for this form</CardDescription>
              </div>
              {canManage && form.status === "draft" && (
                <Button onClick={() => {
                  setEditingField(null);
                  setShowFieldDialog(true);
                }}>
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
                      className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditField(field)}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {field.label}
                          {field.is_required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                        </p>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{field.key}</code>
                      {canManage && form.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No fields defined yet</p>
                  {canManage && form.status === "draft" && (
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

      <FormFieldDialog
        open={showFieldDialog}
        onOpenChange={setShowFieldDialog}
        formId={formId ?? ""}
        field={editingField}
      />
    </div>
  );
}
