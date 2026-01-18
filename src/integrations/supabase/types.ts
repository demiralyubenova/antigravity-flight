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
      clothing_items: {
        Row: {
          brand: string | null
          category: string
          color: string | null
          created_at: string
          id: string
          image_url: string
          last_worn_at: string | null
          name: string
          price: number | null
          purchase_date: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          wear_count: number
        }
        Insert: {
          brand?: string | null
          category: string
          color?: string | null
          created_at?: string
          id?: string
          image_url: string
          last_worn_at?: string | null
          name: string
          price?: number | null
          purchase_date?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          wear_count?: number
        }
        Update: {
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string
          last_worn_at?: string | null
          name?: string
          price?: number | null
          purchase_date?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          wear_count?: number
        }
        Relationships: []
      }
      outfit_feedback: {
        Row: {
          created_at: string
          formality_feedback: string | null
          id: string
          more_like_this: boolean | null
          notes: string | null
          occasion: string | null
          outfit_item_ids: string[]
          rating: string | null
          temperature_feedback: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          formality_feedback?: string | null
          id?: string
          more_like_this?: boolean | null
          notes?: string | null
          occasion?: string | null
          outfit_item_ids: string[]
          rating?: string | null
          temperature_feedback?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          formality_feedback?: string | null
          id?: string
          more_like_this?: boolean | null
          notes?: string | null
          occasion?: string | null
          outfit_item_ids?: string[]
          rating?: string | null
          temperature_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      outfits: {
        Row: {
          color_palette: string[] | null
          created_at: string
          event_name: string | null
          id: string
          is_planned: boolean | null
          item_ids: string[]
          name: string
          notes: string | null
          occasion: string | null
          silhouette: string | null
          similarity_hash: string | null
          updated_at: string
          user_id: string
          worn_at: string | null
        }
        Insert: {
          color_palette?: string[] | null
          created_at?: string
          event_name?: string | null
          id?: string
          is_planned?: boolean | null
          item_ids: string[]
          name: string
          notes?: string | null
          occasion?: string | null
          silhouette?: string | null
          similarity_hash?: string | null
          updated_at?: string
          user_id: string
          worn_at?: string | null
        }
        Update: {
          color_palette?: string[] | null
          created_at?: string
          event_name?: string | null
          id?: string
          is_planned?: boolean | null
          item_ids?: string[]
          name?: string
          notes?: string | null
          occasion?: string | null
          silhouette?: string | null
          similarity_hash?: string | null
          updated_at?: string
          user_id?: string
          worn_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cold_tolerance: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cold_tolerance?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cold_tolerance?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_outfits: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outfit_id: string | null
          planned_date: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outfit_id?: string | null
          planned_date: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outfit_id?: string | null
          planned_date?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_outfits_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_outfits_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          destination: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      try_on_results: {
        Row: {
          clothing_item_id: string | null
          created_at: string
          id: string
          person_image_url: string
          result_image_url: string
          user_id: string
        }
        Insert: {
          clothing_item_id?: string | null
          created_at?: string
          id?: string
          person_image_url: string
          result_image_url: string
          user_id: string
        }
        Update: {
          clothing_item_id?: string | null
          created_at?: string
          id?: string
          person_image_url?: string
          result_image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "try_on_results_clothing_item_id_fkey"
            columns: ["clothing_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_purchased: boolean | null
          name: string
          priority: string | null
          related_outfit_id: string | null
          source: string | null
          target_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean | null
          name: string
          priority?: string | null
          related_outfit_id?: string | null
          source?: string | null
          target_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_purchased?: boolean | null
          name?: string
          priority?: string | null
          related_outfit_id?: string | null
          source?: string | null
          target_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_related_outfit_id_fkey"
            columns: ["related_outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
