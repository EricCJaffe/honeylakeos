import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_date: z.date({ required_error: "Start date is required" }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean().default(false),
  location_text: z.string().optional(),
  color: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
  defaultDate?: Date | null;
}

const colors = [
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#dc2626", label: "Red" },
  { value: "#9333ea", label: "Purple" },
  { value: "#ea580c", label: "Orange" },
  { value: "#0891b2", label: "Cyan" },
];

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
}: EventFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!event;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      start_date: defaultDate || new Date(),
      start_time: "09:00",
      end_time: "10:00",
      all_day: false,
      location_text: "",
      color: "#2563eb",
    },
  });

  React.useEffect(() => {
    if (event) {
      const startDate = new Date(event.start_at);
      form.reset({
        title: event.title,
        description: event.description || "",
        start_date: startDate,
        start_time: format(startDate, "HH:mm"),
        end_time: event.end_at ? format(new Date(event.end_at), "HH:mm") : "10:00",
        all_day: event.all_day,
        location_text: event.location_text || "",
        color: event.color || "#2563eb",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        start_date: defaultDate || new Date(),
        start_time: "09:00",
        end_time: "10:00",
        all_day: false,
        location_text: "",
        color: "#2563eb",
      });
    }
  }, [event, defaultDate, form]);

  const mutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const startDate = values.start_date;
      let startAt: Date;
      let endAt: Date | null = null;

      if (values.all_day) {
        startAt = new Date(startDate);
        startAt.setHours(0, 0, 0, 0);
      } else {
        const [startHour, startMin] = (values.start_time || "09:00").split(":").map(Number);
        startAt = new Date(startDate);
        startAt.setHours(startHour, startMin, 0, 0);

        if (values.end_time) {
          const [endHour, endMin] = values.end_time.split(":").map(Number);
          endAt = new Date(startDate);
          endAt.setHours(endHour, endMin, 0, 0);
        }
      }

      const eventData = {
        title: values.title,
        description: values.description || null,
        start_at: startAt.toISOString(),
        end_at: endAt?.toISOString() || null,
        all_day: values.all_day,
        location_text: values.location_text || null,
        color: values.color || null,
      };

      if (isEditing && event) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", event.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert({
          ...eventData,
          company_id: activeCompanyId,
          created_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(isEditing ? "Event updated" : "Event created");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (values: EventFormValues) => {
    mutation.mutate(values);
  };

  const allDay = form.watch("all_day");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add more details..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">All day</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!allDay && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="location_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Add location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => field.onChange(color.value)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          field.value === color.value
                            ? "border-foreground scale-110"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
