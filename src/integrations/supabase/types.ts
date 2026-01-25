export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          company_type: string | null
          created_at: string
          created_by: string | null
          created_by_coaching_org_id: string | null
          description: string | null
          finance_mode: string | null
          id: string
          logo_url: string | null
          name: string
          onboarding_source: string | null
          primary_color: string | null
          site_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_type?: string | null
          created_at?: string
          created_by?: string | null
          created_by_coaching_org_id?: string | null
          description?: string | null
          finance_mode?: string | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_source?: string | null
          primary_color?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_type?: string | null
          created_at?: string
          created_by?: string | null
          created_by_coaching_org_id?: string | null
          description?: string | null
          finance_mode?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_source?: string | null
          primary_color?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_clients: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_clients_import: {
        Row: {
          archived_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          entity_kind: string | null
          external_contact_id: string | null
          id: string | null
          is_active: string | null
          is_sample: string | null
          lifecycle_status: string | null
          notes: string | null
          org_email: string | null
          org_name: string | null
          org_phone: string | null
          org_website: string | null
          person_email: string | null
          person_full_name: string | null
          person_phone: string | null
          primary_contact_id: string | null
          sample_batch_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_kind?: string | null
          external_contact_id?: string | null
          id?: string | null
          is_active?: string | null
          is_sample?: string | null
          lifecycle_status?: string | null
          notes?: string | null
          org_email?: string | null
          org_name?: string | null
          org_phone?: string | null
          org_website?: string | null
          person_email?: string | null
          person_full_name?: string | null
          person_phone?: string | null
          primary_contact_id?: string | null
          sample_batch_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_kind?: string | null
          external_contact_id?: string | null
          id?: string | null
          is_active?: string | null
          is_sample?: string | null
          lifecycle_status?: string | null
          notes?: string | null
          org_email?: string | null
          org_name?: string | null
          org_phone?: string | null
          org_website?: string | null
          person_email?: string | null
          person_full_name?: string | null
          person_phone?: string | null
          primary_contact_id?: string | null
          sample_batch_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          access_level: string | null
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          owner_user_id: string | null
          parent_folder_id: string | null
          parent_id: string | null
          scope: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          parent_folder_id?: string | null
          parent_id?: string | null
          scope?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          parent_folder_id?: string | null
          parent_id?: string | null
          scope?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders_import: {
        Row: {
          access_level: string | null
          archived_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          name: string | null
          owner_user_id: string | null
          parent_folder_id: string | null
          scope: string | null
          sort_order: string | null
        }
        Insert: {
          access_level?: string | null
          archived_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
          owner_user_id?: string | null
          parent_folder_id?: string | null
          scope?: string | null
          sort_order?: string | null
        }
        Update: {
          access_level?: string | null
          archived_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
          owner_user_id?: string | null
          parent_folder_id?: string | null
          scope?: string | null
          sort_order?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          can_access_finance: boolean | null
          company_id: string
          created_at: string
          default_location_id: string | null
          employee_id: string | null
          expires_at: string | null
          id: string
          member_type: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_finance?: boolean | null
          company_id: string
          created_at?: string
          default_location_id?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string
          member_type?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_finance?: boolean | null
          company_id?: string
          created_at?: string
          default_location_id?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string
          member_type?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships_import: {
        Row: {
          can_access_finance: string | null
          company_id: string | null
          created_at: string | null
          default_location_id: string | null
          employee_id: string | null
          expires_at: string | null
          id: string | null
          member_type: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          can_access_finance?: string | null
          company_id?: string | null
          created_at?: string | null
          default_location_id?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string | null
          member_type?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          can_access_finance?: string | null
          company_id?: string | null
          created_at?: string | null
          default_location_id?: string | null
          employee_id?: string | null
          expires_at?: string | null
          id?: string | null
          member_type?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          project_id: string | null
          task_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          project_id?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_import: {
        Row: {
          access_level: string | null
          coaching_engagement_id: string | null
          color: string | null
          company_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          folder_id: string | null
          id: string | null
          is_pinned: string | null
          is_sample: string | null
          owner_user_id: string | null
          pinned_at: string | null
          project_id: string | null
          sample_batch_id: string | null
          status: string | null
          tags: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          coaching_engagement_id?: string | null
          color?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          folder_id?: string | null
          id?: string | null
          is_pinned?: string | null
          is_sample?: string | null
          owner_user_id?: string | null
          pinned_at?: string | null
          project_id?: string | null
          sample_batch_id?: string | null
          status?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          coaching_engagement_id?: string | null
          color?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          folder_id?: string | null
          id?: string | null
          is_pinned?: string | null
          is_sample?: string | null
          owner_user_id?: string | null
          pinned_at?: string | null
          project_id?: string | null
          sample_batch_id?: string | null
          status?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          end_date: string | null
          folder_id: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          folder_id?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_import: {
        Row: {
          coaching_engagement_id: string | null
          color: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          emoji: string | null
          id: string | null
          is_sample: string | null
          is_template: string | null
          name: string | null
          owner_user_id: string | null
          phases: string | null
          progress: string | null
          sample_batch_id: string | null
          settings: string | null
          start_date: string | null
          status: string | null
          template_category: string | null
        }
        Insert: {
          coaching_engagement_id?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string | null
          id?: string | null
          is_sample?: string | null
          is_template?: string | null
          name?: string | null
          owner_user_id?: string | null
          phases?: string | null
          progress?: string | null
          sample_batch_id?: string | null
          settings?: string | null
          start_date?: string | null
          status?: string | null
          template_category?: string | null
        }
        Update: {
          coaching_engagement_id?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string | null
          id?: string | null
          is_sample?: string | null
          is_template?: string | null
          name?: string | null
          owner_user_id?: string | null
          phases?: string | null
          progress?: string | null
          sample_batch_id?: string | null
          settings?: string | null
          start_date?: string | null
          status?: string | null
          template_category?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks_import: {
        Row: {
          assigned_by: string | null
          attachments: string | null
          category: string | null
          coaching_engagement_id: string | null
          coaching_workflow_template_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          estimated_time: string | null
          id: string | null
          is_pinned: string | null
          is_recurrence_exception: string | null
          is_recurring_template: string | null
          is_sample: string | null
          is_virtual_instance: string | null
          last_generated_date: string | null
          linked_note_id: string | null
          list_id: string | null
          notes: string | null
          order_index: string | null
          owner_user_id: string | null
          parent_recurring_task_id: string | null
          phase: string | null
          phase_id: string | null
          pinned_at: string | null
          priority: string | null
          project_id: string | null
          recurrence_count: string | null
          recurrence_end_at: string | null
          recurrence_exceptions: string | null
          recurrence_instance_date: string | null
          recurrence_rules: string | null
          recurrence_start_at: string | null
          recurrence_timezone: string | null
          sample_batch_id: string | null
          status: string | null
          subtasks: string | null
          tags: string | null
          title: string | null
        }
        Insert: {
          assigned_by?: string | null
          attachments?: string | null
          category?: string | null
          coaching_engagement_id?: string | null
          coaching_workflow_template_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: string | null
          id?: string | null
          is_pinned?: string | null
          is_recurrence_exception?: string | null
          is_recurring_template?: string | null
          is_sample?: string | null
          is_virtual_instance?: string | null
          last_generated_date?: string | null
          linked_note_id?: string | null
          list_id?: string | null
          notes?: string | null
          order_index?: string | null
          owner_user_id?: string | null
          parent_recurring_task_id?: string | null
          phase?: string | null
          phase_id?: string | null
          pinned_at?: string | null
          priority?: string | null
          project_id?: string | null
          recurrence_count?: string | null
          recurrence_end_at?: string | null
          recurrence_exceptions?: string | null
          recurrence_instance_date?: string | null
          recurrence_rules?: string | null
          recurrence_start_at?: string | null
          recurrence_timezone?: string | null
          sample_batch_id?: string | null
          status?: string | null
          subtasks?: string | null
          tags?: string | null
          title?: string | null
        }
        Update: {
          assigned_by?: string | null
          attachments?: string | null
          category?: string | null
          coaching_engagement_id?: string | null
          coaching_workflow_template_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: string | null
          id?: string | null
          is_pinned?: string | null
          is_recurrence_exception?: string | null
          is_recurring_template?: string | null
          is_sample?: string | null
          is_virtual_instance?: string | null
          last_generated_date?: string | null
          linked_note_id?: string | null
          list_id?: string | null
          notes?: string | null
          order_index?: string | null
          owner_user_id?: string | null
          parent_recurring_task_id?: string | null
          phase?: string | null
          phase_id?: string | null
          pinned_at?: string | null
          priority?: string | null
          project_id?: string | null
          recurrence_count?: string | null
          recurrence_end_at?: string | null
          recurrence_exceptions?: string | null
          recurrence_instance_date?: string | null
          recurrence_rules?: string | null
          recurrence_start_at?: string | null
          recurrence_timezone?: string | null
          sample_batch_id?: string | null
          status?: string | null
          subtasks?: string | null
          tags?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer" | "Company_Admin"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "viewer", "Company_Admin"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "completed", "cancelled"],
    },
  },
} as const
