export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DebtStatus =
  | "draft"
  | "ready_to_send"
  | "sent"
  | "waiting_payment"
  | "customer_said_today"
  | "customer_said_week"
  | "customer_claimed_paid"
  | "paid_confirmed"
  | "overdue"
  | "cancelled"
  | "needs_receipt"
  | "receipt_sent";

export type DebtSource = "manual" | "quick_add" | "self_checkout";
export type ReceiptStatus = "pending_upload" | "uploaded" | "sent" | "not_required";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          timezone: string;
          default_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          timezone?: string;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          timezone?: string;
          default_currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          public_slug: string;
          qr_token: string;
          business_name: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          theme_primary_color: string;
          theme_secondary_color: string;
          public_enabled: boolean;
          qr_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          public_slug: string;
          qr_token: string;
          business_name: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          theme_primary_color?: string;
          theme_secondary_color?: string;
          public_enabled?: boolean;
          qr_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          public_slug?: string;
          qr_token?: string;
          business_name?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          theme_primary_color?: string;
          theme_secondary_color?: string;
          public_enabled?: boolean;
          qr_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          owner_id: string;
          display_name: string;
          phone: string | null;
          notes: string | null;
          last_contacted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          display_name: string;
          phone?: string | null;
          notes?: string | null;
          last_contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          phone?: string | null;
          notes?: string | null;
          last_contacted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          owner_id: string;
          business_id: string;
          name: string;
          default_price: number | null;
          currency: string;
          is_active: boolean;
          usage_count: number;
          last_used_at: string | null;
          image_url: string | null;
          category: string | null;
          display_order: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          business_id: string;
          name: string;
          default_price?: number | null;
          currency?: string;
          is_active?: boolean;
          usage_count?: number;
          last_used_at?: string | null;
          image_url?: string | null;
          category?: string | null;
          display_order?: number;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          name?: string;
          default_price?: number | null;
          currency?: string;
          is_active?: boolean;
          usage_count?: number;
          last_used_at?: string | null;
          image_url?: string | null;
          category?: string | null;
          display_order?: number;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_sessions: {
        Row: {
          id: string;
          business_id: string;
          slug_snapshot: string | null;
          source: string;
          user_agent: string | null;
          ip_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          slug_snapshot?: string | null;
          source?: string;
          user_agent?: string | null;
          ip_hash?: string | null;
          created_at?: string;
        };
        Update: {
          slug_snapshot?: string | null;
          source?: string;
          user_agent?: string | null;
          ip_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_submissions: {
        Row: {
          id: string;
          business_id: string;
          checkout_session_id: string | null;
          customer_id: string | null;
          customer_name_snapshot: string;
          customer_phone_snapshot: string | null;
          total_amount: number | null;
          status: string;
          raw_payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          checkout_session_id?: string | null;
          customer_id?: string | null;
          customer_name_snapshot: string;
          customer_phone_snapshot?: string | null;
          total_amount?: number | null;
          status?: string;
          raw_payload?: Json;
          created_at?: string;
        };
        Update: {
          checkout_session_id?: string | null;
          customer_id?: string | null;
          customer_name_snapshot?: string;
          customer_phone_snapshot?: string | null;
          total_amount?: number | null;
          status?: string;
          raw_payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_submissions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_submissions_checkout_session_id_fkey";
            columns: ["checkout_session_id"];
            isOneToOne: false;
            referencedRelation: "checkout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_submissions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_submission_items: {
        Row: {
          id: string;
          submission_id: string;
          product_id: string | null;
          product_name_snapshot: string;
          quantity: number;
          unit_price: number | null;
          line_total: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          product_id?: string | null;
          product_name_snapshot: string;
          quantity?: number;
          unit_price?: number | null;
          line_total?: number | null;
          created_at?: string;
        };
        Update: {
          product_id?: string | null;
          product_name_snapshot?: string;
          quantity?: number;
          unit_price?: number | null;
          line_total?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_submission_items_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "checkout_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkout_submission_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      debts: {
        Row: {
          id: string;
          owner_id: string;
          business_id: string | null;
          customer_id: string;
          product_id: string | null;
          checkout_submission_id: string | null;
          source: DebtSource;
          description: string;
          currency: string;
          original_amount: number;
          outstanding_amount: number;
          status: DebtStatus;
          is_quick_add: boolean;
          send_after_review: boolean;
          due_date: string | null;
          paid_at: string | null;
          customer_claimed_payment_method: string | null;
          customer_claimed_paid_at: string | null;
          owner_confirmed_paid_at: string | null;
          receipt_required: boolean;
          invoice_required: boolean;
          invoice_uploaded_at: string | null;
          invoice_file_url: string | null;
          reminder_count: number;
          message_count: number;
          last_message_at: string | null;
          quick_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          business_id?: string | null;
          customer_id: string;
          product_id?: string | null;
          checkout_submission_id?: string | null;
          source?: DebtSource;
          description: string;
          currency?: string;
          original_amount: number;
          outstanding_amount: number;
          status?: DebtStatus;
          is_quick_add?: boolean;
          send_after_review?: boolean;
          due_date?: string | null;
          paid_at?: string | null;
          customer_claimed_payment_method?: string | null;
          customer_claimed_paid_at?: string | null;
          owner_confirmed_paid_at?: string | null;
          receipt_required?: boolean;
          invoice_required?: boolean;
          invoice_uploaded_at?: string | null;
          invoice_file_url?: string | null;
          reminder_count?: number;
          message_count?: number;
          last_message_at?: string | null;
          quick_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string | null;
          product_id?: string | null;
          checkout_submission_id?: string | null;
          source?: DebtSource;
          description?: string;
          currency?: string;
          original_amount?: number;
          outstanding_amount?: number;
          status?: DebtStatus;
          is_quick_add?: boolean;
          send_after_review?: boolean;
          due_date?: string | null;
          paid_at?: string | null;
          customer_claimed_payment_method?: string | null;
          customer_claimed_paid_at?: string | null;
          owner_confirmed_paid_at?: string | null;
          receipt_required?: boolean;
          invoice_required?: boolean;
          invoice_uploaded_at?: string | null;
          invoice_file_url?: string | null;
          reminder_count?: number;
          message_count?: number;
          last_message_at?: string | null;
          quick_note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debts_checkout_submission_id_fkey";
            columns: ["checkout_submission_id"];
            isOneToOne: false;
            referencedRelation: "checkout_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
