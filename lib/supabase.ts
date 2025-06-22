import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          file_url: string
          file_name: string
          skills: any
          experience: any
          projects: any
          keywords: any
          uploaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_url: string
          file_name: string
          skills?: any
          experience?: any
          projects?: any
          keywords?: any
          uploaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_url?: string
          file_name?: string
          skills?: any
          experience?: any
          projects?: any
          keywords?: any
          uploaded_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          user_id: string
          resume_id: string
          type: "technical" | "behavioral" | "management"
          question_text: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resume_id: string
          type: "technical" | "behavioral" | "management"
          question_text: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resume_id?: string
          type?: "technical" | "behavioral" | "management"
          question_text?: string
          created_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          user_id: string
          question_id: string
          answer_text: string
          score: number | null
          ideal_answer: string | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          answer_text: string
          score?: number | null
          ideal_answer?: string | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          answer_text?: string
          score?: number | null
          ideal_answer?: string | null
          feedback?: string | null
          created_at?: string
        }
      }
    }
  }
}
