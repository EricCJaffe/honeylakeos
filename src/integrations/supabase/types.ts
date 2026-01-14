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
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          site_id: string
          status: Database["public"]["Enums"]["company_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["company_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["company_status"]
        }
        Relationships: [
          {
            foreignKeyName: "companies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      company_modules: {
        Row: {
          company_id: string
          configuration: Json
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          module_id: string
          status: Database["public"]["Enums"]["module_status"]
        }
        Insert: {
          company_id: string
          configuration?: Json
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_id: string
          status?: Database["public"]["Enums"]["module_status"]
        }
        Update: {
          company_id?: string
          configuration?: Json
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_id?: string
          status?: Database["public"]["Enums"]["module_status"]
        }
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          category: string | null
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          is_recurring_template: boolean
          last_generated_at: string | null
          linked_note_id: string | null
          linked_task_id: string | null
          location_text: string | null
          parent_recurring_event_id: string | null
          project_id: string | null
          recurrence_exceptions: Json
          recurrence_instance_at: string | null
          recurrence_rules: string | null
          reminder_minutes: number | null
          start_at: string
          timezone: string
          title: string
        }
        Insert: {
          all_day?: boolean
          category?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_recurring_template?: boolean
          last_generated_at?: string | null
          linked_note_id?: string | null
          linked_task_id?: string | null
          location_text?: string | null
          parent_recurring_event_id?: string | null
          project_id?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_at?: string | null
          recurrence_rules?: string | null
          reminder_minutes?: number | null
          start_at: string
          timezone?: string
          title: string
        }
        Update: {
          all_day?: boolean
          category?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          is_recurring_template?: boolean
          last_generated_at?: string | null
          linked_note_id?: string | null
          linked_task_id?: string | null
          location_text?: string | null
          parent_recurring_event_id?: string | null
          project_id?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_at?: string | null
          recurrence_rules?: string | null
          reminder_minutes?: number | null
          start_at?: string
          timezone?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_recurring_event_id_fkey"
            columns: ["parent_recurring_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          group_type: string | null
          id: string
          leader_user_id: string | null
          name: string
          settings: Json
          status: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_type?: string | null
          id?: string
          leader_user_id?: string | null
          name: string
          settings?: Json
          status?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_type?: string | null
          id?: string
          leader_user_id?: string | null
          name?: string
          settings?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          id: string
          name: string
          postal_code: string | null
          state: string | null
          status: string | null
          timezone: string | null
          type: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          id?: string
          name: string
          postal_code?: string | null
          state?: string | null
          status?: string | null
          timezone?: string | null
          type?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          postal_code?: string | null
          state?: string | null
          status?: string | null
          timezone?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          default_location_id: string | null
          expires_at: string | null
          id: string
          member_type: string
          role: Database["public"]["Enums"]["membership_role"]
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_location_id?: string | null
          expires_at?: string | null
          id?: string
          member_type?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_location_id?: string | null
          expires_at?: string | null
          id?: string
          member_type?: string
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
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
          {
            foreignKeyName: "memberships_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          slug: string
          version: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          slug: string
          version?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          version?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_company_id: string | null
          active_location_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_company_id?: string | null
          active_location_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_company_id?: string | null
          active_location_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_location_id_fkey"
            columns: ["active_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          emoji: string
          id: string
          is_template: boolean
          name: string
          owner_user_id: string
          phases: Json
          progress: number
          settings: Json
          start_date: string | null
          status: string
          template_category: string | null
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string
          id?: string
          is_template?: boolean
          name: string
          owner_user_id: string
          phases?: Json
          progress?: number
          settings?: Json
          start_date?: string | null
          status?: string
          template_category?: string | null
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string
          id?: string
          is_template?: boolean
          name?: string
          owner_user_id?: string
          phases?: Json
          progress?: number
          settings?: Json
          start_date?: string | null
          status?: string
          template_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["site_role"]
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["site_role"]
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["site_role"]
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_memberships_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          subdomain: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          subdomain?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          subdomain?: string | null
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          created_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string | null
          attachments: Json
          category: Json
          company_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json
          description: string | null
          due_date: string | null
          estimated_time: number | null
          id: string
          is_recurring_template: boolean
          is_virtual_instance: boolean
          last_generated_date: string | null
          linked_note_id: string | null
          notes: string | null
          order_index: number
          parent_recurring_task_id: string | null
          phase: string | null
          priority: string
          project_id: string | null
          recurrence_exceptions: Json
          recurrence_instance_date: string | null
          recurrence_rules: string | null
          status: string
          subtasks: Json
          tags: Json
          title: string
        }
        Insert: {
          assigned_by?: string | null
          attachments?: Json
          category?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_recurring_template?: boolean
          is_virtual_instance?: boolean
          last_generated_date?: string | null
          linked_note_id?: string | null
          notes?: string | null
          order_index?: number
          parent_recurring_task_id?: string | null
          phase?: string | null
          priority?: string
          project_id?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_date?: string | null
          recurrence_rules?: string | null
          status?: string
          subtasks?: Json
          tags?: Json
          title: string
        }
        Update: {
          assigned_by?: string | null
          attachments?: Json
          category?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_recurring_template?: boolean
          is_virtual_instance?: boolean
          last_generated_date?: string | null
          linked_note_id?: string | null
          notes?: string | null
          order_index?: number
          parent_recurring_task_id?: string | null
          phase?: string | null
          priority?: string
          project_id?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_date?: string | null
          recurrence_rules?: string | null
          status?: string
          subtasks?: Json
          tags?: Json
          title?: string
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
            foreignKeyName: "tasks_parent_recurring_task_id_fkey"
            columns: ["parent_recurring_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_site_admin: { Args: { p_site_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      company_status:
        | "active"
        | "inactive"
        | "archived"
        | "pending"
        | "suspended"
      membership_role:
        | "company_admin"
        | "location_admin"
        | "module_admin"
        | "user"
        | "external"
      module_status: "active" | "trial" | "expired" | "suspended"
      site_role: "super_admin" | "site_admin"
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
      company_status: [
        "active",
        "inactive",
        "archived",
        "pending",
        "suspended",
      ],
      membership_role: [
        "company_admin",
        "location_admin",
        "module_admin",
        "user",
        "external",
      ],
      module_status: ["active", "trial", "expired", "suspended"],
      site_role: ["super_admin", "site_admin"],
    },
  },
} as const
