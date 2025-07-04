export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_config: {
        Row: {
          bot_name: string
          created_at: string
          enabled: boolean
          header_color: string
          id: string
          input_placeholder: string
          max_tokens: number
          model: string
          position: string
          primary_color: string
          quick_replies: Json
          status_message: string
          temperature: number
          updated_at: string
          user_text_color: string
          welcome_message: string
        }
        Insert: {
          bot_name?: string
          created_at?: string
          enabled?: boolean
          header_color?: string
          id?: string
          input_placeholder?: string
          max_tokens?: number
          model?: string
          position?: string
          primary_color?: string
          quick_replies?: Json
          status_message?: string
          temperature?: number
          updated_at?: string
          user_text_color?: string
          welcome_message?: string
        }
        Update: {
          bot_name?: string
          created_at?: string
          enabled?: boolean
          header_color?: string
          id?: string
          input_placeholder?: string
          max_tokens?: number
          model?: string
          position?: string
          primary_color?: string
          quick_replies?: Json
          status_message?: string
          temperature?: number
          updated_at?: string
          user_text_color?: string
          welcome_message?: string
        }
        Relationships: []
      }
      disability_estimates: {
        Row: {
          combined_rating: number | null
          condition: string
          created_at: string | null
          document_id: string | null
          estimated_rating: number | null
          id: string
          user_id: string | null
        }
        Insert: {
          combined_rating?: number | null
          condition: string
          created_at?: string | null
          document_id?: string | null
          estimated_rating?: number | null
          id?: string
          user_id?: string | null
        }
        Update: {
          combined_rating?: number | null
          condition?: string
          created_at?: string | null
          document_id?: string | null
          estimated_rating?: number | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disability_estimates_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disability_estimates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          bounding_box: Json | null
          char_count: number | null
          chunk_index: number
          confidence_score: number | null
          content: string
          content_type: string | null
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          page_number: number | null
          parent_chunk_id: string | null
          section_title: string | null
          word_count: number | null
        }
        Insert: {
          bounding_box?: Json | null
          char_count?: number | null
          chunk_index: number
          confidence_score?: number | null
          content: string
          content_type?: string | null
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          page_number?: number | null
          parent_chunk_id?: string | null
          section_title?: string | null
          word_count?: number | null
        }
        Update: {
          bounding_box?: Json | null
          char_count?: number | null
          chunk_index?: number
          confidence_score?: number | null
          content?: string
          content_type?: string | null
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          page_number?: number | null
          parent_chunk_id?: string | null
          section_title?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_chunks_document"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_chunk"
            columns: ["parent_chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_chunk"
            columns: ["parent_chunk_id"]
            isOneToOne: false
            referencedRelation: "searchable_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      document_summaries: {
        Row: {
          created_at: string | null
          detailed_summary: string | null
          diagnoses_summary: string | null
          document_id: string
          executive_summary: string | null
          id: string
          key_points: string[] | null
          medications_summary: string | null
          procedures_summary: string | null
          summary_embedding: string | null
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          detailed_summary?: string | null
          diagnoses_summary?: string | null
          document_id: string
          executive_summary?: string | null
          id?: string
          key_points?: string[] | null
          medications_summary?: string | null
          procedures_summary?: string | null
          summary_embedding?: string | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          detailed_summary?: string | null
          diagnoses_summary?: string | null
          document_id?: string
          executive_summary?: string | null
          id?: string
          key_points?: string[] | null
          medications_summary?: string | null
          procedures_summary?: string | null
          summary_embedding?: string | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_summaries_document"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          display_on_dashboard: boolean | null
          document_name: string | null
          document_type: string | null
          file_name: string
          file_size: number | null
          file_url: string
          has_signatures: boolean | null
          id: string
          language_detected: string | null
          mime_type: string | null
          processed_at: string | null
          processing_status: string | null
          signature_count: number | null
          tags: string[] | null
          textract_confidence: number | null
          textract_form_fields: Json | null
          textract_job_id: string | null
          textract_processed_at: string | null
          textract_raw_response: Json | null
          textract_status: string | null
          total_chunks: number | null
          total_pages: number | null
          updated_at: string | null
          upload_status: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          display_on_dashboard?: boolean | null
          document_name?: string | null
          document_type?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          has_signatures?: boolean | null
          id?: string
          language_detected?: string | null
          mime_type?: string | null
          processed_at?: string | null
          processing_status?: string | null
          signature_count?: number | null
          tags?: string[] | null
          textract_confidence?: number | null
          textract_form_fields?: Json | null
          textract_job_id?: string | null
          textract_processed_at?: string | null
          textract_raw_response?: Json | null
          textract_status?: string | null
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string | null
          upload_status?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          display_on_dashboard?: boolean | null
          document_name?: string | null
          document_type?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          has_signatures?: boolean | null
          id?: string
          language_detected?: string | null
          mime_type?: string | null
          processed_at?: string | null
          processing_status?: string | null
          signature_count?: number | null
          tags?: string[] | null
          textract_confidence?: number | null
          textract_form_fields?: Json | null
          textract_job_id?: string | null
          textract_processed_at?: string | null
          textract_raw_response?: Json | null
          textract_status?: string | null
          total_chunks?: number | null
          total_pages?: number | null
          updated_at?: string | null
          upload_status?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_entities: {
        Row: {
          bounding_box: Json | null
          chunk_id: string | null
          confidence_score: number | null
          created_at: string | null
          document_id: string
          entity_type: string
          entity_value: string
          icd_code: string | null
          id: string
          normalized_value: string | null
          related_entities: string[] | null
          rxnorm_code: string | null
          snomed_code: string | null
        }
        Insert: {
          bounding_box?: Json | null
          chunk_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          document_id: string
          entity_type: string
          entity_value: string
          icd_code?: string | null
          id?: string
          normalized_value?: string | null
          related_entities?: string[] | null
          rxnorm_code?: string | null
          snomed_code?: string | null
        }
        Update: {
          bounding_box?: Json | null
          chunk_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          document_id?: string
          entity_type?: string
          entity_value?: string
          icd_code?: string | null
          id?: string
          normalized_value?: string | null
          related_entities?: string[] | null
          rxnorm_code?: string | null
          snomed_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_medical_entities_chunk"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medical_entities_chunk"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "searchable_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medical_entities_document"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          updated_at: string | null
          upload_credits: number | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          upload_credits?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          upload_credits?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string | null
          customer_id: string
          deleted_at: string | null
          id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          deleted_at?: string | null
          id?: never
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          deleted_at?: string | null
          id?: never
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_orders: {
        Row: {
          amount_subtotal: number
          amount_total: number
          checkout_session_id: string
          created_at: string | null
          currency: string
          customer_id: string
          deleted_at: string | null
          id: number
          payment_intent_id: string
          payment_status: string
          status: Database["public"]["Enums"]["stripe_order_status"]
          updated_at: string | null
        }
        Insert: {
          amount_subtotal: number
          amount_total: number
          checkout_session_id: string
          created_at?: string | null
          currency: string
          customer_id: string
          deleted_at?: string | null
          id?: never
          payment_intent_id: string
          payment_status: string
          status?: Database["public"]["Enums"]["stripe_order_status"]
          updated_at?: string | null
        }
        Update: {
          amount_subtotal?: number
          amount_total?: number
          checkout_session_id?: string
          created_at?: string | null
          currency?: string
          customer_id?: string
          deleted_at?: string | null
          id?: never
          payment_intent_id?: string
          payment_status?: string
          status?: Database["public"]["Enums"]["stripe_order_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: number | null
          current_period_start: number | null
          customer_id: string
          deleted_at: string | null
          id: number
          payment_method_brand: string | null
          payment_method_last4: string | null
          price_id: string | null
          status: Database["public"]["Enums"]["stripe_subscription_status"]
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: number | null
          current_period_start?: number | null
          customer_id: string
          deleted_at?: string | null
          id?: never
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          price_id?: string | null
          status: Database["public"]["Enums"]["stripe_subscription_status"]
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: number | null
          current_period_start?: number | null
          customer_id?: string
          deleted_at?: string | null
          id?: never
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          price_id?: string | null
          status?: Database["public"]["Enums"]["stripe_subscription_status"]
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      textract_jobs: {
        Row: {
          aws_job_id: string
          completed_at: string | null
          document_id: string
          error_message: string | null
          id: string
          raw_output: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          aws_job_id: string
          completed_at?: string | null
          document_id: string
          error_message?: string | null
          id?: string
          raw_output?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          aws_job_id?: string
          completed_at?: string | null
          document_id?: string
          error_message?: string | null
          id?: string
          raw_output?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_textract_jobs_document"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      searchable_chunks: {
        Row: {
          chunk_index: number | null
          confidence_score: number | null
          content: string | null
          content_type: string | null
          document_id: string | null
          document_name: string | null
          document_type: string | null
          id: string | null
          page_number: number | null
          user_id: string | null
          word_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document_chunks_document"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_user_orders: {
        Row: {
          amount_subtotal: number | null
          amount_total: number | null
          checkout_session_id: string | null
          currency: string | null
          customer_id: string | null
          order_date: string | null
          order_id: number | null
          order_status:
            | Database["public"]["Enums"]["stripe_order_status"]
            | null
          payment_intent_id: string | null
          payment_status: string | null
        }
        Relationships: []
      }
      stripe_user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: number | null
          current_period_start: number | null
          customer_id: string | null
          payment_method_brand: string | null
          payment_method_last4: string | null
          price_id: string | null
          subscription_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["stripe_subscription_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_inactive_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
          count: number
        }[]
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      can_upload_document: {
        Args: { user_id: string }
        Returns: boolean
      }
      check_subscription_status: {
        Args: { user_id: string }
        Returns: boolean
      }
      create_admin_user: {
        Args: { admin_email: string; admin_password: string }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_upload_credits: {
        Args: {
          p_user_id: string
          p_stripe_customer_id: string
          p_increment_by?: number
        }
        Returns: {
          success: boolean
          new_credits: number
          message: string
        }[]
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      monthly_document_uploads: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          count: number
        }[]
      }
      monthly_revenue: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          revenue: number
        }[]
      }
      monthly_user_signups: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          count: number
        }[]
      }
      search_similar_content: {
        Args: {
          query_embedding: string
          user_filter?: string
          similarity_threshold?: number
          max_results?: number
        }
        Returns: {
          chunk_id: string
          document_id: string
          content: string
          document_name: string
          similarity: number
          page_number: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      stripe_order_status: "pending" | "completed" | "canceled"
      stripe_subscription_status:
        | "not_started"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "paused"
      user_role: "veteran" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      stripe_order_status: ["pending", "completed", "canceled"],
      stripe_subscription_status: [
        "not_started",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
      user_role: ["veteran", "admin"],
    },
  },
} as const

// VA Forms API Types
export interface BenefitCategory {
  name: string;
  description: string;
}

export interface VAFormAttributes {
  form_name: string;
  url: string;
  title: string;
  first_issued_on: string;
  last_revision_on: string;
  pages: number;
  sha256: string;
  valid_pdf: boolean;
  form_usage: string;
  form_tool_intro: string;
  form_tool_url: string;
  form_details_url: string;
  form_type: string;
  language: string;
  deleted_at: string | null;
  related_forms: string[];
  benefit_categories: BenefitCategory[];
  va_form_administration: string;
}

export interface VAForm {
  id: string;
  type: string;
  attributes: VAFormAttributes;
}

export interface VAFormSearchParams {
  query?: string;
  page?: number;
  per_page?: number;
}

export interface VAFormFilterState {
  categories: string[];
  formType: string;
  administration: string;
}

export interface VAFormSuggestion {
  text: string;
  type: 'form_number' | 'keyword' | 'category';
}
