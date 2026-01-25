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
          broker_notes: string | null
          cnae: string | null
          cnpj: string | null
          created_at: string
          created_by: string | null
          current_insurer: string | null
          email: string | null
          fleet_size: number | null
          fleet_type: string | null
          has_claims_history: boolean | null
          id: string
          insurance_branches: string[] | null
          label: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          policy_renewal_month: number | null
          preferred_insurers: string[] | null
          primary_contact_id: string | null
          risk_profile: string | null
          rntrc_antt: string | null
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
          broker_notes?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          current_insurer?: string | null
          email?: string | null
          fleet_size?: number | null
          fleet_type?: string | null
          has_claims_history?: boolean | null
          id?: string
          insurance_branches?: string[] | null
          label?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          policy_renewal_month?: number | null
          preferred_insurers?: string[] | null
          primary_contact_id?: string | null
          risk_profile?: string | null
          rntrc_antt?: string | null
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
          broker_notes?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          current_insurer?: string | null
          email?: string | null
          fleet_size?: number | null
          fleet_type?: string | null
          has_claims_history?: boolean | null
          id?: string
          insurance_branches?: string[] | null
          label?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          policy_renewal_month?: number | null
          preferred_insurers?: string[] | null
          primary_contact_id?: string | null
          risk_profile?: string | null
          rntrc_antt?: string | null
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
          id: string
          job_title: string | null
          label: string | null
          lead_source: string | null
          name: string
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          phone: string | null
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
          id?: string
          job_title?: string | null
          label?: string | null
          lead_source?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          phone?: string | null
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
          id?: string
          job_title?: string | null
          label?: string | null
          lead_source?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          phone?: string | null
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
        ]
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
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Enums: {
      app_role: "admin" | "corretor"
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
    },
  },
} as const
