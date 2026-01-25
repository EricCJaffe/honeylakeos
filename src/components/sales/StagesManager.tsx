import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, GripVertical, Trash2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePipelineStages,
  useCreatePipelineStage,
  useUpdatePipelineStage,
  useArchivePipelineStage,
  SalesPipelineStage,
} from "@/hooks/useSalesPipelines";

const stageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  probability_percent: z.coerce.number().min(0).max(100).optional(),
  is_closed_won: z.boolean().optional(),
  is_closed_lost: z.boolean().optional(),
});

type StageFormValues = z.infer<typeof stageSchema>;

interface StagesManagerProps {
  pipelineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StagesManager({ pipelineId, open, onOpenChange }: StagesManagerProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingStage, setEditingStage] = useState<SalesPipelineStage | null>(null);

  const { data: stages = [] } = usePipelineStages(pipelineId || undefined);
  const createStage = useCreatePipelineStage();
  const updateStage = useUpdatePipelineStage();
  const archiveStage = useArchivePipelineStage();

  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: "",
      probability_percent: undefined,
      is_closed_won: false,
      is_closed_lost: false,
    },
  });

  const handleEdit = (stage: SalesPipelineStage) => {
    setEditingStage(stage);
    form.reset({
      name: stage.name,
      probability_percent: stage.probability_percent ?? undefined,
      is_closed_won: stage.is_closed_won,
      is_closed_lost: stage.is_closed_lost,
    });
  };

  const handleCancelEdit = () => {
    setEditingStage(null);
    setShowNewForm(false);
    form.reset();
  };

  const handleSave = async (data: StageFormValues) => {
    if (!pipelineId) return;

    if (editingStage) {
      await updateStage.mutateAsync({
        id: editingStage.id,
        pipeline_id: pipelineId,
        name: data.name,
        probability_percent: data.probability_percent ?? null,
        is_closed_won: data.is_closed_won,
        is_closed_lost: data.is_closed_lost,
      });
    } else {
      await createStage.mutateAsync({
        pipeline_id: pipelineId,
        name: data.name,
        sort_order: stages.length,
        probability_percent: data.probability_percent,
        is_closed_won: data.is_closed_won,
        is_closed_lost: data.is_closed_lost,
      });
    }

    handleCancelEdit();
  };

  const handleArchive = async (stage: SalesPipelineStage) => {
    if (!pipelineId) return;
    await archiveStage.mutateAsync({ id: stage.id, pipeline_id: pipelineId });
  };

  const isFormMode = showNewForm || editingStage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Stages</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-4">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  editingStage?.id === stage.id ? "ring-2 ring-primary" : ""
                }`}
              >
                {editingStage?.id === stage.id ? (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSave)}
                      className="flex-1 space-y-3"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Stage name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="probability_percent"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Probability %</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="is_closed_won"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormLabel className="text-xs">Won</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="is_closed_lost"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormLabel className="text-xs">Lost</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button type="submit" size="sm" disabled={updateStage.isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                    <span className="flex-1 font-medium">{stage.name}</span>
                    {stage.probability_percent != null && (
                      <Badge variant="outline" className="text-xs">
                        {stage.probability_percent}%
                      </Badge>
                    )}
                    {stage.is_closed_won && <Badge className="bg-green-500">Won</Badge>}
                    {stage.is_closed_lost && <Badge variant="destructive">Lost</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                      <span className="text-xs">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleArchive(stage)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {showNewForm && (
              <div className="p-3 rounded-lg border ring-2 ring-primary">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="New stage name" {...field} autoFocus />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="probability_percent"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Probability %</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} {...field} value={field.value ?? ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_closed_won"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel className="text-xs">Won</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_closed_lost"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel className="text-xs">Lost</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={createStage.isPending}>
                        Add Stage
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </ScrollArea>

        {!isFormMode && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => {
              form.reset();
              setShowNewForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Stage
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
