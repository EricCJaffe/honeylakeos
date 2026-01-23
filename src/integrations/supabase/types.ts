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
      access_grants: {
        Row: {
          allow_non_scoped_create: boolean | null
          coaching_scoped_only: boolean | null
          constraints: Json | null
          created_at: string
          grantee_user_id: string
          grantor_company_id: string
          id: string
          module: Database["public"]["Enums"]["grant_module"]
          role: Database["public"]["Enums"]["grant_role"]
          source_id: string | null
          source_type: Database["public"]["Enums"]["grant_source_type"]
          status: Database["public"]["Enums"]["grant_status"]
          updated_at: string
        }
        Insert: {
          allow_non_scoped_create?: boolean | null
          coaching_scoped_only?: boolean | null
          constraints?: Json | null
          created_at?: string
          grantee_user_id: string
          grantor_company_id: string
          id?: string
          module: Database["public"]["Enums"]["grant_module"]
          role: Database["public"]["Enums"]["grant_role"]
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["grant_source_type"]
          status?: Database["public"]["Enums"]["grant_status"]
          updated_at?: string
        }
        Update: {
          allow_non_scoped_create?: boolean | null
          coaching_scoped_only?: boolean | null
          constraints?: Json | null
          created_at?: string
          grantee_user_id?: string
          grantor_company_id?: string
          id?: string
          module?: Database["public"]["Enums"]["grant_module"]
          role?: Database["public"]["Enums"]["grant_role"]
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["grant_source_type"]
          status?: Database["public"]["Enums"]["grant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_grantor_company_id_fkey"
            columns: ["grantor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_events: {
        Row: {
          company_id: string
          event_key: string
          id: string
          metadata_json: Json | null
          occurred_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          event_key: string
          id?: string
          metadata_json?: Json | null
          occurred_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          event_key?: string
          id?: string
          metadata_json?: Json | null
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activation_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      activation_scores: {
        Row: {
          breakdown_json: Json
          calculated_at: string
          calculated_by: string | null
          company_id: string
          id: string
          score: number
        }
        Insert: {
          breakdown_json?: Json
          calculated_at?: string
          calculated_by?: string | null
          company_id: string
          id?: string
          score?: number
        }
        Update: {
          breakdown_json?: Json
          calculated_at?: string
          calculated_by?: string | null
          company_id?: string
          id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "activation_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          company_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          company_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          company_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body_rte: string
          company_id: string
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          id: string
          publish_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          body_rte: string
          company_id: string
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          id?: string
          publish_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          body_rte?: string
          company_id?: string
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          id?: string
          publish_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          id: string
          owner_user_id: string
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          id?: string
          owner_user_id: string
          storage_bucket?: string
          storage_path: string
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          owner_user_id?: string
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bank_accounts: {
        Row: {
          account_mask: string | null
          account_type: string
          available_balance: number | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          current_balance: number
          finance_account_id: string | null
          id: string
          institution_name: string | null
          is_active: boolean
          is_sample: boolean
          last_synced_at: string | null
          name: string
          plaid_account_id: string | null
          plaid_item_id: string | null
          sample_batch_id: string | null
          updated_at: string
        }
        Insert: {
          account_mask?: string | null
          account_type?: string
          available_balance?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          finance_account_id?: string | null
          id?: string
          institution_name?: string | null
          is_active?: boolean
          is_sample?: boolean
          last_synced_at?: string | null
          name: string
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          sample_batch_id?: string | null
          updated_at?: string
        }
        Update: {
          account_mask?: string | null
          account_type?: string
          available_balance?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          finance_account_id?: string | null
          id?: string
          institution_name?: string | null
          is_active?: boolean
          is_sample?: boolean
          last_synced_at?: string | null
          name?: string
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          sample_batch_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_finance_account_id_fkey"
            columns: ["finance_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_account_id: string
          cleared_balance: number
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          difference: number | null
          id: string
          notes: string | null
          started_at: string
          statement_date: string
          statement_ending_balance: number
          status: Database["public"]["Enums"]["reconciliation_status"]
          updated_at: string
        }
        Insert: {
          bank_account_id: string
          cleared_balance?: number
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          started_at?: string
          statement_date: string
          statement_ending_balance: number
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Update: {
          bank_account_id?: string
          cleared_balance?: number
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          started_at?: string
          statement_date?: string
          statement_ending_balance?: number
          status?: Database["public"]["Enums"]["reconciliation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          category: string | null
          company_id: string
          created_at: string
          description: string
          id: string
          import_batch_id: string | null
          is_sample: boolean
          journal_entry_id: string | null
          matched_account_id: string | null
          matched_crm_client_id: string | null
          matched_vendor_id: string | null
          notes: string | null
          original_description: string | null
          plaid_transaction_id: string | null
          posted_date: string | null
          reconciliation_id: string | null
          sample_batch_id: string | null
          status: Database["public"]["Enums"]["bank_transaction_status"]
          tags: string[] | null
          transaction_date: string
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          category?: string | null
          company_id: string
          created_at?: string
          description: string
          id?: string
          import_batch_id?: string | null
          is_sample?: boolean
          journal_entry_id?: string | null
          matched_account_id?: string | null
          matched_crm_client_id?: string | null
          matched_vendor_id?: string | null
          notes?: string | null
          original_description?: string | null
          plaid_transaction_id?: string | null
          posted_date?: string | null
          reconciliation_id?: string | null
          sample_batch_id?: string | null
          status?: Database["public"]["Enums"]["bank_transaction_status"]
          tags?: string[] | null
          transaction_date: string
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          import_batch_id?: string | null
          is_sample?: boolean
          journal_entry_id?: string | null
          matched_account_id?: string | null
          matched_crm_client_id?: string | null
          matched_vendor_id?: string | null
          notes?: string | null
          original_description?: string | null
          plaid_transaction_id?: string | null
          posted_date?: string | null
          reconciliation_id?: string | null
          sample_batch_id?: string | null
          status?: Database["public"]["Enums"]["bank_transaction_status"]
          tags?: string[] | null
          transaction_date?: string
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_account_id_fkey"
            columns: ["matched_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_crm_client_id_fkey"
            columns: ["matched_crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_vendor_id_fkey"
            columns: ["matched_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bank_transactions_reconciliation"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_lines: {
        Row: {
          account_id: string
          amount: number
          bill_id: string
          created_at: string
          description: string | null
          id: string
          line_order: number
          quantity: number
          unit_price: number
        }
        Insert: {
          account_id: string
          amount?: number
          bill_id: string
          created_at?: string
          description?: string | null
          id?: string
          line_order?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          account_id?: string
          amount?: number
          bill_id?: string
          created_at?: string
          description?: string | null
          id?: string
          line_order?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount_paid: number
          archived_at: string | null
          balance_due: number | null
          bill_date: string
          bill_number: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          due_date: string
          id: string
          is_sample: boolean
          journal_entry_id: string | null
          memo: string | null
          payment_date: string | null
          payment_journal_entry_id: string | null
          payment_method: string | null
          payment_reference: string | null
          sample_batch_id: string | null
          status: Database["public"]["Enums"]["bill_status"]
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount_paid?: number
          archived_at?: string | null
          balance_due?: number | null
          bill_date: string
          bill_number: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date: string
          id?: string
          is_sample?: boolean
          journal_entry_id?: string | null
          memo?: string | null
          payment_date?: string | null
          payment_journal_entry_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          sample_batch_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount_paid?: number
          archived_at?: string | null
          balance_due?: number | null
          bill_date?: string
          bill_number?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string
          id?: string
          is_sample?: boolean
          journal_entry_id?: string | null
          memo?: string | null
          payment_date?: string | null
          payment_journal_entry_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          sample_batch_id?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_payment_journal_entry_id_fkey"
            columns: ["payment_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_import_jobs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          mapping_json: Json | null
          row_count: number | null
          source_filename: string | null
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          mapping_json?: Json | null
          row_count?: number | null
          source_filename?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          mapping_json?: Json | null
          row_count?: number | null
          source_filename?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coa_import_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          site_id: string | null
          template_json: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          site_id?: string | null
          template_json?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          site_id?: string | null
          template_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "coa_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_alerts: {
        Row: {
          alert_type: string
          client_company_id: string
          coach_company_id: string
          created_at: string
          data_snapshot: Json | null
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          suggested_action: string | null
        }
        Insert: {
          alert_type: string
          client_company_id: string
          coach_company_id: string
          created_at?: string
          data_snapshot?: Json | null
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          suggested_action?: string | null
        }
        Update: {
          alert_type?: string
          client_company_id?: string
          coach_company_id?: string
          created_at?: string
          data_snapshot?: Json | null
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_alerts_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_alerts_coach_company_id_fkey"
            columns: ["coach_company_id"]
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
          {
            foreignKeyName: "coach_assignments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_pending_coaching_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_organizations: {
        Row: {
          client_company_id: string
          coach_company_id: string
          created_at: string
          created_by: string | null
          id: string
          relationship_type: string
          status: string
          updated_at: string
        }
        Insert: {
          client_company_id: string
          coach_company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_company_id?: string
          coach_company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          relationship_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_organizations_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_organizations_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_plan_overrides: {
        Row: {
          coach_plan_id: string
          created_at: string
          entitlement_key: string
          entitlement_value: Json
          id: string
        }
        Insert: {
          coach_plan_id: string
          created_at?: string
          entitlement_key: string
          entitlement_value: Json
          id?: string
        }
        Update: {
          coach_plan_id?: string
          created_at?: string
          entitlement_key?: string
          entitlement_value?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_plan_overrides_coach_plan_id_fkey"
            columns: ["coach_plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_plans: {
        Row: {
          base_plan_id: string
          coach_company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_plan_id: string
          coach_company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_plan_id?: string
          coach_company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_plans_base_plan_id_fkey"
            columns: ["base_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_plans_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "coach_recommendations_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "v_pending_coaching_invitations"
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
      coach_referral_links: {
        Row: {
          coach_company_id: string
          coach_plan_id: string | null
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          name: string | null
          uses_count: number
        }
        Insert: {
          coach_company_id: string
          coach_plan_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string | null
          uses_count?: number
        }
        Update: {
          coach_company_id?: string
          coach_plan_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coach_referral_links_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_referral_links_coach_plan_id_fkey"
            columns: ["coach_plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_share_requests: {
        Row: {
          client_company_id: string
          coach_company_id: string
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          entity_id: string
          entity_name: string | null
          id: string
          reason: string | null
          request_type: Database["public"]["Enums"]["share_request_type"]
          requested_by: string
          status: Database["public"]["Enums"]["suggestion_status"]
        }
        Insert: {
          client_company_id: string
          coach_company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          entity_id: string
          entity_name?: string | null
          id?: string
          reason?: string | null
          request_type?: Database["public"]["Enums"]["share_request_type"]
          requested_by: string
          status?: Database["public"]["Enums"]["suggestion_status"]
        }
        Update: {
          client_company_id?: string
          coach_company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          entity_id?: string
          entity_name?: string | null
          id?: string
          reason?: string | null
          request_type?: Database["public"]["Enums"]["share_request_type"]
          requested_by?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
        }
        Relationships: [
          {
            foreignKeyName: "coach_share_requests_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_share_requests_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_assignment_instances: {
        Row: {
          coaching_assignment_id: string
          created_at: string
          created_id: string
          created_table: string
          id: string
          member_company_id: string
          status: Database["public"]["Enums"]["coaching_instance_status"]
          updated_at: string
        }
        Insert: {
          coaching_assignment_id: string
          created_at?: string
          created_id: string
          created_table: string
          id?: string
          member_company_id: string
          status?: Database["public"]["Enums"]["coaching_instance_status"]
          updated_at?: string
        }
        Update: {
          coaching_assignment_id?: string
          created_at?: string
          created_id?: string
          created_table?: string
          id?: string
          member_company_id?: string
          status?: Database["public"]["Enums"]["coaching_instance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_assignment_instances_coaching_assignment_id_fkey"
            columns: ["coaching_assignment_id"]
            isOneToOne: false
            referencedRelation: "coaching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_assignment_instances_member_company_id_fkey"
            columns: ["member_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string
          assignment_type: Database["public"]["Enums"]["coaching_assignment_type"]
          coaching_engagement_id: string | null
          coaching_org_id: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          legacy_assignment_id: string | null
          member_user_id: string | null
          status: Database["public"]["Enums"]["coaching_assignment_status"]
          template_id: string | null
          title_override: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id: string
          assignment_type: Database["public"]["Enums"]["coaching_assignment_type"]
          coaching_engagement_id?: string | null
          coaching_org_id: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          legacy_assignment_id?: string | null
          member_user_id?: string | null
          status?: Database["public"]["Enums"]["coaching_assignment_status"]
          template_id?: string | null
          title_override?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string
          assignment_type?: Database["public"]["Enums"]["coaching_assignment_type"]
          coaching_engagement_id?: string | null
          coaching_org_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          legacy_assignment_id?: string | null
          member_user_id?: string | null
          status?: Database["public"]["Enums"]["coaching_assignment_status"]
          template_id?: string | null
          title_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_assignments_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_assignments_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
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
      coaching_coaches: {
        Row: {
          coaching_org_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["coaching_org_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_coaches_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_dashboard_widgets: {
        Row: {
          config_json: Json | null
          created_at: string
          dashboard_id: string
          data_source: string | null
          description: string | null
          id: string
          updated_at: string
          widget_key: string
          widget_order: number
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          dashboard_id: string
          data_source?: string | null
          description?: string | null
          id?: string
          updated_at?: string
          widget_key: string
          widget_order?: number
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          dashboard_id?: string
          data_source?: string | null
          description?: string | null
          id?: string
          updated_at?: string
          widget_key?: string
          widget_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "coaching_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_dashboards: {
        Row: {
          created_at: string
          dashboard_type: Database["public"]["Enums"]["coaching_dashboard_type"]
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dashboard_type: Database["public"]["Enums"]["coaching_dashboard_type"]
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dashboard_type?: Database["public"]["Enums"]["coaching_dashboard_type"]
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coaching_engagement_onboarding: {
        Row: {
          applied_template_id: string | null
          coaching_engagement_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          id: string
          member_company_id: string
          status: Database["public"]["Enums"]["coaching_onboarding_status"]
          updated_at: string
        }
        Insert: {
          applied_template_id?: string | null
          coaching_engagement_id: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          member_company_id: string
          status?: Database["public"]["Enums"]["coaching_onboarding_status"]
          updated_at?: string
        }
        Update: {
          applied_template_id?: string | null
          coaching_engagement_id?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          member_company_id?: string
          status?: Database["public"]["Enums"]["coaching_onboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_engagement_onboarding_applied_template_id_fkey"
            columns: ["applied_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_engagement_onboarding_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: true
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_engagement_onboarding_member_company_id_fkey"
            columns: ["member_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_engagements: {
        Row: {
          accepted_at: string | null
          archived_at: string | null
          client_company_id: string
          coaching_org_company_id: string
          created_at: string
          created_by: string | null
          declined_at: string | null
          declined_reason: string | null
          end_date: string | null
          engagement_status: Database["public"]["Enums"]["engagement_status"]
          id: string
          invited_at: string | null
          invited_by_type:
            | Database["public"]["Enums"]["invitation_initiated_by"]
            | null
          invited_by_user_id: string | null
          notes: string | null
          primary_framework_id: string | null
          program_key_snapshot: string | null
          program_name_snapshot: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          archived_at?: string | null
          client_company_id: string
          coaching_org_company_id: string
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          end_date?: string | null
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          id?: string
          invited_at?: string | null
          invited_by_type?:
            | Database["public"]["Enums"]["invitation_initiated_by"]
            | null
          invited_by_user_id?: string | null
          notes?: string | null
          primary_framework_id?: string | null
          program_key_snapshot?: string | null
          program_name_snapshot?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          archived_at?: string | null
          client_company_id?: string
          coaching_org_company_id?: string
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          end_date?: string | null
          engagement_status?: Database["public"]["Enums"]["engagement_status"]
          id?: string
          invited_at?: string | null
          invited_by_type?:
            | Database["public"]["Enums"]["invitation_initiated_by"]
            | null
          invited_by_user_id?: string | null
          notes?: string | null
          primary_framework_id?: string | null
          program_key_snapshot?: string | null
          program_name_snapshot?: string | null
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
      coaching_form_requests: {
        Row: {
          coaching_engagement_id: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_at: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          coaching_engagement_id: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          coaching_engagement_id?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_form_requests_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_goals: {
        Row: {
          coaching_plan_id: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          metric: string | null
          status: Database["public"]["Enums"]["coaching_goal_status"]
          target_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          coaching_plan_id: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metric?: string | null
          status?: Database["public"]["Enums"]["coaching_goal_status"]
          target_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          coaching_plan_id?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          metric?: string | null
          status?: Database["public"]["Enums"]["coaching_goal_status"]
          target_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_goals_coaching_plan_id_fkey"
            columns: ["coaching_plan_id"]
            isOneToOne: false
            referencedRelation: "coaching_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_health_check_responses: {
        Row: {
          bool_value: boolean | null
          coaching_health_check_id: string
          created_at: string
          id: string
          numeric_value: number | null
          question: string
          responded_by_user_id: string | null
          response: string | null
          score: number | null
          template_question_id: string | null
          text_value: string | null
          updated_at: string
        }
        Insert: {
          bool_value?: boolean | null
          coaching_health_check_id: string
          created_at?: string
          id?: string
          numeric_value?: number | null
          question: string
          responded_by_user_id?: string | null
          response?: string | null
          score?: number | null
          template_question_id?: string | null
          text_value?: string | null
          updated_at?: string
        }
        Update: {
          bool_value?: boolean | null
          coaching_health_check_id?: string
          created_at?: string
          id?: string
          numeric_value?: number | null
          question?: string
          responded_by_user_id?: string | null
          response?: string | null
          score?: number | null
          template_question_id?: string | null
          text_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_check_responses_coaching_health_check_id_fkey"
            columns: ["coaching_health_check_id"]
            isOneToOne: false
            referencedRelation: "coaching_health_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_health_check_responses_coaching_health_check_id_fkey"
            columns: ["coaching_health_check_id"]
            isOneToOne: false
            referencedRelation: "v_health_check_subject_overall_score"
            referencedColumns: ["coaching_health_check_id"]
          },
          {
            foreignKeyName: "coaching_health_check_responses_template_question_id_fkey"
            columns: ["template_question_id"]
            isOneToOne: false
            referencedRelation: "coaching_health_check_template_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_health_check_template_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          question_order: number
          question_text: string
          response_type: Database["public"]["Enums"]["health_check_response_type"]
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          question_order: number
          question_text: string
          response_type?: Database["public"]["Enums"]["health_check_response_type"]
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          question_order?: number
          question_text?: string
          response_type?: Database["public"]["Enums"]["health_check_response_type"]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_check_template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coaching_health_check_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_health_check_templates: {
        Row: {
          cadence: Database["public"]["Enums"]["health_check_cadence"]
          coaching_org_id: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["template_status"]
          subject_type: Database["public"]["Enums"]["coaching_health_subject_type"]
          updated_at: string
        }
        Insert: {
          cadence?: Database["public"]["Enums"]["health_check_cadence"]
          coaching_org_id: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["template_status"]
          subject_type?: Database["public"]["Enums"]["coaching_health_subject_type"]
          updated_at?: string
        }
        Update: {
          cadence?: Database["public"]["Enums"]["health_check_cadence"]
          coaching_org_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["template_status"]
          subject_type?: Database["public"]["Enums"]["coaching_health_subject_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_check_templates_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_health_checks: {
        Row: {
          assessment_period: Database["public"]["Enums"]["coaching_assessment_period"]
          coaching_engagement_id: string
          created_at: string
          id: string
          overall_score: number | null
          period_end: string | null
          period_start: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["coaching_health_status"]
          subject_type: Database["public"]["Enums"]["coaching_health_subject_type"]
          submitted_at: string | null
          submitted_by_user_id: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assessment_period: Database["public"]["Enums"]["coaching_assessment_period"]
          coaching_engagement_id: string
          created_at?: string
          id?: string
          overall_score?: number | null
          period_end?: string | null
          period_start?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["coaching_health_status"]
          subject_type: Database["public"]["Enums"]["coaching_health_subject_type"]
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assessment_period?: Database["public"]["Enums"]["coaching_assessment_period"]
          coaching_engagement_id?: string
          created_at?: string
          id?: string
          overall_score?: number | null
          period_end?: string | null
          period_start?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["coaching_health_status"]
          subject_type?: Database["public"]["Enums"]["coaching_health_subject_type"]
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_checks_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_health_checks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coaching_health_check_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_manager_assignments: {
        Row: {
          coach_id: string
          coaching_org_id: string
          created_at: string
          end_date: string | null
          id: string
          manager_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at: string
        }
        Insert: {
          coach_id: string
          coaching_org_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          manager_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at?: string
        }
        Update: {
          coach_id?: string
          coaching_org_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          manager_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_manager_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaching_coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_manager_assignments_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_manager_assignments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "coaching_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_managers: {
        Row: {
          coaching_org_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["coaching_org_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_managers_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_meeting_prep_items: {
        Row: {
          coaching_meeting_id: string
          created_at: string
          id: string
          prompt: string
          required: boolean
          responded_at: string | null
          responded_by_user_id: string | null
          response: string | null
          response_type: Database["public"]["Enums"]["coaching_prep_response_type"]
          updated_at: string
        }
        Insert: {
          coaching_meeting_id: string
          created_at?: string
          id?: string
          prompt: string
          required?: boolean
          responded_at?: string | null
          responded_by_user_id?: string | null
          response?: string | null
          response_type?: Database["public"]["Enums"]["coaching_prep_response_type"]
          updated_at?: string
        }
        Update: {
          coaching_meeting_id?: string
          created_at?: string
          id?: string
          prompt?: string
          required?: boolean
          responded_at?: string | null
          responded_by_user_id?: string | null
          response?: string | null
          response_type?: Database["public"]["Enums"]["coaching_prep_response_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_meeting_prep_items_coaching_meeting_id_fkey"
            columns: ["coaching_meeting_id"]
            isOneToOne: false
            referencedRelation: "coaching_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_meetings: {
        Row: {
          coaching_engagement_id: string
          created_at: string
          id: string
          meeting_type: Database["public"]["Enums"]["coaching_meeting_type"]
          notes: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["coaching_meeting_status"]
          title: string
          updated_at: string
        }
        Insert: {
          coaching_engagement_id: string
          created_at?: string
          id?: string
          meeting_type: Database["public"]["Enums"]["coaching_meeting_type"]
          notes?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["coaching_meeting_status"]
          title: string
          updated_at?: string
        }
        Update: {
          coaching_engagement_id?: string
          created_at?: string
          id?: string
          meeting_type?: Database["public"]["Enums"]["coaching_meeting_type"]
          notes?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["coaching_meeting_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_meetings_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_dashboard_widgets: {
        Row: {
          coaching_org_id: string
          config_json: Json | null
          created_at: string
          dashboard_type: Database["public"]["Enums"]["coaching_dashboard_type"]
          data_source: string | null
          description: string | null
          id: string
          is_enabled: boolean
          seeded_from_pack_widget_id: string | null
          updated_at: string
          widget_key: string
          widget_order: number
        }
        Insert: {
          coaching_org_id: string
          config_json?: Json | null
          created_at?: string
          dashboard_type: Database["public"]["Enums"]["coaching_dashboard_type"]
          data_source?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          seeded_from_pack_widget_id?: string | null
          updated_at?: string
          widget_key: string
          widget_order?: number
        }
        Update: {
          coaching_org_id?: string
          config_json?: Json | null
          created_at?: string
          dashboard_type?: Database["public"]["Enums"]["coaching_dashboard_type"]
          data_source?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          seeded_from_pack_widget_id?: string | null
          updated_at?: string
          widget_key?: string
          widget_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_dashboard_widgets_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_dashboard_widgets_seeded_from_pack_widget_id_fkey"
            columns: ["seeded_from_pack_widget_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_pack_dashboard_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_engagement_assignments: {
        Row: {
          coach_id: string
          coaching_engagement_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["coaching_assignment_role"]
          status: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at: string
        }
        Insert: {
          coach_id: string
          coaching_engagement_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["coaching_assignment_role"]
          status?: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at?: string
        }
        Update: {
          coach_id?: string
          coaching_engagement_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["coaching_assignment_role"]
          status?: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_engagement_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaching_coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_engagement_assignments_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_engagements: {
        Row: {
          coaching_org_id: string
          created_at: string
          ended_notes: string | null
          ended_reason:
            | Database["public"]["Enums"]["engagement_end_reason"]
            | null
          ends_at: string | null
          id: string
          linkage_type: Database["public"]["Enums"]["engagement_linkage_type"]
          linked_at: string
          linked_by_user_id: string
          member_company_id: string
          program_key_snapshot: string | null
          program_name_snapshot: string | null
          status: Database["public"]["Enums"]["coaching_engagement_status"]
          updated_at: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          ended_notes?: string | null
          ended_reason?:
            | Database["public"]["Enums"]["engagement_end_reason"]
            | null
          ends_at?: string | null
          id?: string
          linkage_type?: Database["public"]["Enums"]["engagement_linkage_type"]
          linked_at?: string
          linked_by_user_id: string
          member_company_id: string
          program_key_snapshot?: string | null
          program_name_snapshot?: string | null
          status?: Database["public"]["Enums"]["coaching_engagement_status"]
          updated_at?: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          ended_notes?: string | null
          ended_reason?:
            | Database["public"]["Enums"]["engagement_end_reason"]
            | null
          ends_at?: string | null
          id?: string
          linkage_type?: Database["public"]["Enums"]["engagement_linkage_type"]
          linked_at?: string
          linked_by_user_id?: string
          member_company_id?: string
          program_key_snapshot?: string | null
          program_name_snapshot?: string | null
          status?: Database["public"]["Enums"]["coaching_engagement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_engagements_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_engagements_member_company_id_fkey"
            columns: ["member_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_group_members: {
        Row: {
          coaching_engagement_id: string
          coaching_group_id: string
          created_at: string
          id: string
          member_company_id: string
          member_user_id: string | null
          status: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at: string
        }
        Insert: {
          coaching_engagement_id: string
          coaching_group_id: string
          created_at?: string
          id?: string
          member_company_id: string
          member_user_id?: string | null
          status?: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at?: string
        }
        Update: {
          coaching_engagement_id?: string
          coaching_group_id?: string
          created_at?: string
          id?: string
          member_company_id?: string
          member_user_id?: string | null
          status?: Database["public"]["Enums"]["manager_assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_group_members_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_group_members_coaching_group_id_fkey"
            columns: ["coaching_group_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_group_members_member_company_id_fkey"
            columns: ["member_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_groups: {
        Row: {
          coach_id: string | null
          coaching_org_id: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["coaching_group_status"]
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          coaching_org_id: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["coaching_group_status"]
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          coaching_org_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["coaching_group_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_groups_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaching_coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_groups_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_memberships: {
        Row: {
          coaching_org_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["coaching_membership_role"]
          status: Database["public"]["Enums"]["coaching_org_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["coaching_membership_role"]
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["coaching_membership_role"]
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_memberships_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
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
      coaching_org_workflow_steps: {
        Row: {
          attached_form_template_key: string | null
          cadence_days: number | null
          created_at: string
          default_assignee: Database["public"]["Enums"]["workflow_default_assignee"]
          description: string | null
          due_offset_days: number | null
          id: string
          is_disabled: boolean
          is_optional: boolean
          org_workflow_id: string
          source_pack_step_id: string | null
          step_order: number
          step_type: Database["public"]["Enums"]["coaching_step_type"]
          title: string
          updated_at: string
        }
        Insert: {
          attached_form_template_key?: string | null
          cadence_days?: number | null
          created_at?: string
          default_assignee?: Database["public"]["Enums"]["workflow_default_assignee"]
          description?: string | null
          due_offset_days?: number | null
          id?: string
          is_disabled?: boolean
          is_optional?: boolean
          org_workflow_id: string
          source_pack_step_id?: string | null
          step_order?: number
          step_type: Database["public"]["Enums"]["coaching_step_type"]
          title: string
          updated_at?: string
        }
        Update: {
          attached_form_template_key?: string | null
          cadence_days?: number | null
          created_at?: string
          default_assignee?: Database["public"]["Enums"]["workflow_default_assignee"]
          description?: string | null
          due_offset_days?: number | null
          id?: string
          is_disabled?: boolean
          is_optional?: boolean
          org_workflow_id?: string
          source_pack_step_id?: string | null
          step_order?: number
          step_type?: Database["public"]["Enums"]["coaching_step_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_workflow_steps_org_workflow_id_fkey"
            columns: ["org_workflow_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_workflow_steps_source_pack_step_id_fkey"
            columns: ["source_pack_step_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_pack_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_org_workflows: {
        Row: {
          coaching_org_id: string
          created_at: string
          description: string | null
          editable_fields: Json
          id: string
          is_active: boolean
          is_locked: boolean
          name: string
          source_pack_key: string
          source_pack_template_id: string | null
          updated_at: string
          workflow_type: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          description?: string | null
          editable_fields?: Json
          id?: string
          is_active?: boolean
          is_locked?: boolean
          name: string
          source_pack_key: string
          source_pack_template_id?: string | null
          updated_at?: string
          workflow_type: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          description?: string | null
          editable_fields?: Json
          id?: string
          is_active?: boolean
          is_locked?: boolean
          name?: string
          source_pack_key?: string
          source_pack_template_id?: string | null
          updated_at?: string
          workflow_type?: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "coaching_org_workflows_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_workflows_source_pack_template_id_fkey"
            columns: ["source_pack_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_pack_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_orgs: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          program_key: string
          program_name: string
          program_version: string | null
          seeded_at: string | null
          seeded_from_pack_id: string | null
          slug: string | null
          status: Database["public"]["Enums"]["coaching_org_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          program_key?: string
          program_name?: string
          program_version?: string | null
          seeded_at?: string | null
          seeded_from_pack_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          program_key?: string
          program_name?: string
          program_version?: string | null
          seeded_at?: string | null
          seeded_from_pack_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["coaching_org_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_orgs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_coaching_orgs_seeded_from_pack"
            columns: ["seeded_from_pack_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_permission_templates: {
        Row: {
          coaching_org_id: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["template_status"]
          template: Json
          updated_at: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["template_status"]
          template?: Json
          updated_at?: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["template_status"]
          template?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_permission_templates_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_plans: {
        Row: {
          coaching_engagement_id: string
          created_at: string
          created_by_user_id: string | null
          description: string | null
          end_date: string | null
          id: string
          member_company_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["coaching_plan_status"]
          title: string
          updated_at: string
        }
        Insert: {
          coaching_engagement_id: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          member_company_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["coaching_plan_status"]
          title: string
          updated_at?: string
        }
        Update: {
          coaching_engagement_id?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          member_company_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["coaching_plan_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_plans_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_plans_member_company_id_fkey"
            columns: ["member_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_program_pack_dashboard_widgets: {
        Row: {
          config_json: Json | null
          created_at: string
          dashboard_type: Database["public"]["Enums"]["coaching_dashboard_type"]
          data_source: string | null
          description: string | null
          id: string
          pack_id: string
          updated_at: string
          widget_key: string
          widget_order: number
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          dashboard_type: Database["public"]["Enums"]["coaching_dashboard_type"]
          data_source?: string | null
          description?: string | null
          id?: string
          pack_id: string
          updated_at?: string
          widget_key: string
          widget_order?: number
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          dashboard_type?: Database["public"]["Enums"]["coaching_dashboard_type"]
          data_source?: string | null
          description?: string | null
          id?: string
          pack_id?: string
          updated_at?: string
          widget_key?: string
          widget_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "coaching_program_pack_dashboard_widgets_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_program_pack_terms: {
        Row: {
          created_at: string
          id: string
          pack_id: string
          term_key: string
          term_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pack_id: string
          term_key: string
          term_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pack_id?: string
          term_key?: string
          term_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_program_pack_terms_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_program_pack_workflow_steps: {
        Row: {
          created_at: string
          default_assignee:
            | Database["public"]["Enums"]["workflow_default_assignee"]
            | null
          description: string | null
          due_offset_days: number | null
          id: string
          pack_workflow_template_id: string
          schedule_offset_days: number | null
          step_order: number
          step_type: Database["public"]["Enums"]["coaching_step_type"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_assignee?:
            | Database["public"]["Enums"]["workflow_default_assignee"]
            | null
          description?: string | null
          due_offset_days?: number | null
          id?: string
          pack_workflow_template_id: string
          schedule_offset_days?: number | null
          step_order: number
          step_type: Database["public"]["Enums"]["coaching_step_type"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_assignee?:
            | Database["public"]["Enums"]["workflow_default_assignee"]
            | null
          description?: string | null
          due_offset_days?: number | null
          id?: string
          pack_workflow_template_id?: string
          schedule_offset_days?: number | null
          step_order?: number
          step_type?: Database["public"]["Enums"]["coaching_step_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_program_pack_workflow_s_pack_workflow_template_id_fkey"
            columns: ["pack_workflow_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_pack_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_program_pack_workflow_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          pack_id: string
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          workflow_type: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pack_id: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          workflow_type: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pack_id?: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          workflow_type?: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "coaching_program_pack_workflow_templates_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_program_packs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      coaching_resource_assignments: {
        Row: {
          assignable_type: Database["public"]["Enums"]["coaching_assignable_type"]
          assigned_at: string
          assigned_by_user_id: string
          coaching_engagement_id: string | null
          coaching_org_id: string
          collection_id: string | null
          completed_at: string | null
          created_at: string
          deprecated_at: string | null
          due_at: string | null
          id: string
          member_user_id: string | null
          resource_id: string | null
          status: Database["public"]["Enums"]["coaching_assignment_status"]
          title_override: string | null
          updated_at: string
        }
        Insert: {
          assignable_type: Database["public"]["Enums"]["coaching_assignable_type"]
          assigned_at?: string
          assigned_by_user_id: string
          coaching_engagement_id?: string | null
          coaching_org_id: string
          collection_id?: string | null
          completed_at?: string | null
          created_at?: string
          deprecated_at?: string | null
          due_at?: string | null
          id?: string
          member_user_id?: string | null
          resource_id?: string | null
          status?: Database["public"]["Enums"]["coaching_assignment_status"]
          title_override?: string | null
          updated_at?: string
        }
        Update: {
          assignable_type?: Database["public"]["Enums"]["coaching_assignable_type"]
          assigned_at?: string
          assigned_by_user_id?: string
          coaching_engagement_id?: string | null
          coaching_org_id?: string
          collection_id?: string | null
          completed_at?: string | null
          created_at?: string
          deprecated_at?: string | null
          due_at?: string | null
          id?: string
          member_user_id?: string | null
          resource_id?: string | null
          status?: Database["public"]["Enums"]["coaching_assignment_status"]
          title_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_resource_assignments_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_resource_assignments_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_resource_assignments_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "coaching_resource_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "coaching_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_resource_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          item_order: number
          resource_id: string
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          item_order: number
          resource_id: string
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          item_order?: number
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_resource_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "coaching_resource_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_resource_collection_items_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "coaching_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_resource_collections: {
        Row: {
          coaching_org_id: string
          created_at: string
          deprecated_at: string | null
          description: string | null
          id: string
          name: string
          program_key: string | null
          status: Database["public"]["Enums"]["coaching_resource_status"]
          updated_at: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          name: string
          program_key?: string | null
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          updated_at?: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          name?: string
          program_key?: string | null
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_resource_collections_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_resource_progress: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          deprecated_at: string | null
          id: string
          status: Database["public"]["Enums"]["coaching_progress_status"]
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          deprecated_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["coaching_progress_status"]
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          deprecated_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["coaching_progress_status"]
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_resource_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "coaching_resource_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_resources: {
        Row: {
          coaching_org_id: string
          created_at: string
          created_by_user_id: string
          deprecated_at: string | null
          description: string | null
          file_id: string | null
          id: string
          program_key: string | null
          resource_type: Database["public"]["Enums"]["coaching_resource_type"]
          status: Database["public"]["Enums"]["coaching_resource_status"]
          tags: string[] | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          created_by_user_id: string
          deprecated_at?: string | null
          description?: string | null
          file_id?: string | null
          id?: string
          program_key?: string | null
          resource_type: Database["public"]["Enums"]["coaching_resource_type"]
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          created_by_user_id?: string
          deprecated_at?: string | null
          description?: string | null
          file_id?: string | null
          id?: string
          program_key?: string | null
          resource_type?: Database["public"]["Enums"]["coaching_resource_type"]
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_resources_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_scorecard_metrics: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          metric_label: string | null
          scorecard_id: string
          source: Database["public"]["Enums"]["scorecard_metric_source"]
          subject_type: Database["public"]["Enums"]["scorecard_subject_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          metric_label?: string | null
          scorecard_id: string
          source?: Database["public"]["Enums"]["scorecard_metric_source"]
          subject_type?: Database["public"]["Enums"]["scorecard_subject_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          metric_label?: string | null
          scorecard_id?: string
          source?: Database["public"]["Enums"]["scorecard_metric_source"]
          subject_type?: Database["public"]["Enums"]["scorecard_subject_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_scorecard_metrics_scorecard_id_fkey"
            columns: ["scorecard_id"]
            isOneToOne: false
            referencedRelation: "coaching_scorecards"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_scorecards: {
        Row: {
          coaching_org_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_scorecards_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          agenda_rte: string | null
          client_company_id: string
          coach_company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          notes_rte: string | null
          playbook_id: string | null
          scheduled_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda_rte?: string | null
          client_company_id: string
          coach_company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes_rte?: string | null
          playbook_id?: string | null
          scheduled_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda_rte?: string | null
          client_company_id?: string
          coach_company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes_rte?: string | null
          playbook_id?: string | null
          scheduled_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "framework_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_template_resources: {
        Row: {
          coaching_org_id: string
          created_at: string
          created_by_user_id: string
          description: string | null
          file_id: string | null
          id: string
          program_key: string | null
          status: Database["public"]["Enums"]["coaching_resource_status"]
          tags: string[] | null
          template_type: Database["public"]["Enums"]["coaching_template_type"]
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          file_id?: string | null
          id?: string
          program_key?: string | null
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          tags?: string[] | null
          template_type: Database["public"]["Enums"]["coaching_template_type"]
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          file_id?: string | null
          id?: string
          program_key?: string | null
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          tags?: string[] | null
          template_type?: Database["public"]["Enums"]["coaching_template_type"]
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_template_resources_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_template_task_sets: {
        Row: {
          coaching_org_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          program_key: string | null
          status: Database["public"]["Enums"]["coaching_resource_status"]
          updated_at: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          program_key?: string | null
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          updated_at?: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          program_key?: string | null
          status?: Database["public"]["Enums"]["coaching_resource_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_template_task_sets_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_template_tasks: {
        Row: {
          created_at: string
          default_assignee:
            | Database["public"]["Enums"]["coaching_default_assignee"]
            | null
          description: string | null
          due_offset_days: number | null
          id: string
          task_order: number | null
          task_set_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_assignee?:
            | Database["public"]["Enums"]["coaching_default_assignee"]
            | null
          description?: string | null
          due_offset_days?: number | null
          id?: string
          task_order?: number | null
          task_set_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_assignee?:
            | Database["public"]["Enums"]["coaching_default_assignee"]
            | null
          description?: string | null
          due_offset_days?: number | null
          id?: string
          task_order?: number | null
          task_set_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_template_tasks_task_set_id_fkey"
            columns: ["task_set_id"]
            isOneToOne: false
            referencedRelation: "coaching_template_task_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_terms: {
        Row: {
          coaching_org_id: string
          created_at: string
          id: string
          term_key: string
          term_value: string
          updated_at: string
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          id?: string
          term_key: string
          term_value: string
          updated_at?: string
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          id?: string
          term_key?: string
          term_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_terms_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_workflow_assignments: {
        Row: {
          cadence: Database["public"]["Enums"]["workflow_cadence"]
          coaching_engagement_id: string
          coaching_workflow_template_id: string
          created_at: string
          created_by_user_id: string
          id: string
          last_run_at: string | null
          name_override: string | null
          next_run_at: string | null
          start_on: string
          status: Database["public"]["Enums"]["workflow_assignment_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          cadence: Database["public"]["Enums"]["workflow_cadence"]
          coaching_engagement_id: string
          coaching_workflow_template_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          last_run_at?: string | null
          name_override?: string | null
          next_run_at?: string | null
          start_on: string
          status?: Database["public"]["Enums"]["workflow_assignment_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          cadence?: Database["public"]["Enums"]["workflow_cadence"]
          coaching_engagement_id?: string
          coaching_workflow_template_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          last_run_at?: string | null
          name_override?: string | null
          next_run_at?: string | null
          start_on?: string
          status?: Database["public"]["Enums"]["workflow_assignment_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_workflow_assignments_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_workflow_assignments_coaching_workflow_template_i_fkey"
            columns: ["coaching_workflow_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_workflow_run_items: {
        Row: {
          coaching_workflow_run_id: string
          created_at: string
          created_entity_id: string
          created_entity_table: string
          id: string
          item_type: Database["public"]["Enums"]["workflow_run_item_type"]
          status: Database["public"]["Enums"]["workflow_run_item_status"]
          step_id: string
          updated_at: string
        }
        Insert: {
          coaching_workflow_run_id: string
          created_at?: string
          created_entity_id: string
          created_entity_table: string
          id?: string
          item_type: Database["public"]["Enums"]["workflow_run_item_type"]
          status?: Database["public"]["Enums"]["workflow_run_item_status"]
          step_id: string
          updated_at?: string
        }
        Update: {
          coaching_workflow_run_id?: string
          created_at?: string
          created_entity_id?: string
          created_entity_table?: string
          id?: string
          item_type?: Database["public"]["Enums"]["workflow_run_item_type"]
          status?: Database["public"]["Enums"]["workflow_run_item_status"]
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_workflow_run_items_coaching_workflow_run_id_fkey"
            columns: ["coaching_workflow_run_id"]
            isOneToOne: false
            referencedRelation: "coaching_workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_workflow_run_items_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "coaching_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_workflow_runs: {
        Row: {
          coaching_workflow_assignment_id: string
          created_at: string
          id: string
          run_for_period_end: string | null
          run_for_period_start: string
          scheduled_run_at: string
          status: Database["public"]["Enums"]["workflow_run_status"]
          updated_at: string
        }
        Insert: {
          coaching_workflow_assignment_id: string
          created_at?: string
          id?: string
          run_for_period_end?: string | null
          run_for_period_start: string
          scheduled_run_at: string
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
        }
        Update: {
          coaching_workflow_assignment_id?: string
          created_at?: string
          id?: string
          run_for_period_end?: string | null
          run_for_period_start?: string
          scheduled_run_at?: string
          status?: Database["public"]["Enums"]["workflow_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_workflow_runs_coaching_workflow_assignment_id_fkey"
            columns: ["coaching_workflow_assignment_id"]
            isOneToOne: false
            referencedRelation: "coaching_workflow_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_workflow_steps: {
        Row: {
          coaching_workflow_template_id: string
          config_json: Json | null
          created_at: string
          default_assignee:
            | Database["public"]["Enums"]["workflow_default_assignee"]
            | null
          description: string | null
          due_offset_days: number | null
          id: string
          schedule_offset_days: number | null
          seeded_from_pack_step_id: string | null
          step_order: number
          step_type: Database["public"]["Enums"]["coaching_step_type"]
          title: string
          updated_at: string
        }
        Insert: {
          coaching_workflow_template_id: string
          config_json?: Json | null
          created_at?: string
          default_assignee?:
            | Database["public"]["Enums"]["workflow_default_assignee"]
            | null
          description?: string | null
          due_offset_days?: number | null
          id?: string
          schedule_offset_days?: number | null
          seeded_from_pack_step_id?: string | null
          step_order: number
          step_type: Database["public"]["Enums"]["coaching_step_type"]
          title: string
          updated_at?: string
        }
        Update: {
          coaching_workflow_template_id?: string
          config_json?: Json | null
          created_at?: string
          default_assignee?:
            | Database["public"]["Enums"]["workflow_default_assignee"]
            | null
          description?: string | null
          due_offset_days?: number | null
          id?: string
          schedule_offset_days?: number | null
          seeded_from_pack_step_id?: string | null
          step_order?: number
          step_type?: Database["public"]["Enums"]["coaching_step_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_workflow_steps_coaching_workflow_template_id_fkey"
            columns: ["coaching_workflow_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_steps_pack_step"
            columns: ["seeded_from_pack_step_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_pack_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_workflow_templates: {
        Row: {
          coaching_org_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          seeded_from_pack_workflow_template_id: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          workflow_type: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Insert: {
          coaching_org_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          seeded_from_pack_workflow_template_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          workflow_type: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Update: {
          coaching_org_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          seeded_from_pack_workflow_template_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          workflow_type?: Database["public"]["Enums"]["coaching_workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "coaching_workflow_templates_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_templates_pack_template"
            columns: ["seeded_from_pack_workflow_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_program_pack_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_type: Database["public"]["Enums"]["company_type_enum"]
          created_at: string
          created_by: string | null
          created_by_coaching_org_id: string | null
          description: string | null
          finance_mode: Database["public"]["Enums"]["finance_mode"] | null
          id: string
          logo_url: string | null
          name: string
          onboarding_source:
            | Database["public"]["Enums"]["company_onboarding_source"]
            | null
          primary_color: string | null
          site_id: string
          status: Database["public"]["Enums"]["company_status"]
        }
        Insert: {
          company_type?: Database["public"]["Enums"]["company_type_enum"]
          created_at?: string
          created_by?: string | null
          created_by_coaching_org_id?: string | null
          description?: string | null
          finance_mode?: Database["public"]["Enums"]["finance_mode"] | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_source?:
            | Database["public"]["Enums"]["company_onboarding_source"]
            | null
          primary_color?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["company_status"]
        }
        Update: {
          company_type?: Database["public"]["Enums"]["company_type_enum"]
          created_at?: string
          created_by?: string | null
          created_by_coaching_org_id?: string | null
          description?: string | null
          finance_mode?: Database["public"]["Enums"]["finance_mode"] | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_source?:
            | Database["public"]["Enums"]["company_onboarding_source"]
            | null
          primary_color?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["company_status"]
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_coaching_org_id_fkey"
            columns: ["created_by_coaching_org_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      company_backups: {
        Row: {
          backup_type: string
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_size_bytes: number | null
          id: string
          metadata_json: Json
          restored_at: string | null
          restored_by: string | null
          schema_version: number
          status: string
          storage_path: string | null
        }
        Insert: {
          backup_type: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata_json?: Json
          restored_at?: string | null
          restored_by?: string | null
          schema_version?: number
          status?: string
          storage_path?: string | null
        }
        Update: {
          backup_type?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata_json?: Json
          restored_at?: string | null
          restored_by?: string | null
          schema_version?: number
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_backups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      company_coach_attribution: {
        Row: {
          attributed_at: string
          attribution_type: string
          coach_company_id: string
          coach_plan_id: string | null
          company_id: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          referral_code: string | null
        }
        Insert: {
          attributed_at?: string
          attribution_type?: string
          coach_company_id: string
          coach_plan_id?: string | null
          company_id: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          referral_code?: string | null
        }
        Update: {
          attributed_at?: string
          attribution_type?: string
          coach_company_id?: string
          coach_plan_id?: string | null
          company_id?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          referral_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_coach_attribution_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_coach_attribution_coach_plan_id_fkey"
            columns: ["coach_plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_coach_attribution_company_id_fkey"
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
      company_integrations: {
        Row: {
          company_id: string
          config_json: Json
          created_at: string
          id: string
          is_enabled: boolean
          provider_key: string
          secret_configured_at: string | null
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          config_json?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider_key: string
          secret_configured_at?: string | null
          secret_ref?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          config_json?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider_key?: string
          secret_configured_at?: string | null
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
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
          applied_preset_id: string | null
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
          applied_preset_id?: string | null
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
          applied_preset_id?: string | null
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
            foreignKeyName: "company_onboarding_state_applied_preset_id_fkey"
            columns: ["applied_preset_id"]
            isOneToOne: false
            referencedRelation: "onboarding_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_onboarding_state_coach_engagement_id_fkey"
            columns: ["coach_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_onboarding_state_coach_engagement_id_fkey"
            columns: ["coach_engagement_id"]
            isOneToOne: false
            referencedRelation: "v_pending_coaching_invitations"
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
          grace_ends_at: string | null
          grace_period_days: number | null
          id: string
          metadata: Json | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          plan_type: Database["public"]["Enums"]["plan_type"]
          provisioned_by_coaching_org_id: string | null
          source: Database["public"]["Enums"]["subscription_source"] | null
          started_at: string
          status: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          grace_ends_at?: string | null
          grace_period_days?: number | null
          id?: string
          metadata?: Json | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          plan_type: Database["public"]["Enums"]["plan_type"]
          provisioned_by_coaching_org_id?: string | null
          source?: Database["public"]["Enums"]["subscription_source"] | null
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          grace_ends_at?: string | null
          grace_period_days?: number | null
          id?: string
          metadata?: Json | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          plan_type?: Database["public"]["Enums"]["plan_type"]
          provisioned_by_coaching_org_id?: string | null
          source?: Database["public"]["Enums"]["subscription_source"] | null
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
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
          entity_kind: Database["public"]["Enums"]["entity_kind"]
          external_contact_id: string | null
          id: string
          is_active: boolean
          is_sample: boolean
          lifecycle_status: string
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
          type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          entity_kind?: Database["public"]["Enums"]["entity_kind"]
          external_contact_id?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean
          lifecycle_status?: string
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
          type?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          entity_kind?: Database["public"]["Enums"]["entity_kind"]
          external_contact_id?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean
          lifecycle_status?: string
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
          {
            foreignKeyName: "crm_clients_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_clients_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          role: Database["public"]["Enums"]["department_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          role?: Database["public"]["Enums"]["department_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          role?: Database["public"]["Enums"]["department_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          department_id: string | null
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
          department_id?: string | null
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
          department_id?: string | null
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
            foreignKeyName: "documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          is_sample: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_required: boolean
          sample_batch_id: string | null
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
          is_sample?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_required?: boolean
          sample_batch_id?: string | null
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
          is_sample?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_required?: boolean
          sample_batch_id?: string | null
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
          {
            foreignKeyName: "donations_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
          is_sample: boolean
          name: string
          sample_batch_id: string | null
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
          is_sample?: boolean
          name: string
          sample_batch_id?: string | null
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
          is_sample?: boolean
          name?: string
          sample_batch_id?: string | null
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
          {
            foreignKeyName: "donor_campaigns_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
          is_sample: boolean
          last_donation_date: string | null
          lifetime_giving_amount: number
          notes: string | null
          sample_batch_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm_client_id: string
          donor_status?: Database["public"]["Enums"]["donor_status"]
          first_donation_date?: string | null
          id?: string
          is_sample?: boolean
          last_donation_date?: string | null
          lifetime_giving_amount?: number
          notes?: string | null
          sample_batch_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm_client_id?: string
          donor_status?: Database["public"]["Enums"]["donor_status"]
          first_donation_date?: string | null
          id?: string
          is_sample?: boolean
          last_donation_date?: string | null
          lifetime_giving_amount?: number
          notes?: string | null
          sample_batch_id?: string | null
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
          {
            foreignKeyName: "donor_profiles_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
      entity_contacts: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_contact_type"]
          id: string
          is_primary: boolean
          role_title: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_contact_type"]
          id?: string
          is_primary?: boolean
          role_title?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_contact_type"]
          id?: string
          is_primary?: boolean
          role_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entity_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "external_contacts"
            referencedColumns: ["id"]
          },
        ]
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
      feedback_items: {
        Row: {
          company_id: string
          created_at: string
          feedback_type: string
          id: string
          message: string
          module_key: string | null
          page_path: string | null
          severity: string
          status: string
          triage_notes: string | null
          triaged_at: string | null
          triaged_by: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          feedback_type?: string
          id?: string
          message: string
          module_key?: string | null
          page_path?: string | null
          severity?: string
          status?: string
          triage_notes?: string | null
          triaged_at?: string | null
          triaged_by?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          module_key?: string | null
          page_path?: string | null
          severity?: string
          status?: string
          triage_notes?: string | null
          triaged_at?: string | null
          triaged_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          account_number: string | null
          account_subtype: string | null
          account_type: string
          company_id: string
          created_at: string
          created_by: string | null
          current_balance: number
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          normal_balance: string
          opening_balance: number
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_subtype?: string | null
          account_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          normal_balance: string
          opening_balance?: number
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_subtype?: string | null
          account_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          normal_balance?: string
          opening_balance?: number
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_category_mappings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          mapped_account_id: string | null
          mapped_category: string
          original_name: string
          statement_type: Database["public"]["Enums"]["financial_import_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          mapped_account_id?: string | null
          mapped_category: string
          original_name: string
          statement_type: Database["public"]["Enums"]["financial_import_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          mapped_account_id?: string | null
          mapped_category?: string
          original_name?: string
          statement_type?: Database["public"]["Enums"]["financial_import_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_category_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_category_mappings_mapped_account_id_fkey"
            columns: ["mapped_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          category_type: string
          company_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_type: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_type?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_import_batches: {
        Row: {
          company_id: string
          created_at: string
          created_by_user_id: string | null
          error_message: string | null
          id: string
          import_type: string
          period_end: string
          period_start: string
          row_count: number | null
          source_filename: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_user_id?: string | null
          error_message?: string | null
          id?: string
          import_type: string
          period_end: string
          period_start: string
          row_count?: number | null
          source_filename?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_user_id?: string | null
          error_message?: string | null
          id?: string
          import_type?: string
          period_end?: string
          period_start?: string
          row_count?: number | null
          source_filename?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_import_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_imports: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          error_message: string | null
          file_name: string | null
          id: string
          import_type: Database["public"]["Enums"]["financial_import_type"]
          mapping_config: Json | null
          period_end: string
          period_start: string
          row_count: number | null
          status: Database["public"]["Enums"]["financial_import_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          import_type: Database["public"]["Enums"]["financial_import_type"]
          mapping_config?: Json | null
          period_end: string
          period_start: string
          row_count?: number | null
          status?: Database["public"]["Enums"]["financial_import_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          import_type?: Database["public"]["Enums"]["financial_import_type"]
          mapping_config?: Json | null
          period_end?: string
          period_start?: string
          row_count?: number | null
          status?: Database["public"]["Enums"]["financial_import_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_statement_lines: {
        Row: {
          amount: number
          batch_id: string
          company_id: string
          created_at: string
          id: string
          mapped_category_id: string | null
          original_category: string
          period_end: string
          period_start: string
          statement_type: string
        }
        Insert: {
          amount?: number
          batch_id: string
          company_id: string
          created_at?: string
          id?: string
          mapped_category_id?: string | null
          original_category: string
          period_end: string
          period_start: string
          statement_type: string
        }
        Update: {
          amount?: number
          batch_id?: string
          company_id?: string
          created_at?: string
          id?: string
          mapped_category_id?: string | null
          original_category?: string
          period_end?: string
          period_start?: string
          statement_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_statement_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "financial_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statement_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statement_lines_mapped_category_id_fkey"
            columns: ["mapped_category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_statement_rows: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          entity_name: string | null
          id: string
          import_id: string
          mapped_account_id: string | null
          mapped_category: string | null
          metadata: Json | null
          original_category: string
          original_subcategory: string | null
          period_end: string
          period_start: string
          statement_type: Database["public"]["Enums"]["financial_import_type"]
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          entity_name?: string | null
          id?: string
          import_id: string
          mapped_account_id?: string | null
          mapped_category?: string | null
          metadata?: Json | null
          original_category: string
          original_subcategory?: string | null
          period_end: string
          period_start: string
          statement_type: Database["public"]["Enums"]["financial_import_type"]
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          entity_name?: string | null
          id?: string
          import_id?: string
          mapped_account_id?: string | null
          mapped_category?: string | null
          metadata?: Json | null
          original_category?: string
          original_subcategory?: string | null
          period_end?: string
          period_start?: string
          statement_type?: Database["public"]["Enums"]["financial_import_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_statement_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statement_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "financial_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_statement_rows_mapped_account_id_fkey"
            columns: ["mapped_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
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
          department_id: string | null
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
          department_id?: string | null
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
          department_id?: string | null
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
          {
            foreignKeyName: "forms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      framework_finance_playbook_items: {
        Row: {
          condition_key: string
          created_at: string
          description: string | null
          framework_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          condition_key: string
          created_at?: string
          description?: string | null
          framework_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          condition_key?: string
          created_at?: string
          description?: string | null
          framework_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_finance_playbook_items_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_finance_targets: {
        Row: {
          company_id: string
          created_at: string
          framework_id: string
          id: string
          targets_json: Json
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          framework_id: string
          id?: string
          targets_json?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          framework_id?: string
          id?: string
          targets_json?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "framework_finance_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_finance_targets_framework_id_fkey"
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
      framework_health_scores: {
        Row: {
          breakdown_json: Json
          calculated_at: string
          company_id: string
          created_at: string
          framework_id: string
          id: string
          score: number
          status: string
        }
        Insert: {
          breakdown_json?: Json
          calculated_at?: string
          company_id: string
          created_at?: string
          framework_id: string
          id?: string
          score: number
          status: string
        }
        Update: {
          breakdown_json?: Json
          calculated_at?: string
          company_id?: string
          created_at?: string
          framework_id?: string
          id?: string
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_health_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_health_scores_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_playbooks: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          framework_id: string
          id: string
          name: string
          recommended_actions_json: Json
          sort_order: number
          trigger_conditions_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          framework_id: string
          id?: string
          name: string
          recommended_actions_json?: Json
          sort_order?: number
          trigger_conditions_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          framework_id?: string
          id?: string
          name?: string
          recommended_actions_json?: Json
          sort_order?: number
          trigger_conditions_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_playbooks_framework_id_fkey"
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
      in_app_notifications: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled_platform_wide: boolean
          key: string
          name: string
          scope_supported: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled_platform_wide?: boolean
          key: string
          name: string
          scope_supported: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled_platform_wide?: boolean
          key?: string
          name?: string
          scope_supported?: string
        }
        Relationships: []
      }
      integration_secrets: {
        Row: {
          created_at: string
          encrypted_value: string
          id: string
          provider_key: string
          scope: string
          scope_id: string
          secret_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          id?: string
          provider_key: string
          scope: string
          scope_id: string
          secret_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          id?: string
          provider_key?: string
          scope?: string
          scope_id?: string
          secret_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_lines: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          line_order: number
          quantity: number
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          line_order?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          line_order?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          archived_at: string | null
          balance_due: number
          company_id: string
          created_at: string
          created_by: string | null
          crm_client_id: string | null
          currency: string
          due_date: string | null
          export_status: string
          id: string
          invoice_number: string
          is_sample: boolean
          issue_date: string
          journal_entry_id: string | null
          notes: string | null
          sample_batch_id: string | null
          status: string
          subtotal_amount: number
          tags: string[] | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          balance_due?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          currency?: string
          due_date?: string | null
          export_status?: string
          id?: string
          invoice_number: string
          is_sample?: boolean
          issue_date?: string
          journal_entry_id?: string | null
          notes?: string | null
          sample_batch_id?: string | null
          status?: string
          subtotal_amount?: number
          tags?: string[] | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          balance_due?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          currency?: string
          due_date?: string | null
          export_status?: string
          id?: string
          invoice_number?: string
          is_sample?: boolean
          issue_date?: string
          journal_entry_id?: string | null
          notes?: string | null
          sample_batch_id?: string | null
          status?: string
          subtotal_amount?: number
          tags?: string[] | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_crm_client_id_fkey"
            columns: ["crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          entry_number: string
          id: string
          is_balanced: boolean | null
          is_sample: boolean
          memo: string | null
          posted_at: string | null
          posted_by: string | null
          posting_date: string | null
          reference_id: string | null
          reference_type: string | null
          sample_batch_id: string | null
          status: Database["public"]["Enums"]["journal_entry_status"]
          total_credit: number
          total_debit: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_date: string
          entry_number: string
          id?: string
          is_balanced?: boolean | null
          is_sample?: boolean
          memo?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sample_batch_id?: string | null
          status?: Database["public"]["Enums"]["journal_entry_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          is_balanced?: boolean | null
          is_sample?: boolean
          memo?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          reference_id?: string | null
          reference_type?: string | null
          sample_batch_id?: string | null
          status?: Database["public"]["Enums"]["journal_entry_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit_amount: number
          debit_amount: number
          description: string | null
          id: string
          journal_entry_id: string
          line_order: number
        }
        Insert: {
          account_id: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_order?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
      ledger_postings: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          credit_amount: number
          debit_amount: number
          id: string
          memo: string | null
          posting_date: string
          source_id: string
          source_type: string
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          id?: string
          memo?: string | null
          posting_date: string
          source_id: string
          source_type: string
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          id?: string
          memo?: string | null
          posting_date?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_postings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          is_sample: boolean
          sample_batch_id: string | null
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
          is_sample?: boolean
          sample_batch_id?: string | null
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
          is_sample?: boolean
          sample_batch_id?: string | null
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
          {
            foreignKeyName: "lms_courses_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
          can_access_finance: boolean
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
          can_access_finance?: boolean
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
          can_access_finance?: boolean
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
          coaching_engagement_id: string | null
          color: string | null
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          folder_id: string | null
          id: string
          is_pinned: boolean
          is_sample: boolean
          project_id: string | null
          sample_batch_id: string | null
          status: string
          tags: Json
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          coaching_engagement_id?: string | null
          color?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean
          is_sample?: boolean
          project_id?: string | null
          sample_batch_id?: string | null
          status?: string
          tags?: Json
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          coaching_engagement_id?: string | null
          color?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          folder_id?: string | null
          id?: string
          is_pinned?: boolean
          is_sample?: boolean
          project_id?: string | null
          sample_batch_id?: string | null
          status?: string
          tags?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          {
            foreignKeyName: "notes_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          run_at: string
          status: Database["public"]["Enums"]["notification_job_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          run_at: string
          status?: Database["public"]["Enums"]["notification_job_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          run_at?: string
          status?: Database["public"]["Enums"]["notification_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string | null
          created_at: string
          due_at: string | null
          id: string
          link: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          link?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          link?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_presets: {
        Row: {
          config_json: Json
          created_at: string
          description: string | null
          framework_id: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          target_audience: string | null
        }
        Insert: {
          config_json?: Json
          created_at?: string
          description?: string | null
          framework_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          target_audience?: string | null
        }
        Update: {
          config_json?: Json
          created_at?: string
          description?: string | null
          framework_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_presets_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      open_ap_items: {
        Row: {
          amount_due: number
          batch_id: string
          bill_number: string | null
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          vendor_name: string
        }
        Insert: {
          amount_due?: number
          batch_id: string
          bill_number?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          vendor_name: string
        }
        Update: {
          amount_due?: number
          batch_id?: string
          bill_number?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_ap_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "financial_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_ap_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      open_ar_items: {
        Row: {
          amount_due: number
          batch_id: string
          company_id: string
          created_at: string
          customer_name: string
          due_date: string | null
          id: string
          invoice_number: string | null
        }
        Insert: {
          amount_due?: number
          batch_id: string
          company_id: string
          created_at?: string
          customer_name: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
        }
        Update: {
          amount_due?: number
          batch_id?: string
          company_id?: string
          created_at?: string
          customer_name?: string
          due_date?: string | null
          id?: string
          invoice_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_ar_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "financial_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_ar_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          crm_client_id: string | null
          currency: string
          export_status: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          currency?: string
          export_status?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          currency?: string
          export_status?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_crm_client_id_fkey"
            columns: ["crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_flags: {
        Row: {
          cohort_name: string | null
          company_id: string
          created_by: string | null
          ended_at: string | null
          id: string
          is_pilot: boolean
          notes: string | null
          started_at: string
        }
        Insert: {
          cohort_name?: string | null
          company_id: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_pilot?: boolean
          notes?: string | null
          started_at?: string
        }
        Update: {
          cohort_name?: string | null
          company_id?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          is_pilot?: boolean
          notes?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
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
      plans: {
        Row: {
          created_at: string
          description: string | null
          entitlements: Json | null
          id: string
          is_default: boolean
          name: string
          plan_type: string
          slug: string
          sort_order: number
          status: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entitlements?: Json | null
          id?: string
          is_default?: boolean
          name: string
          plan_type?: string
          slug: string
          sort_order?: number
          status?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entitlements?: Json | null
          id?: string
          is_default?: boolean
          name?: string
          plan_type?: string
          slug?: string
          sort_order?: number
          status?: string | null
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
          is_sample: boolean
          name: string
          project_id: string
          sample_batch_id: string | null
          sort_order: number
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_sample?: boolean
          name: string
          project_id: string
          sample_batch_id?: string | null
          sort_order?: number
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_sample?: boolean
          name?: string
          project_id?: string
          sample_batch_id?: string | null
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
          {
            foreignKeyName: "project_phases_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
          coaching_engagement_id: string | null
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          emoji: string
          id: string
          is_sample: boolean
          is_template: boolean
          name: string
          owner_user_id: string
          phases: Json
          progress: number
          sample_batch_id: string | null
          settings: Json
          start_date: string | null
          status: string
          template_category: string | null
        }
        Insert: {
          coaching_engagement_id?: string | null
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string
          id?: string
          is_sample?: boolean
          is_template?: boolean
          name: string
          owner_user_id: string
          phases?: Json
          progress?: number
          sample_batch_id?: string | null
          settings?: Json
          start_date?: string | null
          status?: string
          template_category?: string | null
        }
        Update: {
          coaching_engagement_id?: string | null
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          emoji?: string
          id?: string
          is_sample?: boolean
          is_template?: boolean
          name?: string
          owner_user_id?: string
          phases?: Json
          progress?: number
          sample_batch_id?: string | null
          settings?: Json
          start_date?: string | null
          status?: string
          template_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          export_status: string
          id: string
          is_sample: boolean
          payment_method: string | null
          receipt_date: string
          sample_batch_id: string | null
          tags: string[] | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          export_status?: string
          id?: string
          is_sample?: boolean
          payment_method?: string | null
          receipt_date?: string
          sample_batch_id?: string | null
          tags?: string[] | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          export_status?: string
          id?: string
          is_sample?: boolean
          payment_method?: string | null
          receipt_date?: string
          sample_batch_id?: string | null
          tags?: string[] | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoice_lines: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          line_order: number
          quantity: number
          recurring_invoice_id: string
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          line_order?: number
          quantity?: number
          recurring_invoice_id: string
          unit_price?: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          line_order?: number
          quantity?: number
          recurring_invoice_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoice_lines_recurring_invoice_id_fkey"
            columns: ["recurring_invoice_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          crm_client_id: string | null
          currency: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          invoices_generated: number
          is_active: boolean
          last_generated_at: string | null
          next_issue_date: string
          notes: string | null
          payment_terms: number | null
          subtotal_amount: number
          tax_amount: number
          template_name: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          currency?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          invoices_generated?: number
          is_active?: boolean
          last_generated_at?: string | null
          next_issue_date: string
          notes?: string | null
          payment_terms?: number | null
          subtotal_amount?: number
          tax_amount?: number
          template_name: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_client_id?: string | null
          currency?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          invoices_generated?: number
          is_active?: boolean
          last_generated_at?: string | null
          next_issue_date?: string
          notes?: string | null
          payment_terms?: number | null
          subtotal_amount?: number
          tax_amount?: number
          template_name?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_crm_client_id_fkey"
            columns: ["crm_client_id"]
            isOneToOne: false
            referencedRelation: "crm_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_recent_runs: {
        Row: {
          company_id: string
          config_hash: string
          config_json: Json
          created_at: string
          id: string
          last_run_at: string
          report_type: string
          run_count: number
          user_id: string
        }
        Insert: {
          company_id: string
          config_hash: string
          config_json?: Json
          created_at?: string
          id?: string
          last_run_at?: string
          report_type: string
          run_count?: number
          user_id: string
        }
        Update: {
          company_id?: string
          config_hash?: string
          config_json?: Json
          created_at?: string
          id?: string
          last_run_at?: string
          report_type?: string
          run_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_recent_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          created_by: string | null
          expires_at: string
          generated_at: string
          id: string
          report_id: string
          result_json: Json
        }
        Insert: {
          created_by?: string | null
          expires_at?: string
          generated_at?: string
          id?: string
          report_id: string
          result_json?: Json
        }
        Update: {
          created_by?: string | null
          expires_at?: string
          generated_at?: string
          id?: string
          report_id?: string
          result_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_user_defaults: {
        Row: {
          company_id: string
          defaults_json: Json
          id: string
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          defaults_json?: Json
          id?: string
          report_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          defaults_json?: Json
          id?: string
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_user_defaults_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_visibility_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          report_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          report_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          report_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_visibility_roles_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_visibility_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          company_id: string
          config_json: Json
          created_at: string
          description: string | null
          id: string
          is_personal: boolean
          is_sample: boolean
          name: string
          owner_user_id: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          sample_batch_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          company_id: string
          config_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_personal?: boolean
          is_sample?: boolean
          name: string
          owner_user_id?: string | null
          report_type: Database["public"]["Enums"]["report_type"]
          sample_batch_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          company_id?: string
          config_json?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_personal?: boolean
          is_sample?: boolean
          name?: string
          owner_user_id?: string | null
          report_type?: Database["public"]["Enums"]["report_type"]
          sample_batch_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          company_id: string
          content_ref: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_archived: boolean
          resource_type: Database["public"]["Enums"]["resource_type"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content_ref: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content_ref?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          coach_company_id: string | null
          coach_plan_id: string | null
          company_id: string
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
          plan_tier: string
        }
        Insert: {
          coach_company_id?: string | null
          coach_plan_id?: string | null
          company_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          plan_tier: string
        }
        Update: {
          coach_company_id?: string | null
          coach_plan_id?: string | null
          company_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          plan_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_events_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_coach_plan_id_fkey"
            columns: ["coach_plan_id"]
            isOneToOne: false
            referencedRelation: "coach_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_company_id_fkey"
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
          description_rich_text: string | null
          expected_close_date: string | null
          id: string
          is_sample: boolean
          lost_reason: string | null
          name: string
          owner_user_id: string | null
          pipeline_id: string
          sample_batch_id: string | null
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
          description_rich_text?: string | null
          expected_close_date?: string | null
          id?: string
          is_sample?: boolean
          lost_reason?: string | null
          name: string
          owner_user_id?: string | null
          pipeline_id: string
          sample_batch_id?: string | null
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
          description_rich_text?: string | null
          expected_close_date?: string | null
          id?: string
          is_sample?: boolean
          lost_reason?: string | null
          name?: string
          owner_user_id?: string | null
          pipeline_id?: string
          sample_batch_id?: string | null
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
            foreignKeyName: "sales_opportunities_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
      sales_opportunity_comments: {
        Row: {
          author_user_id: string
          body_rich_text: string
          company_id: string
          created_at: string
          id: string
          opportunity_id: string
        }
        Insert: {
          author_user_id: string
          body_rich_text: string
          company_id: string
          created_at?: string
          id?: string
          opportunity_id: string
        }
        Update: {
          author_user_id?: string
          body_rich_text?: string
          company_id?: string
          created_at?: string
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_opportunity_comments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "sales_opportunities"
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
      sample_data_batches: {
        Row: {
          batch_type: string
          company_id: string
          created_at: string
          created_by_user_id: string
          id: string
          removed_at: string | null
        }
        Insert: {
          batch_type: string
          company_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          removed_at?: string | null
        }
        Update: {
          batch_type?: string
          company_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_data_batches_company_id_fkey"
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
      site_integrations: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          is_enabled: boolean
          provider_key: string
          secret_configured_at: string | null
          secret_ref: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider_key: string
          secret_configured_at?: string | null
          secret_ref?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider_key?: string
          secret_configured_at?: string | null
          secret_ref?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_integrations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
      sop_ingestion_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json | null
          id: string
          ingestion_id: string
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ingestion_id: string
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ingestion_id?: string
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_ingestion_audit_logs_ingestion_id_fkey"
            columns: ["ingestion_id"]
            isOneToOne: false
            referencedRelation: "sop_ingestions"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_ingestions: {
        Row: {
          ai_output_json: Json | null
          company_id: string
          created_at: string
          created_by: string
          department_id: string
          id: string
          processed_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_file_name: string | null
          source_file_path: string | null
          source_file_size: number | null
          source_text: string | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_output_json?: Json | null
          company_id: string
          created_at?: string
          created_by: string
          department_id: string
          id?: string
          processed_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
          source_text?: string | null
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_output_json?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string
          department_id?: string
          id?: string
          processed_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_name?: string | null
          source_file_path?: string | null
          source_file_size?: number | null
          source_text?: string | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_ingestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_ingestions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_revisions: {
        Row: {
          change_summary: string | null
          exceptions_notes: string | null
          id: string
          owner_role: string | null
          procedure_steps: Json | null
          purpose: string | null
          related_sop_ids: string[] | null
          review_action: string | null
          revised_at: string
          revised_by: string | null
          scope: string | null
          sop_id: string
          title: string
          tools_systems: string[] | null
          version: number
        }
        Insert: {
          change_summary?: string | null
          exceptions_notes?: string | null
          id?: string
          owner_role?: string | null
          procedure_steps?: Json | null
          purpose?: string | null
          related_sop_ids?: string[] | null
          review_action?: string | null
          revised_at?: string
          revised_by?: string | null
          scope?: string | null
          sop_id: string
          title: string
          tools_systems?: string[] | null
          version: number
        }
        Update: {
          change_summary?: string | null
          exceptions_notes?: string | null
          id?: string
          owner_role?: string | null
          procedure_steps?: Json | null
          purpose?: string | null
          related_sop_ids?: string[] | null
          review_action?: string | null
          revised_at?: string
          revised_by?: string | null
          scope?: string | null
          sop_id?: string
          title?: string
          tools_systems?: string[] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_revisions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          ai_confidence_by_field: Json | null
          ai_confidence_overall: number | null
          ai_generated: boolean | null
          company_id: string
          created_at: string
          created_by: string | null
          created_from_ingestion_id: string | null
          current_version: number
          department_id: string
          exceptions_notes: string | null
          id: string
          is_archived: boolean
          last_reviewed_at: string | null
          next_review_at: string | null
          overdue_reminder_sent_at: string | null
          owner_role: string | null
          procedure_steps: Json | null
          purpose: string | null
          related_sop_ids: string[] | null
          review_reminder_sent_at: string | null
          scope: string | null
          status: string
          tags: string[] | null
          title: string
          tools_systems: string[] | null
          updated_at: string
          visibility: Database["public"]["Enums"]["sop_visibility"]
        }
        Insert: {
          ai_confidence_by_field?: Json | null
          ai_confidence_overall?: number | null
          ai_generated?: boolean | null
          company_id: string
          created_at?: string
          created_by?: string | null
          created_from_ingestion_id?: string | null
          current_version?: number
          department_id: string
          exceptions_notes?: string | null
          id?: string
          is_archived?: boolean
          last_reviewed_at?: string | null
          next_review_at?: string | null
          overdue_reminder_sent_at?: string | null
          owner_role?: string | null
          procedure_steps?: Json | null
          purpose?: string | null
          related_sop_ids?: string[] | null
          review_reminder_sent_at?: string | null
          scope?: string | null
          status?: string
          tags?: string[] | null
          title: string
          tools_systems?: string[] | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["sop_visibility"]
        }
        Update: {
          ai_confidence_by_field?: Json | null
          ai_confidence_overall?: number | null
          ai_generated?: boolean | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_from_ingestion_id?: string | null
          current_version?: number
          department_id?: string
          exceptions_notes?: string | null
          id?: string
          is_archived?: boolean
          last_reviewed_at?: string | null
          next_review_at?: string | null
          overdue_reminder_sent_at?: string | null
          owner_role?: string | null
          procedure_steps?: Json | null
          purpose?: string | null
          related_sop_ids?: string[] | null
          review_reminder_sent_at?: string | null
          scope?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          tools_systems?: string[] | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["sop_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "sops_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_created_from_ingestion_id_fkey"
            columns: ["created_from_ingestion_id"]
            isOneToOne: false
            referencedRelation: "sop_ingestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sops_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          company_id: string
          created_at: string
          created_by_user_id: string | null
          event_type: string
          from_value: string | null
          id: string
          metadata: Json | null
          reason: string | null
          to_value: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by_user_id?: string | null
          event_type: string
          from_value?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_value?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by_user_id?: string | null
          event_type?: string
          from_value?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_tasks: {
        Row: {
          client_company_id: string
          coach_company_id: string
          converted_task_id: string | null
          created_at: string
          created_by: string
          decided_at: string | null
          decided_by_user_id: string | null
          description_rte: string | null
          id: string
          playbook_id: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          suggested_due_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_company_id: string
          coach_company_id: string
          converted_task_id?: string | null
          created_at?: string
          created_by: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          description_rte?: string | null
          id?: string
          playbook_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_due_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_company_id?: string
          coach_company_id?: string
          converted_task_id?: string | null
          created_at?: string
          created_by?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          description_rte?: string | null
          id?: string
          playbook_id?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          suggested_due_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggested_tasks_client_company_id_fkey"
            columns: ["client_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_tasks_coach_company_id_fkey"
            columns: ["coach_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_tasks_converted_task_id_fkey"
            columns: ["converted_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_tasks_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "framework_playbooks"
            referencedColumns: ["id"]
          },
        ]
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
      task_comments: {
        Row: {
          author_user_id: string
          body_rte: string
          company_id: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_user_id: string
          body_rte: string
          company_id: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_user_id?: string
          body_rte?: string
          company_id?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
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
          is_sample: boolean
          name: string
          owner_user_id: string | null
          sample_batch_id: string | null
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
          is_sample?: boolean
          name: string
          owner_user_id?: string | null
          sample_batch_id?: string | null
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
          is_sample?: boolean
          name?: string
          owner_user_id?: string | null
          sample_batch_id?: string | null
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
          {
            foreignKeyName: "task_lists_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
      task_subtasks: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description_rich_text: string | null
          due_date: string | null
          id: string
          parent_task_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description_rich_text?: string | null
          due_date?: string | null
          id?: string
          parent_task_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description_rich_text?: string | null
          due_date?: string | null
          id?: string
          parent_task_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_subtasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
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
          coaching_engagement_id: string | null
          coaching_workflow_template_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json
          department_id: string | null
          description: string | null
          due_date: string | null
          estimated_time: number | null
          id: string
          is_recurrence_exception: boolean | null
          is_recurring_template: boolean
          is_sample: boolean
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
          sample_batch_id: string | null
          status: string
          subtasks: Json
          tags: Json
          title: string
        }
        Insert: {
          assigned_by?: string | null
          attachments?: Json
          category?: Json
          coaching_engagement_id?: string | null
          coaching_workflow_template_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_recurrence_exception?: boolean | null
          is_recurring_template?: boolean
          is_sample?: boolean
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
          sample_batch_id?: string | null
          status?: string
          subtasks?: Json
          tags?: Json
          title: string
        }
        Update: {
          assigned_by?: string | null
          attachments?: Json
          category?: Json
          coaching_engagement_id?: string | null
          coaching_workflow_template_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_recurrence_exception?: boolean | null
          is_recurring_template?: boolean
          is_sample?: boolean
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
          sample_batch_id?: string | null
          status?: string
          subtasks?: Json
          tags?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_coaching_workflow_template_id_fkey"
            columns: ["coaching_workflow_template_id"]
            isOneToOne: false
            referencedRelation: "coaching_workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          {
            foreignKeyName: "tasks_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
      vendors: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          archived_at: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          created_by: string | null
          default_expense_account_id: string | null
          email: string | null
          id: string
          is_active: boolean
          is_sample: boolean
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          sample_batch_id: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          default_expense_account_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          sample_batch_id?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          default_expense_account_id?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_sample?: boolean
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          sample_batch_id?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_default_expense_account_id_fkey"
            columns: ["default_expense_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_sample_batch_id_fkey"
            columns: ["sample_batch_id"]
            isOneToOne: false
            referencedRelation: "sample_data_batches"
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
      wf_form_logic_rules: {
        Row: {
          action: string
          created_at: string
          form_id: string
          id: string
          operator: string
          sort_order: number
          source_field_id: string
          target_field_id: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          form_id: string
          id?: string
          operator: string
          sort_order?: number
          source_field_id: string
          target_field_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          form_id?: string
          id?: string
          operator?: string
          sort_order?: number
          source_field_id?: string
          target_field_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wf_form_logic_rules_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "wf_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_form_logic_rules_source_field_id_fkey"
            columns: ["source_field_id"]
            isOneToOne: false
            referencedRelation: "wf_form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wf_form_logic_rules_target_field_id_fkey"
            columns: ["target_field_id"]
            isOneToOne: false
            referencedRelation: "wf_form_fields"
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
          coaching_engagement_id: string | null
          company_context_id: string | null
          form_id: string
          id: string
          status: Database["public"]["Enums"]["wf_submission_status"]
          submitted_at: string
          submitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          coaching_engagement_id?: string | null
          company_context_id?: string | null
          form_id: string
          id?: string
          status?: Database["public"]["Enums"]["wf_submission_status"]
          submitted_at?: string
          submitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          coaching_engagement_id?: string | null
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
            foreignKeyName: "wf_form_submissions_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
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
          template_key: string | null
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
          template_key?: string | null
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
          template_key?: string | null
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
      v_coaching_audit_events: {
        Row: {
          action: string | null
          actor_name: string | null
          actor_user_id: string | null
          coaching_org_id: string | null
          coaching_org_name: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          metadata: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_org_engagements_coaching_org_id_fkey"
            columns: ["coaching_org_id"]
            isOneToOne: false
            referencedRelation: "coaching_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      v_goal_completion_rate: {
        Row: {
          coaching_engagement_id: string | null
          coaching_plan_id: string | null
          completion_rate: number | null
          goals_completed: number | null
          goals_created: number | null
          period_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_goals_coaching_plan_id_fkey"
            columns: ["coaching_plan_id"]
            isOneToOne: false
            referencedRelation: "coaching_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_plans_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      v_health_check_question_timeseries: {
        Row: {
          coaching_engagement_id: string | null
          numeric_value_avg: number | null
          period_start: string | null
          submission_count: number | null
          template_id: string | null
          template_question_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_check_responses_template_question_id_fkey"
            columns: ["template_question_id"]
            isOneToOne: false
            referencedRelation: "coaching_health_check_template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_health_checks_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_health_checks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coaching_health_check_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      v_health_check_subject_overall_score: {
        Row: {
          coaching_engagement_id: string | null
          coaching_health_check_id: string | null
          overall_score: number | null
          period_start: string | null
          subject_type:
            | Database["public"]["Enums"]["coaching_health_subject_type"]
            | null
          submitted_at: string | null
        }
        Insert: {
          coaching_engagement_id?: string | null
          coaching_health_check_id?: string | null
          overall_score?: number | null
          period_start?: string | null
          subject_type?:
            | Database["public"]["Enums"]["coaching_health_subject_type"]
            | null
          submitted_at?: string | null
        }
        Update: {
          coaching_engagement_id?: string | null
          coaching_health_check_id?: string | null
          overall_score?: number | null
          period_start?: string | null
          subject_type?:
            | Database["public"]["Enums"]["coaching_health_subject_type"]
            | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_checks_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      v_health_check_trend_delta: {
        Row: {
          coaching_engagement_id: string | null
          delta: number | null
          overall_score: number | null
          period_start: string | null
          prior_overall_score: number | null
          subject_type:
            | Database["public"]["Enums"]["coaching_health_subject_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_health_checks_coaching_engagement_id_fkey"
            columns: ["coaching_engagement_id"]
            isOneToOne: false
            referencedRelation: "coaching_org_engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      v_org_scorecard_rollup: {
        Row: {
          avg_value: number | null
          coaching_org_id: string | null
          engagement_count: number | null
          max_value: number | null
          metric_key: string | null
          min_value: number | null
          period_start: string | null
        }
        Relationships: []
      }
      v_pending_coaching_invitations: {
        Row: {
          client_company_id: string | null
          client_company_name: string | null
          coaching_org_company_id: string | null
          coaching_org_name: string | null
          id: string | null
          invited_at: string | null
          invited_by_type:
            | Database["public"]["Enums"]["invitation_initiated_by"]
            | null
          invited_by_user_id: string | null
          program_name_snapshot: string | null
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
        ]
      }
    }
    Functions: {
      accept_employee_invite: { Args: { p_token: string }; Returns: Json }
      accept_suggested_task: {
        Args: { _assignee_user_id?: string; _suggestion_id: string }
        Returns: string
      }
      apply_onboarding_preset: {
        Args: { p_company_id: string; p_preset_id: string }
        Returns: Json
      }
      bootstrap_first_site: {
        Args: { p_company_name?: string; p_site_name?: string }
        Returns: Json
      }
      calculate_activation_score: {
        Args: { p_company_id: string }
        Returns: Json
      }
      can_access_document_file: {
        Args: { object_name: string }
        Returns: boolean
      }
      can_create_manual_backup: {
        Args: { p_company_id: string }
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
      compute_and_store_activation_score: {
        Args: { p_calculated_by?: string; p_company_id: string }
        Returns: Json
      }
      compute_health_score: {
        Args: { _company_id: string; _framework_id: string }
        Returns: string
      }
      copy_subtasks_for_recurring_task: {
        Args: {
          p_source_task_id: string
          p_target_company_id: string
          p_target_task_id: string
        }
        Returns: number
      }
      create_employee_invite:
        | {
            Args: {
              p_employee_id: string
              p_invited_by: string
              p_role?: string
            }
            Returns: {
              expires_at: string
              invite_id: string
              token: string
            }[]
          }
        | {
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
      create_sample_data: {
        Args: { p_batch_type: string; p_company_id: string }
        Returns: string
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
      fn_active_company_id: { Args: never; Returns: string }
      fn_calculate_next_run_date: {
        Args: {
          p_cadence: Database["public"]["Enums"]["workflow_cadence"]
          p_current_date: string
          p_timezone?: string
        }
        Returns: string
      }
      fn_can_access_coaching_org_resources: {
        Args: { p_coaching_org_id: string }
        Returns: boolean
      }
      fn_can_access_engagement: {
        Args: { _engagement_id: string; _user_id: string }
        Returns: boolean
      }
      fn_can_access_engagement_for_workflow: {
        Args: { _engagement_id: string; _user_id: string }
        Returns: boolean
      }
      fn_can_access_resource_assignment: {
        Args: { p_assignment_id: string }
        Returns: boolean
      }
      fn_can_access_workflow_assignment: {
        Args: { _assignment_id: string; _user_id: string }
        Returns: boolean
      }
      fn_can_manage_coaching_org_resources: {
        Args: { p_coaching_org_id: string }
        Returns: boolean
      }
      fn_can_manage_engagement_workflow: {
        Args: { _engagement_id: string; _user_id: string }
        Returns: boolean
      }
      fn_can_manage_workflow_assignment: {
        Args: { _assignment_id: string; _user_id: string }
        Returns: boolean
      }
      fn_coaching_scoped_only: {
        Args: {
          _company_id: string
          _module: string
          _source_engagement_id: string
          _user_id: string
        }
        Returns: boolean
      }
      fn_company_entitlements: { Args: { p_company_id: string }; Returns: Json }
      fn_current_user_id: { Args: never; Returns: string }
      fn_get_coaching_org_id: { Args: { _company_id: string }; Returns: string }
      fn_get_coaching_term: {
        Args: {
          p_coaching_org_id: string
          p_default_value?: string
          p_term_key: string
        }
        Returns: string
      }
      fn_grant_constraints: {
        Args: {
          _company_id: string
          _module: string
          _source_engagement_id: string
          _user_id: string
        }
        Returns: Json
      }
      fn_has_coaching_access: {
        Args: {
          _company_id: string
          _engagement_id: string
          _min_role: string
          _module: string
          _user_id: string
        }
        Returns: boolean
      }
      fn_has_grant: {
        Args: {
          _company_id: string
          _min_role: string
          _module: string
          _source_engagement_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      fn_is_coach: {
        Args: { _coaching_org_id: string; _user_id: string }
        Returns: boolean
      }
      fn_is_coaching_manager: {
        Args: { _coaching_org_id: string; _user_id: string }
        Returns: boolean
      }
      fn_is_coaching_org_admin: {
        Args: { _coaching_org_id: string; _user_id: string }
        Returns: boolean
      }
      fn_is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      fn_is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      fn_is_site_admin: { Args: { _user_id: string }; Returns: boolean }
      fn_manager_coach_ids: {
        Args: { _coaching_org_id: string; _user_id: string }
        Returns: string[]
      }
      fn_seed_coaching_org_from_pack: {
        Args: {
          p_coaching_org_id: string
          p_force_overwrite?: boolean
          p_pack_key: string
        }
        Returns: Json
      }
      fn_user_active_engagement_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      fn_user_coach_ids: {
        Args: { _coaching_org_id: string; _user_id: string }
        Returns: string[]
      }
      fn_user_coaching_org_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      fn_user_engagement_ids: {
        Args: { _coaching_org_id: string; _user_id: string }
        Returns: string[]
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
      generate_coach_alerts: {
        Args: { _client_company_id: string }
        Returns: number
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
      get_active_sample_batch: {
        Args: { p_company_id: string }
        Returns: {
          batch_type: string
          created_at: string
          id: string
        }[]
      }
      get_backup_stats: {
        Args: { p_company_id: string }
        Returns: {
          last_backup_type: string
          last_successful_backup: string
          total_backups: number
        }[]
      }
      get_coach_client_metrics: {
        Args: { _client_company_id: string }
        Returns: Json
      }
      get_company_activation_score: {
        Args: { p_company_id: string }
        Returns: number
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
      get_department_company_id: {
        Args: { p_department_id: string }
        Returns: string
      }
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
      get_pilot_company_stats: { Args: { p_company_id: string }; Returns: Json }
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
      get_task_subtask_counts: {
        Args: { p_task_ids: string[] }
        Returns: {
          completed_count: number
          task_id: string
          total_count: number
        }[]
      }
      get_user_site_id: { Args: never; Returns: string }
      has_active_sample_data: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      has_coach_access: {
        Args: { _client_company_id: string; _user_id: string }
        Returns: boolean
      }
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
      is_department_manager: {
        Args: { p_department_id: string; p_user_id: string }
        Returns: boolean
      }
      is_department_member: {
        Args: { p_department_id: string; p_user_id: string }
        Returns: boolean
      }
      is_finance_admin: { Args: { p_company_id: string }; Returns: boolean }
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
      list_audit_logs: {
        Args: {
          p_action?: string
          p_actor_user_id?: string
          p_company_id: string
          p_end_date?: string
          p_entity_type?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_start_date?: string
        }
        Returns: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          total_count: number
        }[]
      }
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
      recalculate_all_pilot_scores: { Args: never; Returns: number }
      remove_sample_data: { Args: { p_company_id: string }; Returns: boolean }
      require_module_enabled: {
        Args: { p_company_id: string; p_module_key: string }
        Returns: undefined
      }
      seed_default_departments: {
        Args: { p_company_id: string; p_created_by?: string }
        Returns: undefined
      }
      seed_financial_categories: {
        Args: { p_company_id: string }
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
      alert_severity: "low" | "medium" | "high"
      announcement_status: "draft" | "published" | "archived"
      bank_transaction_status: "unmatched" | "matched" | "posted" | "excluded"
      bill_status: "draft" | "approved" | "paid" | "voided"
      campaign_type: "email" | "event" | "referral" | "content" | "other"
      coach_assignment_role: "primary_coach" | "support_coach"
      coaching_assessment_period: "quarterly" | "annual" | "ad_hoc"
      coaching_assignable_type: "resource" | "collection"
      coaching_assignment_role: "primary" | "secondary"
      coaching_assignment_status: "assigned" | "completed" | "cancelled"
      coaching_assignment_type:
        | "resource"
        | "task_set"
        | "project_blueprint"
        | "lms_item"
        | "form_request"
      coaching_dashboard_type: "org_admin" | "manager" | "coach" | "member"
      coaching_default_assignee:
        | "coach"
        | "member_admin"
        | "member_user"
        | "unassigned"
      coaching_engagement_status: "active" | "suspended" | "ended"
      coaching_goal_status: "planned" | "active" | "achieved" | "abandoned"
      coaching_group_status: "active" | "archived"
      coaching_health_status: "draft" | "submitted" | "reviewed"
      coaching_health_subject_type: "leader" | "organization" | "team"
      coaching_instance_status: "active" | "archived"
      coaching_meeting_status: "scheduled" | "completed" | "cancelled"
      coaching_meeting_type:
        | "annual"
        | "quarterly"
        | "monthly"
        | "one_on_one"
        | "ad_hoc"
      coaching_membership_role: "org_admin" | "org_ops" | "org_staff"
      coaching_onboarding_status: "pending" | "completed" | "skipped"
      coaching_org_status: "active" | "suspended"
      coaching_plan_status: "draft" | "active" | "completed" | "archived"
      coaching_prep_response_type: "text" | "number" | "scale" | "yes_no"
      coaching_progress_status: "not_started" | "viewed" | "completed"
      coaching_resource_status: "active" | "archived"
      coaching_resource_type:
        | "link"
        | "file"
        | "video"
        | "document"
        | "worksheet"
      coaching_role: "coach" | "coach_manager" | "org_admin"
      coaching_step_type: "task" | "form" | "meeting" | "note" | "milestone"
      coaching_template_type:
        | "link"
        | "document"
        | "worksheet"
        | "video"
        | "file"
      coaching_workflow_type:
        | "annual_meeting"
        | "quarterly_meeting"
        | "monthly_meeting"
        | "one_on_one"
        | "content_creation"
        | "operations"
        | "engagement_lifecycle"
        | "member_onboarding"
        | "coach_assignment"
        | "periodic_review"
        | "coaching_cadence"
        | "chair_recruitment"
        | "chair_onboarding"
        | "forum_launch"
        | "forum_cadence"
        | "quarterly_review"
      company_onboarding_source:
        | "self_signup"
        | "invited_by_company"
        | "invited_by_coaching_org"
        | "created_by_coaching_org"
      company_status:
        | "active"
        | "inactive"
        | "archived"
        | "pending"
        | "suspended"
      company_type_enum: "standard" | "coaching_org"
      department_role: "member" | "manager"
      donation_status: "recorded" | "receipted" | "refunded"
      donor_status: "prospect" | "active" | "lapsed" | "major"
      engagement_end_reason:
        | "member_requested"
        | "coaching_org_requested"
        | "nonpayment"
        | "other"
      engagement_linkage_type:
        | "provisioned_by_coaching_org"
        | "invited"
        | "self_linked"
      engagement_status: "active" | "paused" | "ended" | "pending_acceptance"
      entity_contact_type: "client" | "donor" | "vendor"
      entity_kind: "organization" | "individual"
      finance_mode: "builtin_books" | "external_reporting"
      financial_import_status: "pending" | "processing" | "completed" | "failed"
      financial_import_type:
        | "profit_loss"
        | "balance_sheet"
        | "open_ar"
        | "open_ap"
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
      grant_module:
        | "coaching"
        | "tasks"
        | "projects"
        | "notes"
        | "docs"
        | "lms"
        | "calendar"
        | "finance"
        | "crm"
        | "other"
      grant_role: "none" | "read" | "comment" | "write" | "admin"
      grant_source_type: "coaching_engagement" | "external_advisor" | "other"
      grant_status: "active" | "suspended" | "revoked"
      health_check_cadence: "ad_hoc" | "monthly" | "quarterly" | "annually"
      health_check_response_type:
        | "scale_1_5"
        | "scale_1_10"
        | "yes_no"
        | "text"
        | "number"
      invitation_initiated_by: "coaching_org" | "member_company"
      journal_entry_status: "draft" | "posted" | "voided"
      kb_article_status: "draft" | "published" | "archived"
      manager_assignment_status: "active" | "inactive"
      membership_role:
        | "company_admin"
        | "location_admin"
        | "module_admin"
        | "user"
        | "external"
      module_status: "active" | "trial" | "expired" | "suspended"
      notification_job_status: "scheduled" | "sent" | "cancelled"
      notification_status: "unread" | "read" | "dismissed"
      opportunity_status: "open" | "won" | "lost"
      payment_method: "cash" | "check" | "credit_card" | "online" | "other"
      plan_status:
        | "active"
        | "grace"
        | "expired"
        | "cancelled"
        | "requires_action"
        | "trial"
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
      reconciliation_status: "in_progress" | "completed" | "voided"
      recurrence_frequency:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "annually"
      report_type:
        | "tasks_by_status"
        | "tasks_by_assignee"
        | "tasks_due_soon"
        | "tasks_overdue"
        | "projects_by_phase"
        | "projects_active_completed"
        | "crm_pipeline_totals"
        | "crm_opportunities_won_lost"
        | "donors_by_campaign"
        | "donor_retention"
        | "invoices_by_status"
        | "receipts_by_tag"
        | "invoices_summary"
        | "payments_summary"
        | "receipts_summary"
        | "ar_aging"
      resource_type: "document" | "link" | "file" | "video"
      scorecard_metric_source: "health_check" | "goals" | "tasks"
      scorecard_subject_type: "leader" | "organization" | "team" | "none"
      share_request_type: "report" | "document" | "note"
      site_role: "super_admin" | "site_admin"
      sop_visibility: "department_only" | "company_public"
      subscription_source:
        | "self"
        | "provisioned_by_coaching_org"
        | "imported"
        | "site_admin"
      suggestion_status: "pending" | "accepted" | "rejected"
      template_status: "active" | "inactive"
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
      workflow_assignment_status: "active" | "paused" | "archived"
      workflow_cadence:
        | "one_time"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "annually"
      workflow_default_assignee:
        | "coach"
        | "member_admin"
        | "member_user"
        | "unassigned"
        | "org_admin"
        | "member"
        | "manager"
      workflow_run_item_status: "active" | "cancelled"
      workflow_run_item_type: "task" | "meeting" | "note" | "form"
      workflow_run_status:
        | "generated"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      alert_severity: ["low", "medium", "high"],
      announcement_status: ["draft", "published", "archived"],
      bank_transaction_status: ["unmatched", "matched", "posted", "excluded"],
      bill_status: ["draft", "approved", "paid", "voided"],
      campaign_type: ["email", "event", "referral", "content", "other"],
      coach_assignment_role: ["primary_coach", "support_coach"],
      coaching_assessment_period: ["quarterly", "annual", "ad_hoc"],
      coaching_assignable_type: ["resource", "collection"],
      coaching_assignment_role: ["primary", "secondary"],
      coaching_assignment_status: ["assigned", "completed", "cancelled"],
      coaching_assignment_type: [
        "resource",
        "task_set",
        "project_blueprint",
        "lms_item",
        "form_request",
      ],
      coaching_dashboard_type: ["org_admin", "manager", "coach", "member"],
      coaching_default_assignee: [
        "coach",
        "member_admin",
        "member_user",
        "unassigned",
      ],
      coaching_engagement_status: ["active", "suspended", "ended"],
      coaching_goal_status: ["planned", "active", "achieved", "abandoned"],
      coaching_group_status: ["active", "archived"],
      coaching_health_status: ["draft", "submitted", "reviewed"],
      coaching_health_subject_type: ["leader", "organization", "team"],
      coaching_instance_status: ["active", "archived"],
      coaching_meeting_status: ["scheduled", "completed", "cancelled"],
      coaching_meeting_type: [
        "annual",
        "quarterly",
        "monthly",
        "one_on_one",
        "ad_hoc",
      ],
      coaching_membership_role: ["org_admin", "org_ops", "org_staff"],
      coaching_onboarding_status: ["pending", "completed", "skipped"],
      coaching_org_status: ["active", "suspended"],
      coaching_plan_status: ["draft", "active", "completed", "archived"],
      coaching_prep_response_type: ["text", "number", "scale", "yes_no"],
      coaching_progress_status: ["not_started", "viewed", "completed"],
      coaching_resource_status: ["active", "archived"],
      coaching_resource_type: [
        "link",
        "file",
        "video",
        "document",
        "worksheet",
      ],
      coaching_role: ["coach", "coach_manager", "org_admin"],
      coaching_step_type: ["task", "form", "meeting", "note", "milestone"],
      coaching_template_type: [
        "link",
        "document",
        "worksheet",
        "video",
        "file",
      ],
      coaching_workflow_type: [
        "annual_meeting",
        "quarterly_meeting",
        "monthly_meeting",
        "one_on_one",
        "content_creation",
        "operations",
        "engagement_lifecycle",
        "member_onboarding",
        "coach_assignment",
        "periodic_review",
        "coaching_cadence",
        "chair_recruitment",
        "chair_onboarding",
        "forum_launch",
        "forum_cadence",
        "quarterly_review",
      ],
      company_onboarding_source: [
        "self_signup",
        "invited_by_company",
        "invited_by_coaching_org",
        "created_by_coaching_org",
      ],
      company_status: [
        "active",
        "inactive",
        "archived",
        "pending",
        "suspended",
      ],
      company_type_enum: ["standard", "coaching_org"],
      department_role: ["member", "manager"],
      donation_status: ["recorded", "receipted", "refunded"],
      donor_status: ["prospect", "active", "lapsed", "major"],
      engagement_end_reason: [
        "member_requested",
        "coaching_org_requested",
        "nonpayment",
        "other",
      ],
      engagement_linkage_type: [
        "provisioned_by_coaching_org",
        "invited",
        "self_linked",
      ],
      engagement_status: ["active", "paused", "ended", "pending_acceptance"],
      entity_contact_type: ["client", "donor", "vendor"],
      entity_kind: ["organization", "individual"],
      finance_mode: ["builtin_books", "external_reporting"],
      financial_import_status: ["pending", "processing", "completed", "failed"],
      financial_import_type: [
        "profit_loss",
        "balance_sheet",
        "open_ar",
        "open_ap",
      ],
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
      grant_module: [
        "coaching",
        "tasks",
        "projects",
        "notes",
        "docs",
        "lms",
        "calendar",
        "finance",
        "crm",
        "other",
      ],
      grant_role: ["none", "read", "comment", "write", "admin"],
      grant_source_type: ["coaching_engagement", "external_advisor", "other"],
      grant_status: ["active", "suspended", "revoked"],
      health_check_cadence: ["ad_hoc", "monthly", "quarterly", "annually"],
      health_check_response_type: [
        "scale_1_5",
        "scale_1_10",
        "yes_no",
        "text",
        "number",
      ],
      invitation_initiated_by: ["coaching_org", "member_company"],
      journal_entry_status: ["draft", "posted", "voided"],
      kb_article_status: ["draft", "published", "archived"],
      manager_assignment_status: ["active", "inactive"],
      membership_role: [
        "company_admin",
        "location_admin",
        "module_admin",
        "user",
        "external",
      ],
      module_status: ["active", "trial", "expired", "suspended"],
      notification_job_status: ["scheduled", "sent", "cancelled"],
      notification_status: ["unread", "read", "dismissed"],
      opportunity_status: ["open", "won", "lost"],
      payment_method: ["cash", "check", "credit_card", "online", "other"],
      plan_status: [
        "active",
        "grace",
        "expired",
        "cancelled",
        "requires_action",
        "trial",
      ],
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
      reconciliation_status: ["in_progress", "completed", "voided"],
      recurrence_frequency: [
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "annually",
      ],
      report_type: [
        "tasks_by_status",
        "tasks_by_assignee",
        "tasks_due_soon",
        "tasks_overdue",
        "projects_by_phase",
        "projects_active_completed",
        "crm_pipeline_totals",
        "crm_opportunities_won_lost",
        "donors_by_campaign",
        "donor_retention",
        "invoices_by_status",
        "receipts_by_tag",
        "invoices_summary",
        "payments_summary",
        "receipts_summary",
        "ar_aging",
      ],
      resource_type: ["document", "link", "file", "video"],
      scorecard_metric_source: ["health_check", "goals", "tasks"],
      scorecard_subject_type: ["leader", "organization", "team", "none"],
      share_request_type: ["report", "document", "note"],
      site_role: ["super_admin", "site_admin"],
      sop_visibility: ["department_only", "company_public"],
      subscription_source: [
        "self",
        "provisioned_by_coaching_org",
        "imported",
        "site_admin",
      ],
      suggestion_status: ["pending", "accepted", "rejected"],
      template_status: ["active", "inactive"],
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
      workflow_assignment_status: ["active", "paused", "archived"],
      workflow_cadence: [
        "one_time",
        "weekly",
        "monthly",
        "quarterly",
        "annually",
      ],
      workflow_default_assignee: [
        "coach",
        "member_admin",
        "member_user",
        "unassigned",
        "org_admin",
        "member",
        "manager",
      ],
      workflow_run_item_status: ["active", "cancelled"],
      workflow_run_item_type: ["task", "meeting", "note", "form"],
      workflow_run_status: [
        "generated",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
