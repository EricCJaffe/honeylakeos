import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Palette, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useActiveCompany } from "@/hooks/useActiveCompany";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  description: z.string().optional(),
  logo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  primary_color: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompanySettingsPanel() {
  const queryClient = useQueryClient();
  const { refreshMemberships } = useMembership();
  const { activeCompanyId, loading: companyLoading } = useActiveCompany();

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      description: "",
      logo_url: "",
      primary_color: "#2563eb",
    },
  });

  useEffect(() => {
    async function fetchCompany() {
      if (!activeCompanyId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", activeCompanyId)
          .single();

        if (error) {
          toast.error("Failed to load company settings");
        } else if (data) {
          form.reset({
            name: data.name || "",
            description: data.description || "",
            logo_url: data.logo_url || "",
            primary_color: data.primary_color || "#2563eb",
          });
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!companyLoading) {
      fetchCompany();
    }
  }, [activeCompanyId, companyLoading, form]);

  const onSubmit = async (values: CompanyFormValues) => {
    if (!activeCompanyId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: values.name,
          description: values.description || null,
          logo_url: values.logo_url || null,
          primary_color: values.primary_color || null,
        })
        .eq("id", activeCompanyId);

      if (error) {
        if (error.code === "42501" || error.message.includes("policy")) {
          toast.error("You don't have permission to update company settings.");
        } else {
          toast.error(`Failed to save: ${error.message}`);
        }
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.invalidateQueries({ queryKey: ["active-company"] });
      await refreshMemberships();

      toast.success("Company settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (companyLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Company Profile
            </CardTitle>
            <CardDescription>Basic information about your organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc." {...field} />
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
                    <Input placeholder="A brief description of your company" {...field} />
                  </FormControl>
                  <FormDescription>Optional description shown to team members.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/logo.png" {...field} />
                  </FormControl>
                  <FormDescription>URL to your company logo image.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>Customize the look and feel for your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Input type="color" className="w-16 h-10 p-1 cursor-pointer" {...field} />
                      <Input
                        type="text"
                        placeholder="#2563eb"
                        value={field.value}
                        onChange={field.onChange}
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Brand color used throughout the app.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("logo_url") && (
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Logo Preview</p>
                <div className="w-20 h-20 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden">
                  <img
                    src={form.watch("logo_url")}
                    alt="Company logo preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
