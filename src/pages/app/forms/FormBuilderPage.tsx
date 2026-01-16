import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Send,
  Eye,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleGuard } from "@/components/ModuleGuard";
import {
  useForm,
  useFormFields,
  useForms,
  FormField,
  FieldType,
  FieldMapping,
  getFieldTypeLabel,
  getFieldMappingLabel,
  getStatusBadgeVariant,
  FormStatus,
} from "@/hooks/useForms";
import { useModuleAccess } from "@/hooks/useModuleAccess";

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: "short_text", label: "Short Text", icon: "Aa" },
  { value: "long_text", label: "Long Text", icon: "¶" },
  { value: "email", label: "Email", icon: "@" },
  { value: "phone", label: "Phone", icon: "📞" },
  { value: "dropdown", label: "Dropdown", icon: "▼" },
  { value: "checkbox", label: "Checkbox", icon: "☑" },
  { value: "date", label: "Date", icon: "📅" },
];

const FIELD_MAPPINGS: { value: FieldMapping; label: string }[] = [
  { value: null, label: "None" },
  { value: "contact_name", label: "Contact Name" },
  { value: "contact_email", label: "Contact Email" },
  { value: "contact_phone", label: "Contact Phone" },
  { value: "contact_organization", label: "Organization" },
  { value: "crm_notes", label: "CRM Notes" },
];

