// User Types
export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Resume Types
export interface ResumeData {
  id?: string;
  user_id: string;
  file_name: string;
  file_url: string;
  uploaded_at?: string;
  skills: string[];
  experience?: {
    totalYears?: number;
    domains?: string[];
    roles?: string[];
  };
  projects: Array<{
    name: string;
    description?: string;
    technologies: string[];
    role?: string;
  }>;
  education?: {
    degree: string;
    institution: string;
    year: string;
  };
  careerLevel?: string;
  summary?: string;
  strengths?: string[];
  extractedText?: string;
}

// Interview Types
export interface InterviewQuestion {
  id: string;
  user_id: string;
  resume_id: string;
  type: "technical" | "behavioral" | "management";
  question_text: string;
  created_at: string;
}

export interface InterviewAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
  score: number;
  feedback: string;
  ideal_answer: string;
  created_at: string;
  strengths?: string[];
  improvements?: string[];
}

export interface InterviewValidation {
  score: number;
  feedback: string;
  idealAnswer: string;
  strengths: string[];
  improvements: string[];
}

// Auth Types
export interface AuthFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  verificationType: "email" | "phone";
}

// Component Props Types
export interface ResumeUploaderProps {
  onUploadComplete: (resumeData: ResumeData) => Promise<void>;
}

export interface InterviewCardsProps {
  resumeUploaded: boolean;
  resumeData: ResumeData | null;
  isAnalyzing: boolean;
}

export interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  onRecordingComplete: (transcript: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export interface TextToSpeechProps {
  text: string;
  className?: string;
}

// Utility Types
export interface ToastMessage {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}
