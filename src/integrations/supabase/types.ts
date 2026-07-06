export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          event_id: string
          id: string
          student_id: string
          timestamp: string
        }
        Insert: {
          event_id: string
          id?: string
          student_id: string
          timestamp?: string
        }
        Update: {
          event_id?: string
          id?: string
          student_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_notification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string | null
          id: string
          meeting_id: string | null
          notification_type: string
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          meeting_id?: string | null
          notification_type: string
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          meeting_id?: string | null
          notification_type?: string
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notification_logs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_settings: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          notification_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          notification_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          notification_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_resource_requests: {
        Row: {
          event_id: string
          id: string
          notes: string | null
          requested_at: string
          requested_by: string
          requested_quantity: number
          resource_type_id: string
          status: string
        }
        Insert: {
          event_id: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_by: string
          requested_quantity?: number
          resource_type_id: string
          status?: string
        }
        Update: {
          event_id?: string
          id?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string
          requested_quantity?: number
          resource_type_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_resource_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_resource_requests_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_resources: {
        Row: {
          allocated_at: string
          allocated_by: string
          event_id: string
          id: string
          notes: string | null
          quantity: number
          resource_type_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by: string
          event_id: string
          id?: string
          notes?: string | null
          quantity?: number
          resource_type_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string
          event_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          resource_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_resources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attended_count: number
          capacity: number
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          date: string
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          image_url: string | null
          organizer_id: string
          qr_code: string | null
          registered_count: number
          status: Database["public"]["Enums"]["event_status"]
          time: string
          title: string
          updated_at: string
          venue: string
          meeting_link: string | null
          meeting_status: string | null
        }

        Insert: {
          attended_count?: number
          capacity?: number
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          date: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          organizer_id: string
          qr_code?: string | null
          registered_count?: number
          status?: Database["public"]["Enums"]["event_status"]
          time: string
          title: string
          updated_at?: string
          venue: string
          meeting_link?: string | null
          meeting_status?: string | null
        }

        Update: {
          attended_count?: number
          capacity?: number
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          date?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          organizer_id?: string
          qr_code?: string | null
          registered_count?: number
          status?: Database["public"]["Enums"]["event_status"]
          time?: string
          title?: string
          updated_at?: string
          venue?: string
          meeting_link?: string | null
          meeting_status?: string | null
        }

        Relationships: []
      }
      meeting_participants: {
        Row: {
          attended: boolean
          id: string
          invited_at: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          status: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          id?: string
          invited_at?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          status?: string
          user_id: string
        }
        Update: {
          attended?: boolean
          id?: string
          invited_at?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          event_id: string
          id: string
          meeting_date: string
          meeting_link: string
          meeting_time: string
          title: string
          updated_at: string
          status: string
        }

        Insert: {
          agenda?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          event_id: string
          id?: string
          meeting_date: string
          meeting_link: string
          meeting_time: string
          title: string
          updated_at?: string
          status?: string
        }

        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          event_id?: string
          id?: string
          meeting_date?: string
          meeting_link?: string
          meeting_time?: string
          title?: string
          updated_at?: string
          status?: string
        }

        Relationships: [
          {
            foreignKeyName: "meetings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          attended: boolean
          attended_at: string | null
          event_id: string
          id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          attended_at?: string | null
          event_id: string
          id?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          attended?: boolean
          attended_at?: string | null
          event_id?: string
          id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_audit_log: {
        Row: {
          action: string
          condition: string | null
          event_id: string
          id: string
          notes: string | null
          performed_at: string
          performed_by: string
          quantity: number
          resource_type_id: string
        }
        Insert: {
          action: string
          condition?: string | null
          event_id: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by: string
          quantity: number
          resource_type_id: string
        }
        Update: {
          action?: string
          condition?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string
          quantity?: number
          resource_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_audit_log_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_returns: {
        Row: {
          condition: "good" | "damaged" | "needs_repair" | "lost"
          event_id: string
          event_resource_id: string
          id: string
          notes: string | null
          quantity_returned: number
          resource_type_id: string
          returned_at: string
          returned_by: string
        }
        Insert: {
          condition: "good" | "damaged" | "needs_repair" | "lost"
          event_id: string
          event_resource_id: string
          id?: string
          notes?: string | null
          quantity_returned: number
          resource_type_id: string
          returned_at?: string
          returned_by: string
        }
        Update: {
          condition?: "good" | "damaged" | "needs_repair" | "lost"
          event_id?: string
          event_resource_id?: string
          id?: string
          notes?: string | null
          quantity_returned?: number
          resource_type_id?: string
          returned_at?: string
          returned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_returns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_returns_event_resource_id_fkey"
            columns: ["event_resource_id"]
            isOneToOne: false
            referencedRelation: "event_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_returns_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_types: {
        Row: {
          available_quantity: number
          created_at: string
          description: string | null
          id: string
          name: string
          total_quantity: number
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          total_quantity?: number
        }
        Update: {
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          total_quantity?: number
        }
        Relationships: []
      }
      user_email_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          notification_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notification_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notification_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_preferences_notification_type_fkey"
            columns: ["notification_type"]
            isOneToOne: false
            referencedRelation: "email_notification_settings"
            referencedColumns: ["notification_type"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      can_view_meeting: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
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
      is_meeting_participant: {
        Args: { _meeting_id: string; _user_id: string }
        Returns: boolean
      }
      send_email_notification: {
        Args: {
          additional_message?: string
          event_date?: string
          event_id?: string
          event_time?: string
          event_title?: string
          event_venue?: string
          meeting_date?: string
          meeting_id?: string
          meeting_link?: string
          meeting_time?: string
          meeting_title?: string
          notification_type: string
          organizer_name?: string
          recipient_email: string
          recipient_name: string
          recipient_user_id: string
          status?: string
          subject: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "user"
      event_category:
      | "academic"
      | "social"
      | "sports"
      | "cultural"
      | "workshop"
      | "seminar"
      | "online_meeting"
      event_status: "pending" | "approved" | "rejected" | "cancelled" | "live"

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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
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
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof Database
}
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "organizer", "student"],
      event_category: [
        "academic",
        "social",
        "sports",
        "cultural",
        "workshop",
        "seminar",
        "online_meeting",
      ],

      event_status: ["pending", "approved", "rejected", "cancelled", "live"],
    },
  },
} as const
