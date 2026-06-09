export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      quizzes: {
        Row: {
          id: string;
          title: string;
          topic: string | null;
          difficulty: "easy" | "medium" | "hard" | null;
          created_at: string;
          edit_code: string;
        };
        Insert: {
          id?: string;
          title: string;
          topic?: string | null;
          difficulty?: "easy" | "medium" | "hard" | null;
          created_at?: string;
          edit_code?: string;
        };
        Update: {
          id?: string;
          title?: string;
          topic?: string | null;
          difficulty?: "easy" | "medium" | "hard" | null;
          created_at?: string;
          edit_code?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          quiz_id: string;
          position: number;
          text: string;
          options: string[];
          correct_index: number;
          time_limit: number;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          position: number;
          text: string;
          options: string[];
          correct_index: number;
          time_limit?: number;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          position?: number;
          text?: string;
          options?: string[];
          correct_index?: number;
          time_limit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          quiz_id: string;
          pin: string;
          host_token: string;
          state: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
          current_q: number;
          question_started_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          pin: string;
          host_token: string;
          state?: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
          current_q?: number;
          question_started_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          pin?: string;
          host_token?: string;
          state?: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
          current_q?: number;
          question_started_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          id: string;
          session_id: string;
          nickname: string;
          score: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          nickname: string;
          score?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          nickname?: string;
          score?: number;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      answers: {
        Row: {
          id: string;
          session_id: string;
          player_id: string;
          question_index: number;
          choice: number;
          answered_at: string;
          is_correct: boolean | null;
          awarded: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          player_id: string;
          question_index: number;
          choice: number;
          answered_at?: string;
          is_correct?: boolean | null;
          awarded?: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          player_id?: string;
          question_index?: number;
          choice?: number;
          answered_at?: string;
          is_correct?: boolean | null;
          awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: "answers_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience row types
export type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Answer = Database["public"]["Tables"]["answers"]["Row"];

export type SessionState = Session["state"];
