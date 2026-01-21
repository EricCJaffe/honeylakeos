import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useFinanceAccountMutations, FinanceAccount, AccountType, AccountFormData } from "@/hooks/useChartOfAccounts";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const accountSchema = z.object({
  account_number: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  account_type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  account_subtype: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: FinanceAccount;
}

export function AccountFormDialog({ open, onOpenChange, account }: AccountFormDialogProps) {
  const { createAccount, updateAccount } = useFinanceAccountMutations();
  const isEditing = !!account;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_number: "",
      name: "",
      account_type: "expense",
      account_subtype: "",
      description: "",
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (account) {
      form.reset({
        account_number: account.account_number || "",
        name: account.name,
        account_type: account.account_type as AccountType,
        account_subtype: account.account_subtype || "",
        description: account.description || "",
        is_active: account.is_active,
      });
    } else {
      form.reset({
        account_number: "",
        name: "",
        account_type: "expense",
        account_subtype: "",
        description: "",
        is_active: true,
      });
    }
  }, [account, form]);

  const onSubmit = async (values: AccountFormValues) => {
    const data: AccountFormData = {
      account_number: values.account_number || null,
      name: values.name,
      account_type: values.account_type,
      account_subtype: values.account_subtype || null,
      description: values.description || null,
      is_active: values.is_active,
    };

    if (isEditing) {
      await updateAccount.mutateAsync({ id: account.id, data });
    } else {
      await createAccount.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const isSubmitting = createAccount.isPending || updateAccount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Account" : "Add Account"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update account details" : "Add a new account to your chart of accounts"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account #</FormLabel>
                    <FormControl>
                      <Input placeholder="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Account name" {...field} />
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
                    <Textarea placeholder="What is this account used for?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive accounts won't appear in selections
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            </DialogBody>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
