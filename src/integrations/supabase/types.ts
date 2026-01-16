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
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      documents: {
        Row: {
          access_level: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          tags: Json
          updated_at: string
        }
        Insert: {
          access_level?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          tags?: Json
          updated_at?: string
        }
        Update: {
          access_level?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          tags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          created_by: string
          email: string
          employee_id: string
          expires_at: string
          id: string
          role: string
          sent_at: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          email: string
          employee_id: string
          expires_at?: string
          id?: string
          role?: string
          sent_at?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          email?: string
          employee_id?: string
          expires_at?: string
          id?: string
          role?: string
          sent_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_acl: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          granted_by: string | null
          grantee_id: string
          grantee_type: string
          id: string
          permission: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          granted_by?: string | null
          grantee_id: string
          grantee_type: string
          id?: string
          permission: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          granted_by?: string | null
          grantee_id?: string
          grantee_type?: string
          id?: string
          permission?: string
        }
        Relationships: []
      }
      entity_links: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          from_id: string
          from_type: string
          id: string
          link_type: string
          to_id: string
          to_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          from_id: string
          from_type: string
          id?: string
          link_type?: string
          to_id: string
          to_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          from_id?: string
          from_type?: string
          id?: string
          link_type?: string
          to_id?: string
          to_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      event_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          event_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          event_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_recurrence_exceptions: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          event_id: string
          exception_date: string
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          event_id: string
          exception_date: string
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          exception_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_recurrence_exceptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_recurrence_exceptions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_recurrence_overrides: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          occurrence_start_at: string
          override_event_id: string
          series_event_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          occurrence_start_at: string
          override_event_id: string
          series_event_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          occurrence_start_at?: string
          override_event_id?: string
          series_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_recurrence_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_recurrence_overrides_override_event_id_fkey"
            columns: ["override_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_recurrence_overrides_series_event_id_fkey"
            columns: ["series_event_id"]
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
          is_recurrence_exception: boolean | null
          is_recurring_template: boolean
          last_generated_at: string | null
          linked_note_id: string | null
          linked_task_id: string | null
          location_text: string | null
          parent_recurring_event_id: string | null
          project_id: string | null
          recurrence_count: number | null
          recurrence_end_at: string | null
          recurrence_exceptions: Json
          recurrence_instance_at: string | null
          recurrence_rules: string | null
          recurrence_start_at: string | null
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
          is_recurrence_exception?: boolean | null
          is_recurring_template?: boolean
          last_generated_at?: string | null
          linked_note_id?: string | null
          linked_task_id?: string | null
          location_text?: string | null
          parent_recurring_event_id?: string | null
          project_id?: string | null
          recurrence_count?: number | null
          recurrence_end_at?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_at?: string | null
          recurrence_rules?: string | null
          recurrence_start_at?: string | null
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
          is_recurrence_exception?: boolean | null
          is_recurring_template?: boolean
          last_generated_at?: string | null
          linked_note_id?: string | null
          linked_task_id?: string | null
          location_text?: string | null
          parent_recurring_event_id?: string | null
          project_id?: string | null
          recurrence_count?: number | null
          recurrence_end_at?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_at?: string | null
          recurrence_rules?: string | null
          recurrence_start_at?: string | null
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
            foreignKeyName: "events_linked_note_fkey"
            columns: ["linked_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
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
      folders: {
        Row: {
          access_level: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_folder_id: string | null
        }
        Insert: {
          access_level?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
        }
        Update: {
          access_level?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
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
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          role?: string
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
      location_members: {
        Row: {
          created_at: string
          location_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          location_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          location_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_members_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          employee_id: string | null
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
          employee_id?: string | null
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
          employee_id?: string | null
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
          {
            foreignKeyName: "memberships_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      notes: {
        Row: {
          access_level: string
          color: string | null
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          folder_id: string | null
          id: string
          is_pinned: boolean
          status: string
          tags: Json
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          color?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean
          status?: string
          tags?: Json
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          color?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean
          status?: string
          tags?: Json
          title?: string
          updated_at?: string
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
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_company_id: string | null
          active_location_id: string | null
          address: string | null
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          last_name: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_company_id?: string | null
          active_location_id?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_company_id?: string | null
          active_location_id?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
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
      project_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      project_phase_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          phases: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phases?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phases?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_phase_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_phases: {
        Row: {
          color: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          color?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_tasks: {
        Row: {
          default_phase_name: string | null
          description: string | null
          id: string
          is_milestone: boolean
          priority: string | null
          relative_due_days: number | null
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          default_phase_name?: string | null
          description?: string | null
          id?: string
          is_milestone?: boolean
          priority?: string | null
          relative_due_days?: number | null
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          default_phase_name?: string | null
          description?: string | null
          id?: string
          is_milestone?: boolean
          priority?: string | null
          relative_due_days?: number | null
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          emoji: string
          id: string
          name: string
          status: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          emoji?: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          emoji?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      task_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_occurrence_completions: {
        Row: {
          company_id: string
          completed_at: string
          completed_by: string
          id: string
          occurrence_start_at: string
          series_task_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string
          completed_by?: string
          id?: string
          occurrence_start_at: string
          series_task_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string
          completed_by?: string
          id?: string
          occurrence_start_at?: string
          series_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_occurrence_completions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_occurrence_completions_series_task_id_fkey"
            columns: ["series_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_recurrence_exceptions: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          exception_date: string
          id: string
          task_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          exception_date: string
          id?: string
          task_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          exception_date?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_recurrence_exceptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_recurrence_exceptions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_recurrence_overrides: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          occurrence_start_at: string
          override_task_id: string
          series_task_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          occurrence_start_at: string
          override_task_id: string
          series_task_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          occurrence_start_at?: string
          override_task_id?: string
          series_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_recurrence_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_recurrence_overrides_override_task_id_fkey"
            columns: ["override_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_recurrence_overrides_series_task_id_fkey"
            columns: ["series_task_id"]
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
          is_recurrence_exception: boolean | null
          is_recurring_template: boolean
          is_virtual_instance: boolean
          last_generated_date: string | null
          linked_note_id: string | null
          notes: string | null
          order_index: number
          parent_recurring_task_id: string | null
          phase: string | null
          phase_id: string | null
          priority: string
          project_id: string | null
          recurrence_count: number | null
          recurrence_end_at: string | null
          recurrence_exceptions: Json
          recurrence_instance_date: string | null
          recurrence_rules: string | null
          recurrence_start_at: string | null
          recurrence_timezone: string | null
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
          is_recurrence_exception?: boolean | null
          is_recurring_template?: boolean
          is_virtual_instance?: boolean
          last_generated_date?: string | null
          linked_note_id?: string | null
          notes?: string | null
          order_index?: number
          parent_recurring_task_id?: string | null
          phase?: string | null
          phase_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence_count?: number | null
          recurrence_end_at?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_date?: string | null
          recurrence_rules?: string | null
          recurrence_start_at?: string | null
          recurrence_timezone?: string | null
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
          is_recurrence_exception?: boolean | null
          is_recurring_template?: boolean
          is_virtual_instance?: boolean
          last_generated_date?: string | null
          linked_note_id?: string | null
          notes?: string | null
          order_index?: number
          parent_recurring_task_id?: string | null
          phase?: string | null
          phase_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence_count?: number | null
          recurrence_end_at?: string | null
          recurrence_exceptions?: Json
          recurrence_instance_date?: string | null
          recurrence_rules?: string | null
          recurrence_start_at?: string | null
          recurrence_timezone?: string | null
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
            foreignKeyName: "tasks_linked_note_fkey"
            columns: ["linked_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
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
            foreignKeyName: "tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
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
      templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          payload: Json
          template_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          payload?: Json
          template_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payload?: Json
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_employee_invite: { Args: { p_token: string }; Returns: Json }
      bootstrap_first_site: {
        Args: { p_company_name?: string; p_site_name?: string }
        Returns: Json
      }
      can_access_document_file: {
        Args: { object_name: string }
        Returns: boolean
      }
      can_delete_document_file: {
        Args: { object_name: string }
        Returns: boolean
      }
      can_delete_group_member: {
        Args: { p_group_id: string; p_target_user_id: string }
        Returns: boolean
      }
      can_delete_location_member: {
        Args: { p_location_id: string; p_target_user_id: string }
        Returns: boolean
      }
      can_delete_membership: {
        Args: { p_membership_id: string }
        Returns: boolean
      }
      can_update_group_member_role: {
        Args: {
          p_group_id: string
          p_new_role: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      can_update_location_member_role: {
        Args: {
          p_location_id: string
          p_new_role: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      complete_task_occurrence: {
        Args: { p_occurrence_start_at: string; p_series_task_id: string }
        Returns: Json
      }
      create_employee_invite: {
        Args: { p_employee_id: string; p_role?: string }
        Returns: {
          email: string
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      create_entity_link: {
        Args: {
          p_company_id: string
          p_from_id: string
          p_from_type: string
          p_link_type?: string
          p_to_id: string
          p_to_type: string
        }
        Returns: string
      }
      create_event_occurrence_override: {
        Args: {
          p_all_day?: boolean
          p_color?: string
          p_description?: string
          p_end_at?: string
          p_location_text?: string
          p_occurrence_start_at: string
          p_series_event_id: string
          p_start_at?: string
          p_title: string
        }
        Returns: string
      }
      create_project_from_template: {
        Args: {
          p_company_id: string
          p_name: string
          p_start_date?: string
          p_template_id: string
        }
        Returns: Json
      }
      create_task_occurrence_override: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_occurrence_start_at: string
          p_priority?: string
          p_series_task_id: string
          p_status?: string
          p_title: string
        }
        Returns: string
      }
      delete_entity_link: { Args: { p_link_id: string }; Returns: boolean }
      entity_acl_company_id: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      entity_acl_is_owner: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: boolean
      }
      expand_event_series: {
        Args: { p_event_id: string; p_range_end: string; p_range_start: string }
        Returns: {
          is_exception: boolean
          is_override: boolean
          occurrence_date: string
          override_event_id: string
        }[]
      }
      expand_task_series:
        | {
            Args: {
              p_range_end: string
              p_range_start: string
              p_task_id: string
            }
            Returns: {
              completed_at: string
              completed_by: string
              is_completed: boolean
              is_exception: boolean
              is_override: boolean
              occurrence_date: string
              occurrence_start_at: string
              override_task_id: string
            }[]
          }
        | {
            Args: {
              p_range_end: string
              p_range_start: string
              p_task_id: string
            }
            Returns: {
              is_exception: boolean
              is_override: boolean
              occurrence_date: string
              override_task_id: string
            }[]
          }
      get_acl_grantee_profile: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_grantee_id: string
        }
        Returns: {
          email: string
          full_name: string
        }[]
      }
      get_company_member_directory: {
        Args: { p_company_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_default_site_id: { Args: never; Returns: string }
      get_employee_invite_public: {
        Args: { p_token: string }
        Returns: {
          company_name: string
          employee_name: string
          expires_at: string
          status: string
        }[]
      }
      get_entity_company_id: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      get_table_columns: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
          ordinal_position: number
          table_name: string
        }[]
      }
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_group_manager: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_link_allowed: {
        Args: { p_company_id: string; p_from_type: string; p_to_type: string }
        Returns: boolean
      }
      is_location_manager: {
        Args: { p_location_id: string; p_user_id: string }
        Returns: boolean
      }
      is_module_enabled: {
        Args: { p_company_id: string; p_module_key: string }
        Returns: boolean
      }
      is_site_admin: { Args: { p_site_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_actor_user_id?: string
          p_company_id: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: string
      }
      promote_self_to_super_admin: { Args: never; Returns: Json }
      require_module_enabled: {
        Args: { p_company_id: string; p_module_key: string }
        Returns: undefined
      }
      skip_event_occurrence: {
        Args: { p_event_id: string; p_occurrence_date: string }
        Returns: string
      }
      skip_task_occurrence: {
        Args: { p_occurrence_date: string; p_task_id: string }
        Returns: string
      }
      split_task_series_from_occurrence: {
        Args: {
          p_description?: string
          p_due_date?: string
          p_new_rrule: string
          p_occurrence_start_at: string
          p_priority?: string
          p_series_task_id: string
          p_status?: string
          p_title?: string
        }
        Returns: Json
      }
      storage_path_company_id: {
        Args: { object_name: string }
        Returns: string
      }
      storage_path_user_id: { Args: { object_name: string }; Returns: string }
      uncomplete_task_occurrence: {
        Args: { p_occurrence_start_at: string; p_series_task_id: string }
        Returns: Json
      }
      update_event_series_from_occurrence: {
        Args: {
          p_all_day?: boolean
          p_color?: string
          p_description?: string
          p_end_at?: string
          p_location_text?: string
          p_new_rrule: string
          p_occurrence_start_at: string
          p_series_event_id: string
          p_start_at?: string
          p_title?: string
        }
        Returns: Json
      }
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