function FieldCard({
  field,
  onEdit,
  onDelete,
}: {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="cursor-grab text-muted-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{field.label}</span>
              {field.is_required && (
                <Badge variant="secondary" className="text-xs">Required</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{getFieldTypeLabel(field.field_type as FieldType)}</span>
              {field.maps_to && (
                <>
                  <span>•</span>
                  <span>Maps to: {getFieldMappingLabel(field.maps_to as FieldMapping)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddFieldDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: FieldType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Field</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {FIELD_TYPES.map((type) => (
            <Button
              key={type.value}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                onAdd(type.value);
                onOpenChange(false);
              }}
            >
              <span className="text-lg">{type.icon}</span>
              <span>{type.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditFieldSheet({
  field,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  field: FormField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<FormField>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(field?.label || "");
  const [placeholder, setPlaceholder] = useState(field?.placeholder || "");
  const [helperText, setHelperText] = useState(field?.helper_text || "");
  const [isRequired, setIsRequired] = useState(field?.is_required || false);
  const [mapsTo, setMapsTo] = useState<FieldMapping>(field?.maps_to as FieldMapping || null);
  const [options, setOptions] = useState<string>((field?.options as string[] || []).join("\n"));

  // Reset when field changes
  useState(() => {
    if (field) {
      setLabel(field.label);
      setPlaceholder(field.placeholder || "");
      setHelperText(field.helper_text || "");
      setIsRequired(field.is_required || false);
      setMapsTo(field.maps_to as FieldMapping || null);
      setOptions((field.options as string[] || []).join("\n"));
    }
  });

  const handleSave = () => {
    const optionsArray = options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    onSave({
      label: label.trim(),
      placeholder: placeholder.trim() || null,
      helper_text: helperText.trim() || null,
      is_required: isRequired,
      maps_to: mapsTo,
      options: optionsArray,
    });
    onOpenChange(false);
  };

  if (!field) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Field</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Input value={getFieldTypeLabel(field.field_type as FieldType)} disabled />
          </div>

          <div className="space-y-2">
            <Label>Label *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Field label"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Placeholder text"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Helper Text</Label>
            <Input
              value={helperText}
              onChange={(e) => setHelperText(e.target.value)}
              placeholder="Help text below the field"
              maxLength={200}
            />
          </div>

          {field.field_type === "dropdown" && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Required</Label>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

          <div className="space-y-2">
            <Label>Map to (for workflows)</Label>
            <Select
              value={mapsTo || "none"}
              onValueChange={(v) => setMapsTo(v === "none" ? null : (v as FieldMapping))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_MAPPINGS.map((mapping) => (
                  <SelectItem key={mapping.value || "none"} value={mapping.value || "none"}>
                    {mapping.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={!label.trim()} className="flex-1">
              Save Changes
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FormBuilderContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading: formLoading } = useForm(id);
  const { fields, createField, updateField, deleteField } = useFormFields(id);
  const { updateForm } = useForms();
  const { hasAccess: hasCrmAccess } = useModuleAccess("crm");
  const { hasAccess: hasTasksAccess } = useModuleAccess("tasks");

  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form settings state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [createContact, setCreateContact] = useState(false);
  const [createCrm, setCreateCrm] = useState(false);
  const [crmStatus, setCrmStatus] = useState("prospect");
  const [createTask, setCreateTask] = useState(false);
  const [taskTemplate, setTaskTemplate] = useState("");

  // Sync form data to state
  useState(() => {
    if (form) {
      setFormName(form.name);
      setFormDescription(form.description || "");
      setCreateContact(form.action_create_contact || false);
      setCreateCrm(form.action_create_crm || false);
      setCrmStatus(form.action_crm_lifecycle_status || "prospect");
      setCreateTask(form.action_create_task || false);
      setTaskTemplate(form.action_task_title_template || "");
    }
  });

  const handleAddField = async (type: FieldType) => {
    if (!id) return;
    const maxOrder = Math.max(0, ...fields.map((f) => f.sort_order));
    await createField({
      form_id: id,
      field_type: type,
      label: getFieldTypeLabel(type),
      sort_order: maxOrder + 1,
    });
  };

  const handleSaveField = async (data: {
    label?: string;
    placeholder?: string | null;
    helper_text?: string | null;
    is_required?: boolean;
    maps_to?: FieldMapping;
    options?: string[];
  }) => {
    if (!editingField) return;
    await updateField({ id: editingField.id, input: data });
    setEditingField(null);
  };

  const handleDeleteField = async () => {
    if (!editingField) return;
    await deleteField(editingField.id);
    setEditingField(null);
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    await updateForm({
      id,
      input: {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        action_create_contact: createContact,
        action_create_crm: createCrm,
        action_crm_lifecycle_status: crmStatus,
        action_create_task: createTask,
        action_task_title_template: taskTemplate.trim() || undefined,
      },
    });
    setSettingsOpen(false);
  };

  const handlePublish = async () => {
    if (!id) return;
    await updateForm({ id, input: { status: "published" } });
  };

  const handleUnpublish = async () => {
    if (!id) return;
    await updateForm({ id, input: { status: "draft" } });
  };

  if (formLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/app/forms")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Form not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/forms")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{form.name}</h1>
              <Badge variant={getStatusBadgeVariant(form.status as FormStatus)}>
                {form.status}
              </Badge>
            </div>
            {form.description && (
              <p className="text-sm text-muted-foreground">{form.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={() => navigate(`/app/forms/${id}/submissions`)}>
            <Eye className="h-4 w-4 mr-2" />
            Submissions
          </Button>
          {form.status === "draft" ? (
            <Button onClick={handlePublish} disabled={fields.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Publish
            </Button>
          ) : form.status === "published" ? (
            <Button variant="outline" onClick={handleUnpublish}>
              Unpublish
            </Button>
          ) : null}
        </div>
      </div>

      {/* Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Form Fields</CardTitle>
            <Button onClick={() => setAddFieldOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No fields yet. Add your first field to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  onEdit={() => setEditingField(field)}
                  onDelete={async () => {
                    await deleteField(field.id);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="font-medium">Create External Contact</p>
                <p className="text-sm text-muted-foreground">
                  Automatically create or update a contact from submission
                </p>
              </div>
              <Badge variant={form.action_create_contact ? "default" : "secondary"}>
                {form.action_create_contact ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="font-medium">Create CRM Record</p>
                <p className="text-sm text-muted-foreground">
                  Create a prospect/client record from submission
                </p>
              </div>
              <Badge variant={form.action_create_crm ? "default" : "secondary"}>
                {form.action_create_crm ? "Enabled" : "Disabled"}
                {!hasCrmAccess && " (Module disabled)"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="font-medium">Create Task</p>
                <p className="text-sm text-muted-foreground">
                  Create a follow-up task from submission
                </p>
              </div>
              <Badge variant={form.action_create_task ? "default" : "secondary"}>
                {form.action_create_task ? "Enabled" : "Disabled"}
                {!hasTasksAccess && " (Module disabled)"}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => setSettingsOpen(true)} className="w-full">
              Configure Actions
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddFieldDialog
        open={addFieldOpen}
        onOpenChange={setAddFieldOpen}
        onAdd={handleAddField}
      />

      <EditFieldSheet
        field={editingField}
        open={!!editingField}
        onOpenChange={(open) => !open && setEditingField(null)}
        onSave={handleSaveField}
        onDelete={handleDeleteField}
      />

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Form Settings</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="general" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Form Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  maxLength={500}
                />
              </div>
            </TabsContent>
            <TabsContent value="actions" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Create External Contact</p>
                    <p className="text-xs text-muted-foreground">
                      Map fields to contact_name, contact_email, etc.
                    </p>
                  </div>
                  <Switch checked={createContact} onCheckedChange={setCreateContact} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Create CRM Record</p>
                    <p className="text-xs text-muted-foreground">
                      {hasCrmAccess ? "Create prospect/client from submission" : "CRM module disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={createCrm}
                    onCheckedChange={setCreateCrm}
                    disabled={!hasCrmAccess}
                  />
                </div>

                {createCrm && hasCrmAccess && (
                  <div className="pl-4 border-l-2 border-muted">
                    <Label>Default Lifecycle Status</Label>
                    <Select value={crmStatus} onValueChange={setCrmStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Create Task</p>
                    <p className="text-xs text-muted-foreground">
                      {hasTasksAccess ? "Create follow-up task" : "Tasks module disabled"}
                    </p>
                  </div>
                  <Switch
                    checked={createTask}
                    onCheckedChange={setCreateTask}
                    disabled={!hasTasksAccess}
                  />
                </div>

                {createTask && hasTasksAccess && (
                  <div className="pl-4 border-l-2 border-muted space-y-2">
                    <Label>Task Title Template</Label>
                    <Input
                      value={taskTemplate}
                      onChange={(e) => setTaskTemplate(e.target.value)}
                      placeholder="Follow up with {name}"
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {"{name}"}, {"{email}"}, {"{form}"} as placeholders
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function FormBuilderPage() {
  return (
    <ModuleGuard moduleKey="forms" moduleName="Forms & Workflows">
      <FormBuilderContent />
    </ModuleGuard>
  );
}
