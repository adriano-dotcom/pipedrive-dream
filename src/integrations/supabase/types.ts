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
      activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string
          due_time: string | null
          duration_minutes: number | null
          id: string
          is_completed: boolean
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          person_id: string | null
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date: string
          due_time?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          person_id?: string | null
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string
          due_time?: string | null
          duration_minutes?: number | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          person_id?: string | null
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_email_campaigns: {
        Row: {
          body: string
          created_at: string
          created_by: string
          daily_limit: number | null
          failed_count: number
          id: string
          opened_count: number
          rate_limit: number
          scheduled_at: string | null
          sent_count: number
          status: string
          subject: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          daily_limit?: number | null
          failed_count?: number
          id?: string
          opened_count?: number
          rate_limit?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          daily_limit?: number | null
          failed_count?: number
          id?: string
          opened_count?: number
          rate_limit?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      bulk_email_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error_message: string | null
          id: string
          job_title: string | null
          name: string | null
          opened_at: string | null
          organization_city: string | null
          organization_name: string | null
          person_id: string | null
          sent_at: string | null
          status: string
          tracking_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          job_title?: string | null
          name?: string | null
          opened_at?: string | null
          organization_city?: string | null
          organization_name?: string | null
          person_id?: string | null
          sent_at?: string | null
          status?: string
          tracking_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          job_title?: string | null
          name?: string | null
          opened_at?: string | null
          organization_city?: string | null
          organization_name?: string | null
          person_id?: string | null
          sent_at?: string | null
          status?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_email_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_email_recipients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_files: {
        Row: {
          created_at: string | null
          deal_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          deal_id: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          deal_id: string
          id: string
          is_pinned: boolean | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          deal_id: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          deal_id?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tag_assignments: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tag_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "deal_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tags: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          commission_percent: number | null
          commission_value: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          end_date: string | null
          expected_close_date: string | null
          id: string
          insurance_type: string | null
          insurer: string | null
          label: string | null
          lost_at: string | null
          lost_reason: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          person_id: string | null
          pipeline_id: string
          policy_number: string | null
          probability: number | null
          stage_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          value: number | null
          won_at: string | null
        }
        Insert: {
          commission_percent?: number | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          expected_close_date?: string | null
          id?: string
          insurance_type?: string | null
          insurer?: string | null
          label?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          person_id?: string | null
          pipeline_id: string
          policy_number?: string | null
          probability?: number | null
          stage_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Update: {
          commission_percent?: number | null
          commission_value?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          expected_close_date?: string | null
          id?: string
          insurance_type?: string | null
          insurer?: string | null
          label?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          person_id?: string | null
          pipeline_id?: string
          policy_number?: string | null
          probability?: number | null
          stage_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_global: boolean | null
          name: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      merge_backups: {
        Row: {
          created_at: string | null
          deleted_entity_data: Json
          deleted_entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          is_restored: boolean | null
          kept_entity_id: string
          kept_entity_previous_data: Json
          merged_by: string | null
          transferred_relations: Json
        }
        Insert: {
          created_at?: string | null
          deleted_entity_data: Json
          deleted_entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          is_restored?: boolean | null
          kept_entity_id: string
          kept_entity_previous_data: Json
          merged_by?: string | null
          transferred_relations?: Json
        }
        Update: {
          created_at?: string | null
          deleted_entity_data?: Json
          deleted_entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          is_restored?: boolean | null
          kept_entity_id?: string
          kept_entity_previous_data?: Json
          merged_by?: string | null
          transferred_relations?: Json
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          organization_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          organization_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          organization_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_partners: {
        Row: {
          country: string | null
          created_at: string | null
          document: string | null
          email: string | null
          entry_date: string | null
          id: string
          job_title: string | null
          legal_rep_document: string | null
          legal_rep_name: string | null
          legal_rep_qualification: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          qualification: string | null
          qualification_code: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          entry_date?: string | null
          id?: string
          job_title?: string | null
          legal_rep_document?: string | null
          legal_rep_name?: string | null
          legal_rep_qualification?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          qualification?: string | null
          qualification_code?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          entry_date?: string | null
          id?: string
          job_title?: string | null
          legal_rep_document?: string | null
          legal_rep_name?: string | null
          legal_rep_qualification?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          qualification?: string | null
          qualification_code?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_tag_assignments: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_tag_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "organization_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_tags: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zipcode: string | null
          annual_premium_estimate: number | null
          automotores: number | null
          branch_type: string | null
          broker_notes: string | null
          cnae: string | null
          cnpj: string | null
          company_size: string | null
          created_at: string
          created_by: string | null
          current_insurer: string | null
          email: string | null
          enrichment_source: string | null
          fleet_size: number | null
          fleet_type: string | null
          founded_date: string | null
          has_claims_history: boolean | null
          id: string
          insurance_branches: string[] | null
          label: string | null
          last_enriched_at: string | null
          latitude: number | null
          legal_nature: string | null
          legal_nature_code: string | null
          longitude: number | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          pipedrive_id: string | null
          policy_renewal_month: number | null
          preferred_insurers: string[] | null
          primary_contact_id: string | null
          registration_status: string | null
          registration_status_date: string | null
          risk_profile: string | null
          rntrc_antt: string | null
          share_capital: number | null
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          annual_premium_estimate?: number | null
          automotores?: number | null
          branch_type?: string | null
          broker_notes?: string | null
          cnae?: string | null
          cnpj?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          current_insurer?: string | null
          email?: string | null
          enrichment_source?: string | null
          fleet_size?: number | null
          fleet_type?: string | null
          founded_date?: string | null
          has_claims_history?: boolean | null
          id?: string
          insurance_branches?: string[] | null
          label?: string | null
          last_enriched_at?: string | null
          latitude?: number | null
          legal_nature?: string | null
          legal_nature_code?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          pipedrive_id?: string | null
          policy_renewal_month?: number | null
          preferred_insurers?: string[] | null
          primary_contact_id?: string | null
          registration_status?: string | null
          registration_status_date?: string | null
          risk_profile?: string | null
          rntrc_antt?: string | null
          share_capital?: number | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zipcode?: string | null
          annual_premium_estimate?: number | null
          automotores?: number | null
          branch_type?: string | null
          broker_notes?: string | null
          cnae?: string | null
          cnpj?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          current_insurer?: string | null
          email?: string | null
          enrichment_source?: string | null
          fleet_size?: number | null
          fleet_type?: string | null
          founded_date?: string | null
          has_claims_history?: boolean | null
          id?: string
          insurance_branches?: string[] | null
          label?: string | null
          last_enriched_at?: string | null
          latitude?: number | null
          legal_nature?: string | null
          legal_nature_code?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          pipedrive_id?: string | null
          policy_renewal_month?: number | null
          preferred_insurers?: string[] | null
          primary_contact_id?: string | null
          registration_status?: string | null
          registration_status_date?: string | null
          risk_profile?: string | null
          rntrc_antt?: string | null
          share_capital?: number | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          email_status: string
          id: string
          job_title: string | null
          label: string | null
          lead_source: string | null
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          partner_id: string | null
          phone: string | null
          pipedrive_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_status?: string
          id?: string
          job_title?: string | null
          label?: string | null
          lead_source?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          partner_id?: string | null
          phone?: string | null
          pipedrive_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          email_status?: string
          id?: string
          job_title?: string | null
          label?: string | null
          lead_source?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          partner_id?: string | null
          phone?: string | null
          pipedrive_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "organization_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      people_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          person_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          person_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          person_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_files_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          person_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          person_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_history_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          person_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          person_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          person_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_tag_assignments: {
        Row: {
          created_at: string | null
          id: string
          person_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          person_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          person_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_tag_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "person_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      person_tags: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_pipeline_id: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_pipeline_id?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_pipeline_id?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_emails: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          from_email: string
          from_name: string | null
          id: string
          sent_at: string | null
          status: string | null
          subject: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          subject: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: []
      }
      stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          position: number
          probability: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          position: number
          probability?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_signatures: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          signature_html: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          signature_html: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          signature_html?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_channels: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          owner_id: string | null
          phone_number: string | null
          timelines_channel_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          phone_number?: string | null
          timelines_channel_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          phone_number?: string | null
          timelines_channel_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_channels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_analysis: {
        Row: {
          analyzed_at: string | null
          conversation_id: string
          created_at: string | null
          id: string
          improvements: string[] | null
          message_count: number | null
          overall_score: number
          professionalism: number
          resolution_effectiveness: number
          response_quality: number
          sentiment: string | null
          strengths: string[] | null
          summary: string | null
          tone_score: number
        }
        Insert: {
          analyzed_at?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          improvements?: string[] | null
          message_count?: number | null
          overall_score: number
          professionalism: number
          resolution_effectiveness: number
          response_quality: number
          sentiment?: string | null
          strengths?: string[] | null
          summary?: string | null
          tone_score: number
        }
        Update: {
          analyzed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          improvements?: string[] | null
          message_count?: number | null
          overall_score?: number
          professionalism?: number
          resolution_effectiveness?: number
          response_quality?: number
          sentiment?: string | null
          strengths?: string[] | null
          summary?: string | null
          tone_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          channel_id: string
          created_at: string | null
          first_response_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          person_id: string
          priority: number | null
          resolved_at: string | null
          status:
            | Database["public"]["Enums"]["whatsapp_conversation_status"]
            | null
          tags: string[] | null
          timelines_conversation_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel_id: string
          created_at?: string | null
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          person_id: string
          priority?: number | null
          resolved_at?: string | null
          status?:
            | Database["public"]["Enums"]["whatsapp_conversation_status"]
            | null
          tags?: string[] | null
          timelines_conversation_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel_id?: string
          created_at?: string | null
          first_response_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          person_id?: string
          priority?: number | null
          resolved_at?: string | null
          status?:
            | Database["public"]["Enums"]["whatsapp_conversation_status"]
            | null
          tags?: string[] | null
          timelines_conversation_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          media_mime_type: string | null
          media_url: string | null
          message_type:
            | Database["public"]["Enums"]["whatsapp_message_type"]
            | null
          metadata: Json | null
          sender_id: string | null
          sender_type: string
          status: Database["public"]["Enums"]["whatsapp_message_status"] | null
          timelines_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_type?:
            | Database["public"]["Enums"]["whatsapp_message_type"]
            | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type: string
          status?: Database["public"]["Enums"]["whatsapp_message_status"] | null
          timelines_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_type?:
            | Database["public"]["Enums"]["whatsapp_message_type"]
            | null
          metadata?: Json | null
          sender_id?: string | null
          sender_type?: string
          status?: Database["public"]["Enums"]["whatsapp_message_status"] | null
          timelines_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "corretor"
      whatsapp_conversation_status:
        | "pending"
        | "in_progress"
        | "resolved"
        | "archived"
      whatsapp_message_status: "sent" | "delivered" | "read" | "failed"
      whatsapp_message_type:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "location"
        | "contact"
        | "sticker"
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
      app_role: ["admin", "corretor"],
      whatsapp_conversation_status: [
        "pending",
        "in_progress",
        "resolved",
        "archived",
      ],
      whatsapp_message_status: ["sent", "delivered", "read", "failed"],
      whatsapp_message_type: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "location",
        "contact",
        "sticker",
      ],
    },
  },
} as const
