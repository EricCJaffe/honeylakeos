import * as React from "react";
import { FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { useActiveTemplates, Template, TemplateType } from "@/hooks/useTemplates";

interface TemplateSelectorProps {
  templateType: TemplateType;
  onSelect: (template: Template, overwrite: boolean) => void;
  hasExistingData?: boolean;
}

export function TemplateSelector({
  templateType,
  onSelect,
  hasExistingData = false,
}: TemplateSelectorProps) {
  const { data: templates = [], isLoading } = useActiveTemplates(templateType);
  const [pendingTemplate, setPendingTemplate] = React.useState<Template | null>(null);

  const handleSelect = (templateId: string) => {
    // Ensure templates is an array before calling .find()
    if (!Array.isArray(templates)) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (hasExistingData) {
      setPendingTemplate(template);
    } else {
      onSelect(template, false);
    }
  };

  const handleConfirmOverwrite = (overwrite: boolean) => {
    if (pendingTemplate) {
      onSelect(pendingTemplate, overwrite);
      setPendingTemplate(null);
    }
  };

  if (isLoading || !Array.isArray(templates) || templates.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Use a template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  {template.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      - {template.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AlertDialog open={!!pendingTemplate} onOpenChange={(open) => !open && setPendingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template</AlertDialogTitle>
            <AlertDialogDescription>
              You have existing data in the form. How would you like to apply the template "{pendingTemplate?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleConfirmOverwrite(false)}
            >
              Fill Empty Fields Only
            </Button>
            <AlertDialogAction onClick={() => handleConfirmOverwrite(true)}>
              Overwrite All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
