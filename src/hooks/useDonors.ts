import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export type DonorStatus = "prospect" | "active" | "lapsed" | "major";
export type PaymentMethod = "cash" | "check" | "credit_card" | "online" | "other";
export type DonationStatus = "recorded" | "receipted" | "refunded";
export type PledgeFrequency = "one_time" | "monthly" | "quarterly" | "annual";
export type PledgeStatus = "active" | "fulfilled" | "cancelled";

export interface DonorProfile {
  id: string;
  company_id: string;
  crm_client_id: string;
  donor_status: DonorStatus;
  first_donation_date: string | null;
  last_donation_date: string | null;
  lifetime_giving_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  crm_client?: {
    id: string;
    person_full_name: string | null;
    org_name: string | null;
    type: string;
  };
}

export interface Donation {
  id: string;
  company_id: string;
  donor_profile_id: string;
  campaign_id: string | null;
  amount: number;
  currency: string;
  donation_date: string;
  payment_method: PaymentMethod;
  is_anonymous: boolean;
  receipt_required: boolean;
  status: DonationStatus;
  notes: string | null;
  created_at: string;
  donor_profile?: DonorProfile;
  campaign?: DonorCampaign;
}

export interface DonorCampaign {
  id: string;
  company_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  goal_amount: number | null;
  description: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface DonorPledge {
  id: string;
  company_id: string;
  donor_profile_id: string;
  campaign_id: string | null;
  total_amount: number;
  start_date: string;
  end_date: string | null;
  frequency: PledgeFrequency;
  status: PledgeStatus;
  fulfilled_amount: number;
  notes: string | null;
  created_at: string;
}

// Donor Profiles
export function useDonorProfiles() {
  const { activeCompany } = useMembership();
  return useQuery({
    queryKey: ["donor-profiles", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("donor_profiles")
        .select(`*, crm_client:crm_clients(id, person_full_name, org_name, type)`)
        .eq("company_id", activeCompany.id)
        .order("lifetime_giving_amount", { ascending: false });
      if (error) throw error;
      return data as DonorProfile[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useCreateDonorProfile() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();
  return useMutation({
    mutationFn: async (data: { crm_client_id: string; donor_status?: DonorStatus; notes?: string }) => {
      if (!activeCompany?.id) throw new Error("No active company");
      const { data: profile, error } = await supabase
        .from("donor_profiles")
        .insert({ company_id: activeCompany.id, ...data })
        .select()
        .single();
      if (error) throw error;
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donor-profiles"] });
      toast.success("Donor profile created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Donations
export function useDonations(donorProfileId?: string) {
  const { activeCompany } = useMembership();
  return useQuery({
    queryKey: ["donations", activeCompany?.id, donorProfileId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      let query = supabase
        .from("donations")
        .select(`*, donor_profile:donor_profiles(*, crm_client:crm_clients(id, person_full_name, org_name)), campaign:donor_campaigns(id, name)`)
        .eq("company_id", activeCompany.id)
        .order("donation_date", { ascending: false });
      if (donorProfileId) query = query.eq("donor_profile_id", donorProfileId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Donation[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useCreateDonation() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();
  return useMutation({
    mutationFn: async (data: { donor_profile_id: string; amount: number; donation_date: string; payment_method?: PaymentMethod; campaign_id?: string; is_anonymous?: boolean; receipt_required?: boolean; notes?: string }) => {
      if (!activeCompany?.id) throw new Error("No active company");
      const { data: donation, error } = await supabase
        .from("donations")
        .insert({ company_id: activeCompany.id, ...data })
        .select()
        .single();
      if (error) throw error;
      return donation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["donor-profiles"] });
      toast.success("Donation recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Donor Campaigns
export function useDonorCampaigns() {
  const { activeCompany } = useMembership();
  return useQuery({
    queryKey: ["donor-campaigns", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("donor_campaigns")
        .select("*")
        .eq("company_id", activeCompany.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DonorCampaign[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useCreateDonorCampaign() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();
  return useMutation({
    mutationFn: async (data: { name: string; start_date?: string; end_date?: string; goal_amount?: number; description?: string }) => {
      if (!activeCompany?.id) throw new Error("No active company");
      const { data: campaign, error } = await supabase
        .from("donor_campaigns")
        .insert({ company_id: activeCompany.id, ...data })
        .select()
        .single();
      if (error) throw error;
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donor-campaigns"] });
      toast.success("Campaign created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Pledges
export function useDonorPledges(donorProfileId?: string) {
  const { activeCompany } = useMembership();
  return useQuery({
    queryKey: ["donor-pledges", activeCompany?.id, donorProfileId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      let query = supabase
        .from("donor_pledges")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("start_date", { ascending: false });
      if (donorProfileId) query = query.eq("donor_profile_id", donorProfileId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DonorPledge[];
    },
    enabled: !!activeCompany?.id,
  });
}
