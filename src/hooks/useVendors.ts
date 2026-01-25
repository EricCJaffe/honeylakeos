import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  payment_terms: number | null;
  default_expense_account_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorFormData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tax_id?: string | null;
  payment_terms?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

export function useVendors() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["vendors", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .eq("is_sample", false)
        .order("name");

      if (error) throw error;
      return data as Vendor[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useVendor(vendorId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["vendor", vendorId, activeCompanyId],
    queryFn: async () => {
      if (!vendorId || !activeCompanyId) return null;

      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .eq("company_id", activeCompanyId)
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    enabled: !!vendorId && !!activeCompanyId,
  });
}

export function useVendorMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const createVendor = useMutation({
    mutationFn: async (data: VendorFormData) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: vendor, error } = await supabase
        .from("vendors")
        .insert({
          company_id: activeCompanyId,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          address_line1: data.address_line1 || null,
          address_line2: data.address_line2 || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
          country: data.country || null,
          tax_id: data.tax_id || null,
          payment_terms: data.payment_terms ?? 30,
          notes: data.notes || null,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return vendor as Vendor;
    },
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      log("vendor.created", "vendor", vendor.id, { name: vendor.name });
      toast.success("Vendor created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });

  const updateVendor = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VendorFormData> }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: vendor, error } = await supabase
        .from("vendors")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          address_line1: data.address_line1,
          address_line2: data.address_line2,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
          tax_id: data.tax_id,
          payment_terms: data.payment_terms,
          notes: data.notes,
          is_active: data.is_active,
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return vendor as Vendor;
    },
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      log("vendor.updated", "vendor", vendor.id, { name: vendor.name });
      toast.success("Vendor updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("vendors")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      log("vendor.deleted", "vendor", id, {});
      toast.success("Vendor archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive vendor: ${error.message}`);
    },
  });

  return { createVendor, updateVendor, deleteVendor };
}
