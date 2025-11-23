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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          options: Json | null
          placeholder_text: string | null
          question_text: string
          question_type: string
          section_description: string | null
          section_title: string | null
          step_number: number
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          placeholder_text?: string | null
          question_text: string
          question_type: string
          section_description?: string | null
          section_title?: string | null
          step_number: number
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          placeholder_text?: string | null
          question_text?: string
          question_type?: string
          section_description?: string | null
          section_title?: string | null
          step_number?: number
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: []
      }
      attendee_snapshots: {
        Row: {
          created_at: string
          event_id: string
          id: string
          snapshot_text: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          snapshot_text: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          snapshot_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_paid: number | null
          created_at: string
          event_id: string
          id: string
          payment_reference: string | null
          refunded: boolean
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          event_id: string
          id?: string
          payment_reference?: string | null
          refunded?: boolean
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          event_id?: string
          id?: string
          payment_reference?: string | null
          refunded?: boolean
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          date_time: string
          description: string | null
          id: string
          is_visible: boolean
          price: number
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          date_time: string
          description?: string | null
          id?: string
          is_visible?: boolean
          price: number
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          date_time?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          price?: number
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          answers: Json
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      icebreaker_questions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          question_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          question_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          question_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      outside_city_interests: {
        Row: {
          city: string
          created_at: string
          id: string
          phone: string
          specified_city: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          phone: string
          specified_city: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          phone?: string
          specified_city?: string
        }
        Relationships: []
      }
      pairing_assignments: {
        Row: {
          created_at: string
          event_id: string
          guest_id: string
          id: string
          pairing_id: string | null
          restaurant_id: string | null
          seat_number: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          table_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
          pairing_id?: string | null
          restaurant_id?: string | null
          seat_number?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          table_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
          pairing_id?: string | null
          restaurant_id?: string | null
          seat_number?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          table_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "pairing_guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "pairing_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pairing_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairing_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "pairing_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          event_id: string
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          event_id: string
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_constraints: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          subject_guest_ids: string[]
          target_guest_ids: string[] | null
          type: Database["public"]["Enums"]["constraint_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          subject_guest_ids: string[]
          target_guest_ids?: string[] | null
          type: Database["public"]["Enums"]["constraint_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          subject_guest_ids?: string[]
          target_guest_ids?: string[] | null
          type?: Database["public"]["Enums"]["constraint_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_constraints_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_guests: {
        Row: {
          age_range: string | null
          created_at: string
          dietary_notes: string | null
          email: string | null
          event_id: string
          first_name: string
          friend_group: string | null
          gender: string | null
          id: string
          last_name: string
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          dietary_notes?: string | null
          email?: string | null
          event_id: string
          first_name: string
          friend_group?: string | null
          gender?: string | null
          id?: string
          last_name: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          dietary_notes?: string | null
          email?: string | null
          event_id?: string
          first_name?: string
          friend_group?: string | null
          gender?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_pairs: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          pairing_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          pairing_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          pairing_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_pairs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pairing_restaurants: {
        Row: {
          address: string | null
          capacity_total: number
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          event_id: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity_total?: number
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity_total?: number
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pairing_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairing_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "pairing_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_assessments: {
        Row: {
          answers: Json
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          assessment_completed: boolean
          created_at: string
          email: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          assessment_completed?: boolean
          created_at?: string
          email: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          assessment_completed?: boolean
          created_at?: string
          email?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string
          created_at: string
          google_maps_link: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          google_maps_link?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          google_maps_link?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      assignment_status: "assigned" | "waitlist"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "cancelled"
        | "rescheduled"
      constraint_type:
        | "not_with"
        | "must_with"
        | "keep_group_together"
        | "balance_gender"
        | "max_group_size"
      event_status: "draft" | "locked"
      event_type: "dinner" | "lunch" | "scavenger_hunt" | "mixer" | "other"
      gender_type: "male" | "female" | "non_binary" | "prefer_not_to_say"
      user_role: "user" | "admin"
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
      assignment_status: ["assigned", "waitlist"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "cancelled",
        "rescheduled",
      ],
      constraint_type: [
        "not_with",
        "must_with",
        "keep_group_together",
        "balance_gender",
        "max_group_size",
      ],
      event_status: ["draft", "locked"],
      event_type: ["dinner", "lunch", "scavenger_hunt", "mixer", "other"],
      gender_type: ["male", "female", "non_binary", "prefer_not_to_say"],
      user_role: ["user", "admin"],
    },
  },
} as const
