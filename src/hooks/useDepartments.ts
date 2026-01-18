import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DepartmentRole = Database["public"]["Enums"]["department_role"];

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  role: DepartmentRole;
  created_at: string;
  created_by: string | null;
  // Joined fields
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  description?: string | null;
}

export function useDepartments() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["departments", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name");

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useDepartment(departmentId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["department", departmentId],
    queryFn: async () => {
      if (!departmentId) return null;

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("id", departmentId)
        .single();

      if (error) throw error;
      return data as Department;
    },
    enabled: !!departmentId && !!activeCompanyId,
  });
}

export function useDepartmentMembers(departmentId: string | undefined) {
  return useQuery({
    queryKey: ["department-members", departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from("department_members")
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .eq("department_id", departmentId)
        .order("role", { ascending: false });

      if (error) throw error;
      return data as DepartmentMember[];
    },
    enabled: !!departmentId,
  });
}

export function useUserDepartments(userId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["user-departments", userId, activeCompanyId],
    queryFn: async () => {
      if (!userId || !activeCompanyId) return [];

      const { data, error } = await supabase
        .from("department_members")
        .select(`
          *,
          department:departments(*)
        `)
        .eq("user_id", userId);

      if (error) throw error;
      
      // Filter to only company's departments
      return data.filter((dm: any) => dm.department?.company_id === activeCompanyId);
    },
    enabled: !!userId && !!activeCompanyId,
  });
}

export function useDepartmentMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();

  const createDepartment = useMutation({
    mutationFn: async (input: CreateDepartmentInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("departments")
        .insert({
          company_id: activeCompanyId,
          name: input.name,
          description: input.description || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "department.created",
        entityType: "department",
        entityId: data.id,
        metadata: { name: input.name },
      });

      return data as Department;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...input }: UpdateDepartmentInput & { id: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "department.updated",
        entityType: "department",
        entityId: id,
        metadata: input,
      });

      return data as Department;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department"] });
      toast.success("Department updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await log({
        action: "department.deleted",
        entityType: "department",
        entityId: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addMember = useMutation({
    mutationFn: async ({
      departmentId,
      userId,
      role = "member",
    }: {
      departmentId: string;
      userId: string;
      role?: DepartmentRole;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("department_members")
        .insert({
          department_id: departmentId,
          user_id: userId,
          role,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "department.member_added",
        entityType: "department",
        entityId: departmentId,
        metadata: { userId, role },
      });

      return data as DepartmentMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["department-members", variables.departmentId] });
      queryClient.invalidateQueries({ queryKey: ["user-departments"] });
      toast.success("Member added to department");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({
      memberId,
      departmentId,
      role,
    }: {
      memberId: string;
      departmentId: string;
      role: DepartmentRole;
    }) => {
      const { data, error } = await supabase
        .from("department_members")
        .update({ role })
        .eq("id", memberId)
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "department.member_role_changed",
        entityType: "department",
        entityId: departmentId,
        metadata: { memberId, role },
      });

      return data as DepartmentMember;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["department-members", variables.departmentId] });
      toast.success("Member role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({
      memberId,
      departmentId,
    }: {
      memberId: string;
      departmentId: string;
    }) => {
      const { error } = await supabase
        .from("department_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      await log({
        action: "department.member_removed",
        entityType: "department",
        entityId: departmentId,
        metadata: { memberId },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["department-members", variables.departmentId] });
      queryClient.invalidateQueries({ queryKey: ["user-departments"] });
      toast.success("Member removed from department");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createDepartment,
    updateDepartment,
    deleteDepartment,
    addMember,
    updateMemberRole,
    removeMember,
  };
}
