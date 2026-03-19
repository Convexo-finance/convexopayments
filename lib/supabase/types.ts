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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          city: string | null
          company_phone: string | null
          company_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_person_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          internal_name: string
          legal_name: string | null
          office_country: string | null
          office_country_code: string | null
          postal_code: string | null
          registration_country: string | null
          registration_number: string | null
          state: string | null
          state_code: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_phone?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          internal_name: string
          legal_name?: string | null
          office_country?: string | null
          office_country_code?: string | null
          postal_code?: string | null
          registration_country?: string | null
          registration_number?: string | null
          state?: string | null
          state_code?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_phone?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          internal_name?: string
          legal_name?: string | null
          office_country?: string | null
          office_country_code?: string | null
          postal_code?: string | null
          registration_country?: string | null
          registration_number?: string | null
          state?: string | null
          state_code?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      convexo_accounts: {
        Row: {
          created_at: string | null
          details: Json
          directions: string[]
          doc_url: string | null
          id: string
          is_active: boolean
          is_default: boolean
          label: string | null
          method: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json
          directions?: string[]
          doc_url?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string | null
          method: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json
          directions?: string[]
          doc_url?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string | null
          method?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_errors: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          notification_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          notification_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          notification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_errors_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          admin_convexo_account_id: string | null
          admin_fee: number | null
          admin_fiat_amount: number | null
          admin_proof_url: string | null
          admin_rate: number | null
          amount: number
          convexo_account_id: string | null
          created_at: string | null
          currency: string
          due_date: string | null
          entity_id: string
          fiat_amount: number | null
          fiat_currency: string | null
          fiat_rate: number | null
          id: string
          invoice_url: string | null
          notes: string | null
          own_profile_id: string | null
          payment_profile_id: string | null
          processing_fee: number | null
          proof_url: string | null
          reference: string | null
          rejection_reason: string | null
          status: string
          status_history: Json
          txn_hash: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          user_proof_url: string | null
        }
        Insert: {
          admin_convexo_account_id?: string | null
          admin_fee?: number | null
          admin_fiat_amount?: number | null
          admin_proof_url?: string | null
          admin_rate?: number | null
          amount: number
          convexo_account_id?: string | null
          created_at?: string | null
          currency: string
          due_date?: string | null
          entity_id: string
          fiat_amount?: number | null
          fiat_currency?: string | null
          fiat_rate?: number | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          own_profile_id?: string | null
          payment_profile_id?: string | null
          processing_fee?: number | null
          proof_url?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: string
          status_history?: Json
          txn_hash?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          user_proof_url?: string | null
        }
        Update: {
          admin_convexo_account_id?: string | null
          admin_fee?: number | null
          admin_fiat_amount?: number | null
          admin_proof_url?: string | null
          admin_rate?: number | null
          amount?: number
          convexo_account_id?: string | null
          created_at?: string | null
          currency?: string
          due_date?: string | null
          entity_id?: string
          fiat_amount?: number | null
          fiat_currency?: string | null
          fiat_rate?: number | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          own_profile_id?: string | null
          payment_profile_id?: string | null
          processing_fee?: number | null
          proof_url?: string | null
          reference?: string | null
          rejection_reason?: string | null
          status?: string
          status_history?: Json
          txn_hash?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          user_proof_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_admin_convexo_account_id_fkey"
            columns: ["admin_convexo_account_id"]
            isOneToOne: false
            referencedRelation: "convexo_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_convexo_account_id_fkey"
            columns: ["convexo_account_id"]
            isOneToOne: false
            referencedRelation: "convexo_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_own_profile_id_fkey"
            columns: ["own_profile_id"]
            isOneToOne: false
            referencedRelation: "payment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_payment_profile_id_fkey"
            columns: ["payment_profile_id"]
            isOneToOne: false
            referencedRelation: "payment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_profiles: {
        Row: {
          created_at: string | null
          details: Json
          doc_url: string | null
          entity_id: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          label: string | null
          method: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json
          doc_url?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          method: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json
          doc_url?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          label?: string | null
          method?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          client_annual_volume: string | null
          client_countries: string[] | null
          contact_email: string | null
          country: string | null
          country_code: string | null
          evm_address: string | null
          first_name: string | null
          id: string
          id_doc_url: string | null
          id_number: string | null
          id_type: string | null
          instagram: string | null
          last_name: string | null
          linkedin: string | null
          monthly_volume: string | null
          phone: string | null
          phone_country_code: string | null
          postal_code: string | null
          proof_of_address_url: string | null
          rut_admin_note: string | null
          rut_status: string | null
          rut_url: string | null
          solana_address: string | null
          state: string | null
          state_code: string | null
          supplier_annual_volume: string | null
          supplier_countries: string[] | null
          twitter: string | null
          updated_at: string | null
          usdc_balance: number | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_annual_volume?: string | null
          client_countries?: string[] | null
          contact_email?: string | null
          country?: string | null
          country_code?: string | null
          evm_address?: string | null
          first_name?: string | null
          id?: string
          id_doc_url?: string | null
          id_number?: string | null
          id_type?: string | null
          instagram?: string | null
          last_name?: string | null
          linkedin?: string | null
          monthly_volume?: string | null
          phone?: string | null
          phone_country_code?: string | null
          postal_code?: string | null
          proof_of_address_url?: string | null
          rut_admin_note?: string | null
          rut_status?: string | null
          rut_url?: string | null
          solana_address?: string | null
          state?: string | null
          state_code?: string | null
          supplier_annual_volume?: string | null
          supplier_countries?: string[] | null
          twitter?: string | null
          updated_at?: string | null
          usdc_balance?: number | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_annual_volume?: string | null
          client_countries?: string[] | null
          contact_email?: string | null
          country?: string | null
          country_code?: string | null
          evm_address?: string | null
          first_name?: string | null
          id?: string
          id_doc_url?: string | null
          id_number?: string | null
          id_type?: string | null
          instagram?: string | null
          last_name?: string | null
          linkedin?: string | null
          monthly_volume?: string | null
          phone?: string | null
          phone_country_code?: string | null
          postal_code?: string | null
          proof_of_address_url?: string | null
          rut_admin_note?: string | null
          rut_status?: string | null
          rut_url?: string | null
          solana_address?: string | null
          state?: string | null
          state_code?: string | null
          supplier_annual_volume?: string | null
          supplier_countries?: string[] | null
          twitter?: string | null
          updated_at?: string | null
          usdc_balance?: number | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_phone: string | null
          company_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_person_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          internal_name: string
          legal_name: string | null
          office_country: string | null
          office_country_code: string | null
          postal_code: string | null
          registration_country: string | null
          registration_number: string | null
          state: string | null
          state_code: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_phone?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          internal_name: string
          legal_name?: string | null
          office_country?: string | null
          office_country_code?: string | null
          postal_code?: string | null
          registration_country?: string | null
          registration_number?: string | null
          state?: string | null
          state_code?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_phone?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          internal_name?: string
          legal_name?: string | null
          office_country?: string | null
          office_country_code?: string | null
          postal_code?: string | null
          registration_country?: string | null
          registration_number?: string | null
          state?: string | null
          state_code?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_enabled: boolean
          privy_user_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_enabled?: boolean
          privy_user_id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_enabled?: boolean
          privy_user_id?: string
          role?: string
        }
        Relationships: []
      }
      wallet_requests: {
        Row: {
          admin_note: string | null
          admin_rate: number | null
          amount: number
          convexo_account_id: string | null
          created_at: string | null
          crypto_address: string | null
          currency: string
          destination_profile_id: string | null
          id: string
          initial_spread: number | null
          metadata: Json
          official_spread: number | null
          paid_at: string | null
          proof_url: string | null
          provider_rate: number | null
          rejection_reason: string | null
          spread_pct: number | null
          status: string
          txn_url: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          user_proof_url: string | null
        }
        Insert: {
          admin_note?: string | null
          admin_rate?: number | null
          amount: number
          convexo_account_id?: string | null
          created_at?: string | null
          crypto_address?: string | null
          currency: string
          destination_profile_id?: string | null
          id?: string
          initial_spread?: number | null
          metadata?: Json
          official_spread?: number | null
          paid_at?: string | null
          proof_url?: string | null
          provider_rate?: number | null
          rejection_reason?: string | null
          spread_pct?: number | null
          status?: string
          txn_url?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          user_proof_url?: string | null
        }
        Update: {
          admin_note?: string | null
          admin_rate?: number | null
          amount?: number
          convexo_account_id?: string | null
          created_at?: string | null
          crypto_address?: string | null
          currency?: string
          destination_profile_id?: string | null
          id?: string
          initial_spread?: number | null
          metadata?: Json
          official_spread?: number | null
          paid_at?: string | null
          proof_url?: string | null
          provider_rate?: number | null
          rejection_reason?: string | null
          spread_pct?: number | null
          status?: string
          txn_url?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          user_proof_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_requests_convexo_account_id_fkey"
            columns: ["convexo_account_id"]
            isOneToOne: false
            referencedRelation: "convexo_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_requests_destination_profile_id_fkey"
            columns: ["destination_profile_id"]
            isOneToOne: false
            referencedRelation: "payment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_balance: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      increment_balance: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      privy_sub: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
