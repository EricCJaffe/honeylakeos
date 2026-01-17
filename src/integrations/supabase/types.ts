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
      coach_assignments: {
        Row: {
          archived_at: string | null
          assignment_role: Database["public"]["Enums"]["coach_assignment_role"]
          coach_user_id: string
          created_at: string
          engagement_id: string
          id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assignment_role?: Database["public"]["Enums"]["coach_assignment_role"]
          coach_user_id: string
          created_at?: string
          engagement_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assignment_role?: Database["public"]["Enums"]["coach_assignment_role"]
          coach_user_id?: string
          created_at?: string
          engagement_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_assignments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          archived_at: string | null
          bio: string | null
          company_id: string
          created_at: string
          created_by: string | null
          external_contact_id: string
          id: string
          profile_type: string
          specialties: Json | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          bio?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          external_contact_id: string
          id?: string
          profile_type?: string
          specialties?: Json | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          bio?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          external_contact_id?: string
          id?: string
          profile_type?: string
          specialties?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_profiles_external_contact_id_fkey"
            columns: ["external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_recommendations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          converted_entity_id: string | null
          converted_entity_type: string | null
          created_at: string
          description: string | null
          engagement_id: string
          id: string
          payload: Json | null
          recommendation_type: Database["public"]["Enums"]["recommendation_type"]
          recommended_by: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["recommendation_status"]
          target_company_id: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          converted_entity_id?: string | null
          converted_entity_type?: string | null
          created_at?: string
          description?: string | null
          engagement_id: string
          id?: string
          payload?: Json | null
          recommendation_type: Database["public"]["Enums"]["recommendation_type"]
          recommended_by: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          target_company_id: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          converted_entity_id?: string | null
          converted_entity_type?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string
          id?: string
          payload?: Json | null
          recommendation_type?: Database["public"]["Enums"]["recommendation_type"]
          recommended_by?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          target_company_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_recommendations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_recommendations_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_coach_profiles: {
        Row: {
          archived_at: string | null
          bio: string | null
          coach_role: Database["public"]["Enums"]["coaching_role"]
          company_id: string
          created_at: string
          id: string
          specialties: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          bio?: string | null
          coach_role?: Database["public"]["Enums"]["coaching_role"]
          company_id: string
          created_at?: string
          id?: string
          specialties?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          bio?: string | null
          coach_role?: Database["public"]["Enums"]["coaching_role"]
          company_id?: string
          created_at?: string
          id?: string
          specialties?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_coach_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_engagements: {
        Row: {
          archived_at: string | null
          client_company_id: string
          coaching_org_company_id: string
          created_at: string
          created_by: string | null
          end_date: string | null
          engagement_status: Database["public"]["Enums"]["engagement_status"]
          id: string
          notes: string | null
          primary_framework_id: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_company_id: string
          coaching_org_company_id: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          id?: string
          notes?: string | null
          primary_framework_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_company_id?: string
          coaching_org_company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          id?: string
          notes?: string | null
          primary_framework_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_engagements_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_engagements_coaching_org_company_id_fkey"
            columns: ["coaching_org_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_engagements_primary_framework_id_fkey"
            columns: ["primary_framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_settings: {
        Row: {
          branding_name: string | null
          coach_manager_enabled: boolean
          company_id: string
          created_at: string
          default_client_access_level: string
          updated_at: string
        }
        Insert: {
          branding_name?: string | null
          coach_manager_enabled?: boolean
          company_id: string
          created_at?: string
          default_client_access_level?: string
          updated_at?: string
        }
        Update: {
          branding_name?: string | null
          coach_manager_enabled?: boolean
          company_id?: string
          created_at?: string
          default_client_access_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
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
      company_capability_settings: {
        Row: {
          coaches_member_manage_enabled: boolean
          company_id: string
          contacts_member_manage_enabled: boolean
          crm_member_manage_enabled: boolean
          forms_member_manage_enabled: boolean
          forms_member_publish_enabled: boolean
          lms_member_manage_enabled: boolean
          lms_member_publish_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coaches_member_manage_enabled?: boolean
          company_id: string
          contacts_member_manage_enabled?: boolean
          crm_member_manage_enabled?: boolean
          forms_member_manage_enabled?: boolean
          forms_member_publish_enabled?: boolean
          lms_member_manage_enabled?: boolean
          lms_member_publish_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coaches_member_manage_enabled?: boolean
          company_id?: string
          contacts_member_manage_enabled?: boolean
          crm_member_manage_enabled?: boolean
          forms_member_manage_enabled?: boolean
          forms_member_publish_enabled?: boolean
          lms_member_manage_enabled?: boolean
          lms_member_publish_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_capability_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_entitlement_overrides: {
        Row: {
          company_id: string
          created_at: string
          entitlement_key: string
          entitlement_value: Json
          expires_at: string | null
          granted_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entitlement_key: string
          entitlement_value: Json
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entitlement_key?: string
          entitlement_value?: Json
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_entitlement_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_frameworks: {
        Row: {
          active_framework_id: string
          adopted_at: string
          adopted_by: string | null
          company_id: string
        }
        Insert: {
          active_framework_id: string
          adopted_at?: string
          adopted_by?: string | null
          company_id: string
        }
        Update: {
          active_framework_id?: string
          adopted_at?: string
          adopted_by?: string | null
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_frameworks_active_framework_id_fkey"
            columns: ["active_framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_frameworks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
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
      company_onboarding_state: {
        Row: {
          coach_engagement_id: string | null
          company_id: string
          completed_at: string | null
          completed_steps: string[]
          created_at: string
          current_step: string
          framework_id: string | null
          updated_at: string
        }
        Insert: {
          coach_engagement_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_step?: string
          framework_id?: string | null
          updated_at?: string
        }
        Update: {
          coach_engagement_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_steps?: string[]
          created_at?: string
          current_step?: string
          framework_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_onboarding_state_coach_engagement_id_fkey"
            columns: ["coach_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_onboarding_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_onboarding_state_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      company_plans: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          grace_period_days: number | null
          id: string
          metadata: Json | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          plan_type: Database["public"]["Enums"]["plan_type"]
          started_at: string
          status: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          grace_period_days?: number | null
          id?: string
          metadata?: Json | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          plan_type: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          grace_period_days?: number | null
          id?: string
          metadata?: Json | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          plan_type?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_terminology: {
        Row: {
          company_id: string
          id: string
          plural_label: string
          singular_label: string
          term_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          id?: string
          plural_label: string
          singular_label: string
          term_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          plural_label?: string
          singular_label?: string
          term_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_terminology_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_clients: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          external_contact_id: string | null
          id: string
          is_active: boolean
          lifecycle_status: string
          notes: string | null
          org_email: string | null
          org_name: string | null
          org_phone: string | null
          org_website: string | null
          person_email: string | null
          person_full_name: string | null
          person_phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          external_contact_id?: string | null
          id?: string
          is_active?: boolean
          lifecycle_status?: string
          notes?: string | null
          org_email?: string | null
          org_name?: string | null
          org_phone?: string | null
          org_website?: string | null
          person_email?: string | null
          person_full_name?: string | null
          person_phone?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          external_contact_id?: string | null
          id?: string
          is_active?: boolean
          lifecycle_status?: string
          notes?: string | null
          org_email?: string | null
          org_name?: string | null
          org_phone?: string | null
          org_website?: string | null
          person_email?: string | null
          person_full_name?: string | null
          person_phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_clients_external_contact_id_fkey"
            columns: ["external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
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
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          donation_date: string
          donor_profile_id: string
          id: string
          is_anonymous: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_required: boolean
          status: Database["public"]["Enums"]["donation_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          donation_date: string
          donor_profile_id: string
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_required?: boolean
          status?: Database["public"]["Enums"]["donation_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          donation_date?: string
          donor_profile_id?: string
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_required?: boolean
          status?: Database["public"]["Enums"]["donation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donor_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_profile_id_fkey"
            columns: ["donor_profile_id"]
            isOneToOne: false
            referencedRelation: "donor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_campaigns: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_pledges: {
        Row: {
          campaign_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          donor_profile_id: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["pledge_frequency"]
          fulfilled_amount: number
          id: string
          notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["pledge_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          donor_profile_id: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["pledge_frequency"]
          fulfilled_amount?: number
          id?: string
          notes?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["pledge_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          donor_profile_id?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["pledge_frequency"]
          fulfilled_amount?: number
          id?: string
          notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["pledge_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_pledges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "donor_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_pledges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_pledges_donor_profile_id_fkey"
            columns: ["donor_profile_id"]
            isOneToOne: false
            referencedRelation: "donor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donor_profiles: {
        Row: {
          company_id: string
          created_at: string
          crm_client_id: string
          donor_status: Database["public"]["Enums"]["donor_status"]
          first_donation_date: string | null
          id: string
          last_donation_date: string | null
          lifetime_giving_amount: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm_client_id: string
          donor_status?: Database["public"]["Enums"]["donor_status"]
          first_donation_date?: string | null
          id?: string
          last_donation_date?: string | null
          lifetime_giving_amount?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm_client_id?: string
          donor_status?: Database["public"]["Enums"]["donor_status"]
          first_donation_date?: string | null
          id?: string
          last_donation_date?: string | null
          lifetime_giving_amount?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donor_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_profiles_crm_client_id_fkey"
            columns: ["crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
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
          response_status: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          response_status?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          response_status?: string
          role?: string
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
      external_contacts: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_name: string | null
          phone: string | null
          tags: Json
          title: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
          tags?: Json
          title?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_name?: string | null
          phone?: string | null
          tags?: Json
          title?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_acl: {
        Row: {
          access_level: string
          company_id: string
          created_at: string
          created_by: string | null
          folder_id: string
          id: string
          principal_id: string | null
          principal_type: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          folder_id: string
          id?: string
          principal_id?: string | null
          principal_type: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          folder_id?: string
          id?: string
          principal_id?: string | null
          principal_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_acl_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_acl_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          access_level: string
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          owner_user_id: string | null
          parent_folder_id: string | null
          scope: string
          sort_order: number
        }
        Insert: {
          access_level?: string
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          parent_folder_id?: string | null
          scope?: string
          sort_order?: number
        }
        Update: {
          access_level?: string
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          parent_folder_id?: string | null
          scope?: string
          sort_order?: number
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
      form_fields: {
        Row: {
          created_at: string
          field_type: string
          form_id: string
          helper_text: string | null
          id: string
          is_required: boolean | null
          label: string
          maps_to: string | null
          options: Json | null
          placeholder: string | null
          sort_order: number
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          field_type: string
          form_id: string
          helper_text?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          maps_to?: string | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          field_type?: string
          form_id?: string
          helper_text?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          maps_to?: string | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          submission_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          submission_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          submission_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submission_values_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          company_id: string
          created_crm_client_id: string | null
          created_external_contact_id: string | null
          created_task_id: string | null
          form_id: string
          id: string
          metadata: Json | null
          submitted_at: string
          submitted_by: string | null
          submitter_email: string | null
          submitter_name: string | null
          submitter_phone: string | null
        }
        Insert: {
          company_id: string
          created_crm_client_id?: string | null
          created_external_contact_id?: string | null
          created_task_id?: string | null
          form_id: string
          id?: string
          metadata?: Json | null
          submitted_at?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_phone?: string | null
        }
        Update: {
          company_id?: string
          created_crm_client_id?: string | null
          created_external_contact_id?: string | null
          created_task_id?: string | null
          form_id?: string
          id?: string
          metadata?: Json | null
          submitted_at?: string
          submitted_by?: string | null
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_created_crm_client_id_fkey"
            columns: ["created_crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_created_external_contact_id_fkey"
            columns: ["created_external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_created_task_id_fkey"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          action_create_contact: boolean | null
          action_create_crm: boolean | null
          action_create_task: boolean | null
          action_crm_lifecycle_status: string | null
          action_task_title_template: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          action_create_contact?: boolean | null
          action_create_crm?: boolean | null
          action_create_task?: boolean | null
          action_crm_lifecycle_status?: string | null
          action_task_title_template?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_create_contact?: boolean | null
          action_create_crm?: boolean | null
          action_create_task?: boolean | null
          action_crm_lifecycle_status?: string | null
          action_task_title_template?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_cadences: {
        Row: {
          created_at: string
          default_owner_role_hint: string | null
          display_name: string
          duration_minutes: number | null
          enabled: boolean
          framework_id: string
          frequency_type: Database["public"]["Enums"]["framework_frequency_type"]
          id: string
          interval_n: number | null
          key: string
          sort_order: number
          target_day_of_month: number | null
          target_day_of_week: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_owner_role_hint?: string | null
          display_name: string
          duration_minutes?: number | null
          enabled?: boolean
          framework_id: string
          frequency_type?: Database["public"]["Enums"]["framework_frequency_type"]
          id?: string
          interval_n?: number | null
          key: string
          sort_order?: number
          target_day_of_month?: number | null
          target_day_of_week?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_owner_role_hint?: string | null
          display_name?: string
          duration_minutes?: number | null
          enabled?: boolean
          framework_id?: string
          frequency_type?: Database["public"]["Enums"]["framework_frequency_type"]
          id?: string
          interval_n?: number | null
          key?: string
          sort_order?: number
          target_day_of_month?: number | null
          target_day_of_week?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_cadences_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_concepts: {
        Row: {
          created_at: string
          description: string | null
          display_name_plural: string
          display_name_singular: string
          enabled: boolean
          framework_id: string
          id: string
          key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name_plural: string
          display_name_singular: string
          enabled?: boolean
          framework_id: string
          id?: string
          key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name_plural?: string
          display_name_singular?: string
          enabled?: boolean
          framework_id?: string
          id?: string
          key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_concepts_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_dashboard_sections: {
        Row: {
          config: Json | null
          created_at: string
          dashboard_id: string
          data_source_type: string
          display_name: string
          enabled: boolean
          id: string
          section_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          dashboard_id: string
          data_source_type: string
          display_name: string
          enabled?: boolean
          id?: string
          section_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          dashboard_id?: string
          data_source_type?: string
          display_name?: string
          enabled?: boolean
          id?: string
          section_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_dashboard_sections_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "framework_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_dashboards: {
        Row: {
          audience: Database["public"]["Enums"]["framework_dashboard_audience"]
          created_at: string
          display_name: string
          enabled: boolean
          framework_id: string
          id: string
          key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["framework_dashboard_audience"]
          created_at?: string
          display_name: string
          enabled?: boolean
          framework_id: string
          id?: string
          key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["framework_dashboard_audience"]
          created_at?: string
          display_name?: string
          enabled?: boolean
          framework_id?: string
          id?: string
          key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_dashboards_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_health_metrics: {
        Row: {
          calculation_key: string
          created_at: string
          data_source_type: string
          description: string | null
          display_name: string
          enabled: boolean
          framework_id: string
          id: string
          key: string
          metric_type: Database["public"]["Enums"]["framework_metric_type"]
          sort_order: number
          thresholds: Json | null
          updated_at: string
          weight_percent: number | null
        }
        Insert: {
          calculation_key: string
          created_at?: string
          data_source_type: string
          description?: string | null
          display_name: string
          enabled?: boolean
          framework_id: string
          id?: string
          key: string
          metric_type?: Database["public"]["Enums"]["framework_metric_type"]
          sort_order?: number
          thresholds?: Json | null
          updated_at?: string
          weight_percent?: number | null
        }
        Update: {
          calculation_key?: string
          created_at?: string
          data_source_type?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          framework_id?: string
          id?: string
          key?: string
          metric_type?: Database["public"]["Enums"]["framework_metric_type"]
          sort_order?: number
          thresholds?: Json | null
          updated_at?: string
          weight_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "framework_health_metrics_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_templates: {
        Row: {
          applies_to_concept_key: string | null
          cadence_key: string | null
          created_at: string
          enabled: boolean
          framework_id: string
          id: string
          sort_order: number
          template_id: string | null
          template_type: string
          updated_at: string
        }
        Insert: {
          applies_to_concept_key?: string | null
          cadence_key?: string | null
          created_at?: string
          enabled?: boolean
          framework_id: string
          id?: string
          sort_order?: number
          template_id?: string | null
          template_type: string
          updated_at?: string
        }
        Update: {
          applies_to_concept_key?: string | null
          cadence_key?: string | null
          created_at?: string
          enabled?: boolean
          framework_id?: string
          id?: string
          sort_order?: number
          template_id?: string | null
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_templates_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          archived_at: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          health_thresholds: Json | null
          id: string
          is_system_template: boolean
          marketplace_visibility: string | null
          name: string
          owner_company_id: string | null
          owner_type: Database["public"]["Enums"]["framework_owner_type"]
          published_at: string | null
          short_summary: string | null
          source_framework_id: string | null
          status: Database["public"]["Enums"]["framework_status"]
          tags: string[] | null
          updated_at: string
          version_label: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          health_thresholds?: Json | null
          id?: string
          is_system_template?: boolean
          marketplace_visibility?: string | null
          name: string
          owner_company_id?: string | null
          owner_type?: Database["public"]["Enums"]["framework_owner_type"]
          published_at?: string | null
          short_summary?: string | null
          source_framework_id?: string | null
          status?: Database["public"]["Enums"]["framework_status"]
          tags?: string[] | null
          updated_at?: string
          version_label?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          health_thresholds?: Json | null
          id?: string
          is_system_template?: boolean
          marketplace_visibility?: string | null
          name?: string
          owner_company_id?: string | null
          owner_type?: Database["public"]["Enums"]["framework_owner_type"]
          published_at?: string | null
          short_summary?: string | null
          source_framework_id?: string | null
          status?: Database["public"]["Enums"]["framework_status"]
          tags?: string[] | null
          updated_at?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frameworks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frameworks_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frameworks_source_framework_id_fkey"
            columns: ["source_framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
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
      kb_articles: {
        Row: {
          body_rich_text: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          helpful_no_count: number
          helpful_yes_count: number
          id: string
          published_at: string | null
          site_id: string
          status: Database["public"]["Enums"]["kb_article_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body_rich_text?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          helpful_no_count?: number
          helpful_yes_count?: number
          id?: string
          published_at?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["kb_article_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body_rich_text?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          helpful_no_count?: number
          helpful_yes_count?: number
          id?: string
          published_at?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["kb_article_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          site_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          site_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          site_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_assignments: {
        Row: {
          archived_at: string | null
          assignable_id: string
          assignable_type: string
          assigned_at: string
          assigned_by: string | null
          company_id: string
          created_at: string
          due_at: string | null
          id: string
          is_required: boolean
          notes: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          archived_at?: string | null
          assignable_id: string
          assignable_type: string
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          archived_at?: string | null
          assignable_id?: string
          assignable_type?: string
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_cohort_coaches_deprecated: {
        Row: {
          coach_profile_id: string | null
          cohort_id: string
          company_id: string
          created_at: string
          created_by: string | null
          external_contact_id: string | null
          id: string
          role: string
        }
        Insert: {
          coach_profile_id?: string | null
          cohort_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          external_contact_id?: string | null
          id?: string
          role?: string
        }
        Update: {
          coach_profile_id?: string | null
          cohort_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          external_contact_id?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_cohort_coaches_coach_profile_id_fkey"
            columns: ["coach_profile_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_cohort_coaches_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "lms_cohorts_deprecated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_cohort_coaches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_cohort_coaches_external_contact_id_fkey"
            columns: ["external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_cohorts_deprecated: {
        Row: {
          company_id: string
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          linked_project_id: string | null
          name: string
          settings: Json
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          linked_project_id?: string | null
          name: string
          settings?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          linked_project_id?: string | null
          name?: string
          settings?: Json
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_cohorts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses_deprecated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_cohorts_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_course_lessons: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lms_course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_course_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_courses: {
        Row: {
          archived_at: string | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          status: string
          syllabus_asset_path: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          status?: string
          syllabus_asset_path?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          status?: string
          syllabus_asset_path?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_courses_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_courses_deprecated: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          default_duration_minutes: number | null
          description: string | null
          id: string
          settings: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          settings?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          settings?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_enrollments_deprecated: {
        Row: {
          cohort_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          enrolled_at: string
          external_contact_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          cohort_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enrolled_at?: string
          external_contact_id: string
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          cohort_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          enrolled_at?: string
          external_contact_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "lms_cohorts_deprecated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_enrollments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_enrollments_external_contact_id_fkey"
            columns: ["external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_learning_paths: {
        Row: {
          archived_at: string | null
          company_id: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_learning_paths_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lessons: {
        Row: {
          archived_at: string | null
          company_id: string
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          external_url: string | null
          file_asset_path: string | null
          id: string
          rich_text_body: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility: string
          youtube_url: string | null
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          external_url?: string | null
          file_asset_path?: string | null
          id?: string
          rich_text_body?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility?: string
          youtube_url?: string | null
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          external_url?: string | null
          file_asset_path?: string | null
          id?: string
          rich_text_body?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_lessons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_path_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          path_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          path_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          path_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lms_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_path_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "lms_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_progress: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_viewed_at: string | null
          progress_percent: number | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_viewed_at?: string | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_viewed_at?: string | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_attempts: {
        Row: {
          answers: Json
          company_id: string
          id: string
          passed: boolean | null
          quiz_id: string
          score_percent: number | null
          started_at: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          company_id: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score_percent?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          company_id?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score_percent?: number | null
          started_at?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_questions: {
        Row: {
          correct_answer: Json
          created_at: string
          explanation: string | null
          id: string
          options: Json
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_text: string
          question_type: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quizzes: {
        Row: {
          allow_retries: boolean
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          passing_score_percent: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          allow_retries?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          passing_score_percent?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          allow_retries?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          passing_score_percent?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quizzes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_session_attendance_deprecated: {
        Row: {
          company_id: string
          external_contact_id: string
          id: string
          marked_at: string
          marked_by: string | null
          notes: string | null
          session_id: string
          status: string
        }
        Insert: {
          company_id: string
          external_contact_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          session_id: string
          status?: string
        }
        Update: {
          company_id?: string
          external_contact_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_session_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_session_attendance_external_contact_id_fkey"
            columns: ["external_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lms_sessions_deprecated"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_sessions_deprecated: {
        Row: {
          all_day: boolean
          cohort_id: string | null
          company_id: string
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          linked_event_id: string | null
          location_text: string | null
          meeting_url: string | null
          sort_order: number
          start_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          cohort_id?: string | null
          company_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          linked_event_id?: string | null
          location_text?: string | null
          meeting_url?: string | null
          sort_order?: number
          start_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          cohort_id?: string | null
          company_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          linked_event_id?: string | null
          location_text?: string | null
          meeting_url?: string | null
          sort_order?: number
          start_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "lms_cohorts_deprecated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses_deprecated"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_sessions_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          project_id: string | null
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
          project_id?: string | null
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
          project_id?: string | null
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
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_entitlements: {
        Row: {
          created_at: string
          entitlement_key: string
          entitlement_value: Json
          id: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entitlement_key: string
          entitlement_value: Json
          id?: string
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entitlement_key?: string
          entitlement_value?: Json
          id?: string
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
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
      sales_campaigns: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunities: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          crm_client_id: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          name: string
          owner_user_id: string | null
          pipeline_id: string
          source_campaign_id: string | null
          stage_id: string
          status: Database["public"]["Enums"]["opportunity_status"]
          updated_at: string
          value_amount: number | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name: string
          owner_user_id?: string | null
          pipeline_id: string
          source_campaign_id?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
          value_amount?: number | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          name?: string
          owner_user_id?: string | null
          pipeline_id?: string
          source_campaign_id?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
          value_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_crm_client_id_fkey"
            columns: ["crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "sales_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "sales_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_opportunity_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_stage_id: string | null
          id: string
          opportunity_id: string
          to_stage_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: string
          opportunity_id: string
          to_stage_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_stage_id?: string | null
          id?: string
          opportunity_id?: string
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunity_stage_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunity_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "sales_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipeline_stages: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_closed_lost: boolean
          is_closed_won: boolean
          name: string
          pipeline_id: string
          probability_percent: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_closed_lost?: boolean
          is_closed_won?: boolean
          name: string
          pipeline_id: string
          probability_percent?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_closed_lost?: boolean
          is_closed_won?: boolean
          name?: string
          pipeline_id?: string
          probability_percent?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "sales_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipelines: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          company_id: string | null
          config_json: Json
          created_at: string
          id: string
          is_personal: boolean
          module: string
          name: string
          owner_user_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          config_json?: Json
          created_at?: string
          id?: string
          is_personal?: boolean
          module: string
          name: string
          owner_user_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          config_json?: Json
          created_at?: string
          id?: string
          is_personal?: boolean
          module?: string
          name?: string
          owner_user_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_company_id_fkey"
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
      support_ticket_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          payload: Json | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id: string
          body_rich_text: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_type?: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id: string
          body_rich_text: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_type?: Database["public"]["Enums"]["ticket_author_type"]
          author_user_id?: string
          body_rich_text?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to_user_id: string | null
          category: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          site_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          site_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          site_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
      task_lists: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_personal: boolean
          name: string
          owner_user_id: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_personal?: boolean
          name: string
          owner_user_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_personal?: boolean
          name?: string
          owner_user_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          list_id: string | null
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
          list_id?: string | null
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
          list_id?: string | null
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
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
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
      wf_form_fields: {
        Row: {
          created_at: string
          field_type: Database["public"]["Enums"]["wf_field_type"]
          form_id: string
          help_text: string | null
          id: string
          is_required: boolean
          key: string
          label: string
          options: Json | null
          sort_order: number
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["wf_field_type"]
          form_id: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          key: string
          label: string
          options?: Json | null
          sort_order?: number
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          field_type?: Database["public"]["Enums"]["wf_field_type"]
          form_id?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          key?: string
          label?: string
          options?: Json | null
          sort_order?: number
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wf_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "wf_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_form_submission_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          submission_id: string
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          submission_id: string
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          submission_id?: string
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wf_form_submission_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "wf_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_form_submission_values_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "wf_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_form_submissions: {
        Row: {
          company_context_id: string | null
          form_id: string
          id: string
          status: Database["public"]["Enums"]["wf_submission_status"]
          submitted_at: string
          submitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          company_context_id?: string | null
          form_id: string
          id?: string
          status?: Database["public"]["Enums"]["wf_submission_status"]
          submitted_at?: string
          submitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          company_context_id?: string | null
          form_id?: string
          id?: string
          status?: Database["public"]["Enums"]["wf_submission_status"]
          submitted_at?: string
          submitter_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wf_form_submissions_company_context_id_fkey"
            columns: ["company_context_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "wf_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_forms: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          group_id: string | null
          id: string
          language_code: string | null
          published_at: string | null
          published_by: string | null
          scope_type: Database["public"]["Enums"]["wf_scope_type"]
          site_id: string | null
          status: Database["public"]["Enums"]["wf_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          language_code?: string | null
          published_at?: string | null
          published_by?: string | null
          scope_type?: Database["public"]["Enums"]["wf_scope_type"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["wf_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          language_code?: string | null
          published_at?: string | null
          published_by?: string | null
          scope_type?: Database["public"]["Enums"]["wf_scope_type"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["wf_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wf_forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_forms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_forms_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_workflow_runs: {
        Row: {
          cancellation_reason: string | null
          cancelled_by: string | null
          company_context_id: string | null
          completed_at: string | null
          definition_published_at: string | null
          id: string
          initiated_by_user_id: string | null
          metadata: Json | null
          started_at: string
          status: Database["public"]["Enums"]["wf_run_status"]
          target_employee_id: string | null
          workflow_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          company_context_id?: string | null
          completed_at?: string | null
          definition_published_at?: string | null
          id?: string
          initiated_by_user_id?: string | null
          metadata?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["wf_run_status"]
          target_employee_id?: string | null
          workflow_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          company_context_id?: string | null
          completed_at?: string | null
          definition_published_at?: string | null
          id?: string
          initiated_by_user_id?: string | null
          metadata?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["wf_run_status"]
          target_employee_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wf_workflow_runs_company_context_id_fkey"
            columns: ["company_context_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_workflow_runs_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wf_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_workflow_step_runs: {
        Row: {
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          output_links: Json | null
          reassigned_by: string | null
          reassigned_from_user_id: string | null
          run_id: string
          skip_reason: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["wf_step_run_status"]
          step_id: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          output_links?: Json | null
          reassigned_by?: string | null
          reassigned_from_user_id?: string | null
          run_id: string
          skip_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["wf_step_run_status"]
          step_id: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          output_links?: Json | null
          reassigned_by?: string | null
          reassigned_from_user_id?: string | null
          run_id?: string
          skip_reason?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["wf_step_run_status"]
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wf_workflow_step_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "wf_workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_workflow_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "wf_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_workflow_steps: {
        Row: {
          assignee_id: string | null
          assignee_type: Database["public"]["Enums"]["wf_assignee_type"] | null
          config: Json | null
          created_at: string
          due_days_offset: number | null
          enabled: boolean
          id: string
          instructions: string | null
          sort_order: number
          step_type: Database["public"]["Enums"]["wf_step_type"]
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_type?: Database["public"]["Enums"]["wf_assignee_type"] | null
          config?: Json | null
          created_at?: string
          due_days_offset?: number | null
          enabled?: boolean
          id?: string
          instructions?: string | null
          sort_order?: number
          step_type: Database["public"]["Enums"]["wf_step_type"]
          title: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          assignee_id?: string | null
          assignee_type?: Database["public"]["Enums"]["wf_assignee_type"] | null
          config?: Json | null
          created_at?: string
          due_days_offset?: number | null
          enabled?: boolean
          id?: string
          instructions?: string | null
          sort_order?: number
          step_type?: Database["public"]["Enums"]["wf_step_type"]
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wf_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "wf_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      wf_workflows: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          group_id: string | null
          id: string
          published_at: string | null
          published_by: string | null
          scope_type: Database["public"]["Enums"]["wf_scope_type"]
          site_id: string | null
          status: Database["public"]["Enums"]["wf_status"]
          title: string
          trigger_config: Json | null
          trigger_type: Database["public"]["Enums"]["wf_trigger_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          scope_type?: Database["public"]["Enums"]["wf_scope_type"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["wf_status"]
          title: string
          trigger_config?: Json | null
          trigger_type?: Database["public"]["Enums"]["wf_trigger_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          scope_type?: Database["public"]["Enums"]["wf_scope_type"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["wf_status"]
          title?: string
          trigger_config?: Json | null
          trigger_type?: Database["public"]["Enums"]["wf_trigger_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wf_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_workflows_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_workflows_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      clone_framework: {
        Args: {
          p_new_description?: string
          p_new_name: string
          p_source_framework_id: string
          p_target_company_id: string
        }
        Returns: string
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
      folder_create: {
        Args: {
          p_company_id?: string
          p_name: string
          p_parent_folder_id?: string
          p_scope: string
        }
        Returns: string
      }
      folder_delete: { Args: { p_folder_id: string }; Returns: undefined }
      folder_move: {
        Args: {
          p_folder_id: string
          p_new_index?: number
          p_new_parent_folder_id?: string
        }
        Returns: undefined
      }
      folder_rename: {
        Args: { p_folder_id: string; p_name: string }
        Returns: undefined
      }
      folder_reorder: {
        Args: { p_folder_id: string; p_new_index: number }
        Returns: undefined
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
      get_folder_access_level: {
        Args: { p_folder_id: string; p_user_id: string }
        Returns: string
      }
      get_folder_depth: { Args: { p_folder_id: string }; Returns: number }
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
      get_user_site_id: { Args: never; Returns: string }
      is_assigned_to_engagement: {
        Args: { p_engagement_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_coach_manager_or_admin: {
        Args: { p_company_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_coaching_org_member: {
        Args: { p_company_id: string; p_user_id?: string }
        Returns: boolean
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
      move_documents_to_folder: {
        Args: { p_document_ids: string[]; p_folder_id?: string }
        Returns: undefined
      }
      move_notes_to_folder: {
        Args: { p_folder_id?: string; p_note_ids: string[] }
        Returns: undefined
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
      task_list_counts: {
        Args: { p_company_id?: string }
        Returns: {
          list_id: string
          task_count: number
        }[]
      }
      task_list_create: {
        Args: {
          p_color?: string
          p_company_id?: string
          p_name: string
          p_scope: string
        }
        Returns: string
      }
      task_list_delete: { Args: { p_list_id: string }; Returns: undefined }
      task_list_rename: {
        Args: { p_list_id: string; p_name: string }
        Returns: undefined
      }
      task_list_reorder: {
        Args: { p_list_id: string; p_new_index: number }
        Returns: undefined
      }
      uncomplete_task_occurrence: {
        Args: { p_occurrence_start_at: string; p_series_task_id: string }
        Returns: Json
      }
      unlisted_task_count: { Args: { p_company_id: string }; Returns: number }
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
      campaign_type: "email" | "event" | "referral" | "content" | "other"
      coach_assignment_role: "primary_coach" | "support_coach"
      coaching_role: "coach" | "coach_manager" | "org_admin"
      company_status:
        | "active"
        | "inactive"
        | "archived"
        | "pending"
        | "suspended"
      donation_status: "recorded" | "receipted" | "refunded"
      donor_status: "prospect" | "active" | "lapsed" | "major"
      engagement_status: "active" | "paused" | "ended"
      framework_dashboard_audience:
        | "company_admin"
        | "leadership"
        | "member"
        | "coach"
        | "coach_manager"
      framework_frequency_type:
        | "weekly"
        | "monthly"
        | "quarterly"
        | "annual"
        | "custom"
      framework_metric_type: "percentage" | "count" | "trend" | "boolean"
      framework_owner_type: "system" | "coach_org" | "company"
      framework_status: "draft" | "published" | "archived"
      kb_article_status: "draft" | "published" | "archived"
      membership_role:
        | "company_admin"
        | "location_admin"
        | "module_admin"
        | "user"
        | "external"
      module_status: "active" | "trial" | "expired" | "suspended"
      opportunity_status: "open" | "won" | "lost"
      payment_method: "cash" | "check" | "credit_card" | "online" | "other"
      plan_status: "active" | "grace" | "expired" | "cancelled"
      plan_tier:
        | "starter"
        | "growth"
        | "scale"
        | "solo_coach"
        | "coaching_team"
        | "coaching_firm"
      plan_type: "company" | "coach_org"
      pledge_frequency: "one_time" | "monthly" | "quarterly" | "annual"
      pledge_status: "active" | "fulfilled" | "cancelled"
      recommendation_status: "proposed" | "accepted" | "rejected" | "expired"
      recommendation_type:
        | "task"
        | "project"
        | "calendar_event"
        | "note_prompt"
        | "document_prompt"
        | "framework_change_suggestion"
        | "framework_adoption"
      site_role: "super_admin" | "site_admin"
      ticket_author_type: "requester" | "agent"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "new"
        | "triage"
        | "in_progress"
        | "waiting_on_requester"
        | "resolved"
        | "closed"
      wf_assignee_type:
        | "user"
        | "employee"
        | "group"
        | "company_admin"
        | "workflow_initiator"
      wf_field_type:
        | "short_text"
        | "long_text"
        | "email"
        | "phone"
        | "number"
        | "date"
        | "dropdown"
        | "multi_select"
        | "checkbox"
        | "rating"
        | "yes_no"
      wf_run_status: "running" | "completed" | "cancelled" | "failed"
      wf_scope_type: "site" | "company" | "group"
      wf_status: "draft" | "published" | "archived"
      wf_step_run_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "rejected"
        | "skipped"
        | "failed"
      wf_step_type:
        | "form_step"
        | "approval_step"
        | "task_step"
        | "project_step"
        | "calendar_step"
        | "document_step"
        | "note_step"
        | "notify_step"
        | "assign_lms_step"
        | "support_ticket_step"
      wf_submission_status:
        | "submitted"
        | "under_review"
        | "completed"
        | "closed"
      wf_trigger_type:
        | "manual"
        | "employee_event"
        | "scheduled"
        | "form_submission"
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
      campaign_type: ["email", "event", "referral", "content", "other"],
      coach_assignment_role: ["primary_coach", "support_coach"],
      coaching_role: ["coach", "coach_manager", "org_admin"],
      company_status: [
        "active",
        "inactive",
        "archived",
        "pending",
        "suspended",
      ],
      donation_status: ["recorded", "receipted", "refunded"],
      donor_status: ["prospect", "active", "lapsed", "major"],
      engagement_status: ["active", "paused", "ended"],
      framework_dashboard_audience: [
        "company_admin",
        "leadership",
        "member",
        "coach",
        "coach_manager",
      ],
      framework_frequency_type: [
        "weekly",
        "monthly",
        "quarterly",
        "annual",
        "custom",
      ],
      framework_metric_type: ["percentage", "count", "trend", "boolean"],
      framework_owner_type: ["system", "coach_org", "company"],
      framework_status: ["draft", "published", "archived"],
      kb_article_status: ["draft", "published", "archived"],
      membership_role: [
        "company_admin",
        "location_admin",
        "module_admin",
        "user",
        "external",
      ],
      module_status: ["active", "trial", "expired", "suspended"],
      opportunity_status: ["open", "won", "lost"],
      payment_method: ["cash", "check", "credit_card", "online", "other"],
      plan_status: ["active", "grace", "expired", "cancelled"],
      plan_tier: [
        "starter",
        "growth",
        "scale",
        "solo_coach",
        "coaching_team",
        "coaching_firm",
      ],
      plan_type: ["company", "coach_org"],
      pledge_frequency: ["one_time", "monthly", "quarterly", "annual"],
      pledge_status: ["active", "fulfilled", "cancelled"],
      recommendation_status: ["proposed", "accepted", "rejected", "expired"],
      recommendation_type: [
        "task",
        "project",
        "calendar_event",
        "note_prompt",
        "document_prompt",
        "framework_change_suggestion",
        "framework_adoption",
      ],
      site_role: ["super_admin", "site_admin"],
      ticket_author_type: ["requester", "agent"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "new",
        "triage",
        "in_progress",
        "waiting_on_requester",
        "resolved",
        "closed",
      ],
      wf_assignee_type: [
        "user",
        "employee",
        "group",
        "company_admin",
        "workflow_initiator",
      ],
      wf_field_type: [
        "short_text",
        "long_text",
        "email",
        "phone",
        "number",
        "date",
        "dropdown",
        "multi_select",
        "checkbox",
        "rating",
        "yes_no",
      ],
      wf_run_status: ["running", "completed", "cancelled", "failed"],
      wf_scope_type: ["site", "company", "group"],
      wf_status: ["draft", "published", "archived"],
      wf_step_run_status: [
        "pending",
        "in_progress",
        "completed",
        "rejected",
        "skipped",
        "failed",
      ],
      wf_step_type: [
        "form_step",
        "approval_step",
        "task_step",
        "project_step",
        "calendar_step",
        "document_step",
        "note_step",
        "notify_step",
        "assign_lms_step",
        "support_ticket_step",
      ],
      wf_submission_status: [
        "submitted",
        "under_review",
        "completed",
        "closed",
      ],
      wf_trigger_type: [
        "manual",
        "employee_event",
        "scheduled",
        "form_submission",
      ],
    },
  },
} as const
