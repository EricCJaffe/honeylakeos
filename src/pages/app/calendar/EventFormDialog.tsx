import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useCompanyMembers } from "@/hooks/useEventAttendees";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { applyTemplateToForm, Template } from "@/hooks/useTemplates";
import {
  RecurrenceSelector,
  RecurrenceConfig,
  configToRRule,
  rruleToConfig,
} from "@/components/tasks/RecurrenceSelector";
import { LinkPicker } from "@/components/LinkPicker";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  start_date: z.date({ required_error: "Start date is required" }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean().default(false),
  location_text: z.string().optional(),
  color: z.string().optional(),
  project_id: z.string().optional().nullable(),
});

type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: any;
  defaultDate?: Date | null;
  editMode?: "single" | "future" | "series";
  occurrenceDate?: Date;
  templateToApply?: Template | null;
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
  editMode = "series",
  occurrenceDate,
  templateToApply,
}: EventFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!event;

  // Recurrence state
  const [recurrenceConfig, setRecurrenceConfig] = React.useState<RecurrenceConfig | null>(null);
  
  // Attendees state
  const [selectedAttendees, setSelectedAttendees] = React.useState<string[]>([]);
  const [isAttendeesOpen, setIsAttendeesOpen] = React.useState(false);

  // Fetch company members for attendees
  const { data: members = [] } = useCompanyMembers();

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
      project_id: null,
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
        project_id: event.project_id || null,
      });
      // Load recurrence config
      if (event.recurrence_rules) {
        setRecurrenceConfig(rruleToConfig(event.recurrence_rules, event.timezone));
      } else {
        setRecurrenceConfig(null);
      }
      // Load existing attendees
      setSelectedAttendees([]);
    } else if (templateToApply) {
      // Apply template when creating new event from template
      const payload = templateToApply.payload as Record<string, any>;
      form.reset({
        title: payload.title || "",
        description: payload.description || "",
        start_date: defaultDate || new Date(),
        start_time: "09:00",
        end_time: "10:00",
        all_day: payload.all_day || false,
        location_text: payload.location_text || "",
        color: payload.color || "#2563eb",
        project_id: null,
      });
      setRecurrenceConfig(null);
      setSelectedAttendees([]);
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
        project_id: null,
      });
      setRecurrenceConfig(null);
      setSelectedAttendees([]);
    }
  }, [event, defaultDate, form, templateToApply]);

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

      const rrule = configToRRule(recurrenceConfig, startAt);
      const isRecurring = !!rrule;

      const eventData = {
        title: values.title,
        description: values.description || null,
        start_at: startAt.toISOString(),
        end_at: endAt?.toISOString() || null,
        all_day: values.all_day,
        location_text: values.location_text || null,
        color: values.color || null,
        project_id: values.project_id || null,
        recurrence_rules: rrule,
        timezone: recurrenceConfig?.timezone || "America/New_York",
        is_recurring_template: isRecurring,
        recurrence_start_at: isRecurring ? startAt.toISOString() : null,
        recurrence_end_at: recurrenceConfig?.endDate 
          ? recurrenceConfig.endDate.toISOString() 
          : null,
        recurrence_count: recurrenceConfig?.endCount || null,
      };

      if (isEditing && event) {
        // If editing a single occurrence, create an override
        if (editMode === "single" && event.is_recurring_template && occurrenceDate) {
          const { error } = await supabase.rpc("create_event_occurrence_override", {
            p_series_event_id: event.id,
            p_occurrence_start_at: occurrenceDate.toISOString(),
            p_title: values.title,
            p_description: values.description || null,
            p_start_at: startAt.toISOString(),
            p_end_at: endAt?.toISOString() || null,
            p_all_day: values.all_day,
            p_location_text: values.location_text || null,
            p_color: values.color || null,
          });
          if (error) throw error;
        } else if (editMode === "future" && event.is_recurring_template && occurrenceDate) {
          // Split the series - edit this and future occurrences
          const { error } = await supabase.rpc("update_event_series_from_occurrence", {
            p_series_event_id: event.id,
            p_occurrence_start_at: occurrenceDate.toISOString(),
            p_new_rrule: rrule || event.recurrence_rules,
            p_title: values.title,
            p_description: values.description || null,
            p_start_at: startAt.toISOString(),
            p_end_at: endAt?.toISOString() || null,
            p_all_day: values.all_day,
            p_location_text: values.location_text || null,
            p_color: values.color || null,
          });
          if (error) throw error;
        } else {
          // Update the entire series or regular event
          const { error } = await supabase
            .from("events")
            .update(eventData)
            .eq("id", event.id);
          if (error) throw error;
        }
      } else {
        // Create new event
        const { data: newEvent, error } = await supabase.from("events").insert({
          ...eventData,
          company_id: activeCompanyId,
          created_by: user.id,
        }).select("id").single();
        if (error) throw error;

        // Add attendees if any selected
        if (selectedAttendees.length > 0 && newEvent) {
          const attendeeInserts = selectedAttendees.map((userId) => ({
            event_id: newEvent.id,
            user_id: userId,
            role: "required" as const,
            response_status: "needs_action" as const,
          }));
          
          await supabase.from("event_attendees").insert(attendeeInserts);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-events"] });
      queryClient.invalidateQueries({ queryKey: ["event-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["all-event-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees"] });
      toast.success(isEditing ? "Event updated" : "Event created");
      onOpenChange(false);
      form.reset();
      setRecurrenceConfig(null);
      setSelectedAttendees([]);
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (values: EventFormValues) => {
    mutation.mutate(values);
  };

  const allDay = form.watch("all_day");
  const startDate = form.watch("start_date");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? editMode === "single" 
                ? "Edit This Event" 
                : editMode === "future"
                ? "Edit This & Future Events"
                : "Edit Event" 
              : "New Event"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Selector - only for new events */}
            {!isEditing && (
              <TemplateSelector
                templateType="event"
                hasExistingData={!!form.watch("title") || !!form.watch("description")}
                onSelect={(template, overwrite) => {
                  const payload = template.payload as Record<string, any>;
                  const currentValues = form.getValues();
                  const newValues = applyTemplateToForm(currentValues, payload, overwrite);
                  form.reset(newValues);
                }}
              />
            )}

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

            {/* Recurrence - only show when creating new or editing series */}
            {editMode === "series" && (
              <div className="space-y-2">
                <FormLabel>Repeat</FormLabel>
                <RecurrenceSelector
                  value={recurrenceConfig}
                  onChange={setRecurrenceConfig}
                  startDate={startDate}
                />
              </div>
            )}

            {/* Project selector */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <LinkPicker
                      type="project"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Link to project (optional)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Attendees selector - only for new events */}
            {!isEditing && members.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Invite Attendees</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {selectedAttendees.map((userId) => {
                    const member = members.find((m: any) => m.user_id === userId);
                    if (!member) return null;
                    return (
                      <Badge key={userId} variant="secondary" className="flex items-center gap-1 py-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[10px]">
                            {(member.full_name || member.email || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{member.full_name || member.email}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAttendees((prev) => prev.filter((id) => id !== userId))}
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  <Popover open={isAttendeesOpen} onOpenChange={setIsAttendeesOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7">
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search members..." />
                        <CommandList>
                          <CommandEmpty>No members found.</CommandEmpty>
                          <CommandGroup>
                            {members
                              .filter((m: any) => 
                                !selectedAttendees.includes(m.user_id) && 
                                m.user_id !== user?.id
                              )
                              .map((member: any) => (
                                <CommandItem
                                  key={member.user_id}
                                  value={member.full_name || member.email}
                                  onSelect={() => {
                                    setSelectedAttendees((prev) => [...prev, member.user_id]);
                                    setIsAttendeesOpen(false);
                                  }}
                                >
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarFallback className="text-xs">
                                      {(member.full_name || member.email || "?")[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {member.full_name || "Unknown"}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {member.email}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can manage attendees after creating the event
                </p>
              </div>
            )}

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
