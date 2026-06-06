export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ConsentSessionStatus =
  | 'draft'
  | 'explaining'
  | 'checking_understanding'
  | 'needs_reexplanation'
  | 'ready_for_physician_review'
  | 'reviewed'
  | 'archived';

export type ConsentModelMode = 'mock' | 'gemini' | 'vertex-gemini';

export type Database = {
  public: {
    Tables: {
      consent_sessions: {
        Row: {
          id: string;
          case_id: string;
          institution_id: string;
          status: ConsentSessionStatus;
          model_mode: ConsentModelMode;
          explanation_version: string;
          started_by: string | null;
          started_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['consent_sessions']['Row']> & {
          case_id: string;
          institution_id: string;
          status: ConsentSessionStatus;
          model_mode: ConsentModelMode;
          explanation_version: string;
        };
        Update: Partial<Database['public']['Tables']['consent_sessions']['Row']>;
      };
      evidence_sources: { Row: Record<string, Json>; Insert: Record<string, Json>; Update: Record<string, Json> };
      session_events: { Row: Record<string, Json>; Insert: Record<string, Json>; Update: Record<string, Json> };
      audit_events: { Row: Record<string, Json>; Insert: Record<string, Json>; Update: Record<string, Json> };
    };
  };
};
