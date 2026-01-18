import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import {
  IntegrationProvider,
  providerSecretFields,
  useSaveIntegrationSecrets,
  useDeleteIntegrationSecrets,
} from "@/hooks/useIntegrations";

interface IntegrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IntegrationProvider;
  scope: "company" | "site";
  scopeId: string;
  isConfigured: boolean;
}

export function IntegrationConfigDialog({
  open,
  onOpenChange,
  provider,
  scope,
  scopeId,
  isConfigured,
}: IntegrationConfigDialogProps) {
  const secretFields = providerSecretFields[provider.key] || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveSecrets = useSaveIntegrationSecrets();
  const deleteSecrets = useDeleteIntegrationSecrets();

  const handleSave = async () => {
    // Validate all required fields are filled
    const hasAllFields = secretFields.every((f) => values[f.key]?.trim());
    if (!hasAllFields) return;

    await saveSecrets.mutateAsync({
      scope,
      scopeId,
      providerKey: provider.key,
      secrets: values,
    });

    setValues({});
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteSecrets.mutateAsync({
      scope,
      scopeId,
      providerKey: provider.key,
    });

    setConfirmDelete(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setValues({});
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {provider.name}</DialogTitle>
          <DialogDescription>
            {isConfigured
              ? "Update your API credentials. Leave fields empty to keep existing values."
              : "Enter your API credentials to enable this integration."}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            Your credentials are encrypted and stored securely. They are never exposed to the client after saving.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          {secretFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.type}
                placeholder={isConfigured ? "••••••••" : `Enter ${field.label.toLowerCase()}`}
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isConfigured && !confirmDelete && (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Credentials
            </Button>
          )}

          {confirmDelete ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSecrets.isPending}
                className="flex-1"
              >
                {deleteSecrets.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Delete
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveSecrets.isPending || !secretFields.every((f) => values[f.key]?.trim())}
              >
                {saveSecrets.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isConfigured ? "Update" : "Save"} Credentials
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
