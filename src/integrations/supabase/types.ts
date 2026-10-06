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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accusations: {
        Row: {
          accused_id: string | null
          created_at: string
          player_id: string
          table_id: string
        }
        Insert: {
          accused_id?: string | null
          created_at?: string
          player_id: string
          table_id: string
        }
        Update: {
          accused_id?: string | null
          created_at?: string
          player_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accusations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accusations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "game_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_assignments: {
        Row: {
          act: number
          agenda_id: string
          difficulty: number
          id: string
          involved_player_id: string | null
          is_special: boolean
          player_id: string
          requires_player: boolean
          result: string | null
          submitted_at: string | null
          table_id: string
          text: string
        }
        Insert: {
          act: number
          agenda_id: string
          difficulty?: number
          id?: string
          involved_player_id?: string | null
          is_special?: boolean
          player_id: string
          requires_player?: boolean
          result?: string | null
          submitted_at?: string | null
          table_id: string
          text: string
        }
        Update: {
          act?: number
          agenda_id?: string
          difficulty?: number
          id?: string
          involved_player_id?: string | null
          is_special?: boolean
          player_id?: string
          requires_player?: boolean
          result?: string | null
          submitted_at?: string | null
          table_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "game_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      game_tables: {
        Row: {
          act_duration_sec: number
          act_ends_at: string | null
          code: string
          created_at: string
          creator_player_id: string | null
          current_act: number
          id: string
          intro_ends_at: string | null
          status: string
          transition_ends_at: string | null
          updated_at: string
        }
        Insert: {
          act_duration_sec?: number
          act_ends_at?: string | null
          code: string
          created_at?: string
          creator_player_id?: string | null
          current_act?: number
          id?: string
          intro_ends_at?: string | null
          status?: string
          transition_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          act_duration_sec?: number
          act_ends_at?: string | null
          code?: string
          created_at?: string
          creator_player_id?: string | null
          current_act?: number
          id?: string
          intro_ends_at?: string | null
          status?: string
          transition_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      motives: {
        Row: {
          motive: string
          player_id: string
          table_id: string
        }
        Insert: {
          motive: string
          player_id: string
          table_id: string
        }
        Update: {
          motive?: string
          player_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motives_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motives_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "game_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      player_secrets: {
        Row: {
          player_id: string
          token_hash: string
        }
        Insert: {
          player_id: string
          token_hash: string
        }
        Update: {
          player_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_secrets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          accused: boolean
          created_at: string
          emoji: string | null
          id: string
          name: string
          seat: number
          submitted_act: number
          table_id: string
        }
        Insert: {
          accused?: boolean
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          seat: number
          submitted_act?: number
          table_id: string
        }
        Update: {
          accused?: boolean
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          seat?: number
          submitted_act?: number
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "game_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicions: {
        Row: {
          act: number
          created_at: string
          id: string
          player_id: string
          suspect_id: string | null
          table_id: string
        }
        Insert: {
          act: number
          created_at?: string
          id?: string
          player_id: string
          suspect_id?: string | null
          table_id: string
        }
        Update: {
          act?: number
          created_at?: string
          id?: string
          player_id?: string
          suspect_id?: string | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspicions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspicions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "game_tables"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
