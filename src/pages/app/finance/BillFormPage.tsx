import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Separator } from "@/components/ui/separator";
import { useBill, useBillMutations, BillFormData } from "@/hooks/useBills";
import { useVendors } from "@/hooks/useVendors";
import { VendorFormDialog } from "./VendorFormDialog";
import { cn } from "@/lib/utils";

const lineSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
  unit_price: z.coerce.number().min(0, "Price must be >= 0"),
  account_id: z.string().optional().nullable(),
});

const billFormSchema = z.object({
  vendor_id: z.string().min(1, "Vendor is required"),
  bill_number: z.string().optional(),
  bill_date: z.date({ required_error: "Bill date is required" }),
  due_date: z.date({ required_error: "Due date is required" }),
  memo: z.string().optional(),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

type BillFormValues = z.infer<typeof billFormSchema>;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function BillFormPage() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const isEditing = !!billId && billId !== "new";

  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const { data: existingBill, isLoading: billLoading } = useBill(isEditing ? billId : undefined);
  const { createBill, updateBill } = useBillMutations();

  const [showVendorDialog, setShowVendorDialog] = React.useState(false);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      vendor_id: "",
      bill_number: "",
      bill_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      memo: "",
      lines: [{ description: "", quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // Load existing bill data
  React.useEffect(() => {
    if (existingBill && isEditing) {
      form.reset({
        vendor_id: existingBill.vendor_id,
        bill_number: existingBill.bill_number || "",
        bill_date: new Date(existingBill.bill_date),
        due_date: new Date(existingBill.due_date),
        memo: existingBill.memo || "",
        lines: existingBill.bill_lines?.map((l) => ({
          id: l.id,
          description: l.description || "",
          quantity: l.quantity,
          unit_price: l.unit_price,
          account_id: l.account_id,
        })) || [{ description: "", quantity: 1, unit_price: 0 }],
      });
    }
  }, [existingBill, isEditing, form]);

  const lines = form.watch("lines");
  const total = lines.reduce((sum, line) => sum + (line.quantity || 0) * (line.unit_price || 0), 0);

  const onSubmit = async (values: BillFormValues) => {
    const data: BillFormData = {
      vendor_id: values.vendor_id,
      bill_number: values.bill_number,
      bill_date: format(values.bill_date, "yyyy-MM-dd"),
      due_date: format(values.due_date, "yyyy-MM-dd"),
      memo: values.memo,
      lines: values.lines.map((l) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        account_id: l.account_id,
      })),
    };

    if (isEditing && billId) {
      await updateBill.mutateAsync({ id: billId, data });
      navigate(`/app/finance/bills/${billId}`);
    } else {
      const bill = await createBill.mutateAsync(data);
      navigate(`/app/finance/bills/${bill.id}`);
    }
  };

  const isSubmitting = createBill.isPending || updateBill.isPending;
  const isLoading = vendorsLoading || (isEditing && billLoading);

  if (isLoading) {
    return (
      <div className="container py-6 max-w-4xl flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      <PageHeader
        title={isEditing ? "Edit Bill" : "New Bill"}
        description={isEditing ? "Update bill details" : "Create a new vendor bill"}
        backHref="/app/finance/bills"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor *</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendors.filter(v => v.is_active).map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowVendorDialog(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bill_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated if blank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bill_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Bill Date *</FormLabel>
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
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
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

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date *</FormLabel>
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
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
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
              </div>

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes about this bill..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>

                {fields.map((field, index) => {
                  const qty = form.watch(`lines.${index}.quantity`) || 0;
                  const price = form.watch(`lines.${index}.unit_price`) || 0;
                  const lineAmount = qty * price;

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-5">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2 flex items-center justify-end h-10">
                        <span className="font-medium">{formatCurrency(lineAmount)}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center h-10">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Separator />

                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/app/finance/bills")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Bill"}
            </Button>
          </div>
        </form>
      </Form>

      <VendorFormDialog open={showVendorDialog} onOpenChange={setShowVendorDialog} />
    </div>
  );
}
