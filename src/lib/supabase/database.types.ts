export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type ContentStatus = 'draft' | 'published' | 'archived'
type LearningProgressStatus = 'not_started' | 'in_progress' | 'completed'
type CourseProgressStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'mastered'

export type Database = {
  public: {
    Tables: {
      levels: {
        Row: {
          id: string
          slug: string
          cefr: string
          title: string
          description: string
          order_index: number
          illustration_url: string | null
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['levels']['Row']> & {
          slug: string
          cefr: string
          title: string
          order_index: number
        }
        Update: Partial<Database['public']['Tables']['levels']['Insert']>
        Relationships: []
      }
      modules: {
        Row: {
          id: string
          level_id: string
          slug: string
          title: string
          description: string
          learning_outcome: string
          illustration_url: string | null
          icon: string | null
          order_index: number
          estimated_minutes: number
          is_required: boolean
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['modules']['Row']> & {
          level_id: string
          slug: string
          title: string
          order_index: number
        }
        Update: Partial<Database['public']['Tables']['modules']['Insert']>
        Relationships: []
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          slug: string
          title: string
          description: string
          order_index: number
          estimated_minutes: number
          is_required: boolean
          status: ContentStatus
          version: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['lessons']['Row']> & {
          module_id: string
          slug: string
          title: string
          order_index: number
        }
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>
        Relationships: []
      }
      lesson_blocks: {
        Row: {
          id: string
          lesson_id: string
          type: string
          title: string | null
          content: Json
          order_index: number
          is_required: boolean
          is_graded: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['lesson_blocks']['Row']> & {
          lesson_id: string
          type: string
          order_index: number
        }
        Update: Partial<Database['public']['Tables']['lesson_blocks']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          current_level_id: string | null
          learning_goal: string | null
          weekly_goal: number
          theme: string
          show_translations: boolean
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string
          email: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      user_level_progress: {
        Row: {
          user_id: string
          level_id: string
          completion_percent: number
          average_accuracy: number | null
          assessment_score: number | null
          status: CourseProgressStatus
          started_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_level_progress']['Row']> & {
          user_id: string
          level_id: string
        }
        Update: Partial<Database['public']['Tables']['user_level_progress']['Insert']>
        Relationships: []
      }
      user_module_progress: {
        Row: {
          user_id: string
          module_id: string
          completion_percent: number
          average_accuracy: number | null
          assessment_score: number | null
          status: CourseProgressStatus
          started_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_module_progress']['Row']> & {
          user_id: string
          module_id: string
        }
        Update: Partial<Database['public']['Tables']['user_module_progress']['Insert']>
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          status: LearningProgressStatus
          current_block_id: string | null
          completion_percent: number
          accuracy_percent: number | null
          started_at: string | null
          last_activity_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_lesson_progress']['Row']> & {
          user_id: string
          lesson_id: string
        }
        Update: Partial<Database['public']['Tables']['user_lesson_progress']['Insert']>
        Relationships: []
      }
      user_lesson_sessions: {
        Row: {
          user_id: string
          lesson_id: string
          current_block_id: string | null
          draft_answers: Json
          attempts: Json
          feedback: Json
          used_hints: Json
          score: number
          possible_score: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_lesson_sessions']['Row']> & {
          user_id: string
          lesson_id: string
        }
        Update: Partial<Database['public']['Tables']['user_lesson_sessions']['Insert']>
        Relationships: []
      }
      exercise_attempts: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          block_id: string
          answer: Json
          score: number
          max_score: number
          is_correct: boolean | null
          used_hint: boolean
          attempt_number: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['exercise_attempts']['Row']> & {
          user_id: string
          lesson_id: string
          block_id: string
        }
        Update: Partial<Database['public']['Tables']['exercise_attempts']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      complete_onboarding: {
        Args: {
          p_current_level: string
          p_learning_goal: string
          p_weekly_goal: number
        }
        Returns: undefined
      }
      submit_lesson_answer: {
        Args: {
          p_lesson_id: string
          p_block_id: string
          p_answer: Json
          p_used_hint: boolean
        }
        Returns: Json
      }
      complete_lesson: {
        Args: { p_lesson_id: string }
        Returns: Json
      }
    }
    Enums: {
      content_status: ContentStatus
      learning_progress_status: LearningProgressStatus
      course_progress_status: CourseProgressStatus
    }
    CompositeTypes: Record<string, never>
  }
}
