import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ResumeData } from "@/types/app";
import { logger, handleError, ErrorCategory } from "@/lib/utils/error-handler";
import { useToast } from "@/hooks/use-toast";

interface UseResumeReturn {
  resumeData: ResumeData | null;
  isUploaded: boolean;
  isAnalyzing: boolean;
  error: string | null;
  handleResumeUpload: (data: ResumeData) => Promise<void>;
  resetResumeState: () => void;
}

export function useResume(): UseResumeReturn {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleResumeUpload = useCallback(
    async (data: ResumeData) => {
      try {
        setIsAnalyzing(true);
        setError(null);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("User not authenticated");
        }

        // Validate required fields
        if (!data.file_url) {
          throw new Error("File URL is required");
        }

        // Ensure all required fields have values
        const resumeData = {
          user_id: user.id,
          file_url: data.file_url,
          file_name: data.file_name || "resume.pdf",
          skills: data.skills || [],
          projects: data.projects || [],
          experience: data.experience || {},
          education: data.education || null,
          career_level: data.careerLevel || "fresher",
          summary: data.summary || "",
          strengths: data.strengths || [],
          uploaded_at: new Date().toISOString(),
        };

        // Save resume data to database
        const { data: savedData, error: dbError } = await supabase
          .from("resumes")
          .insert(resumeData)
          .select()
          .single();

        if (dbError) {
          logger.error("Database error while saving resume:", dbError);
          throw dbError;
        }

        if (!savedData) {
          throw new Error("Failed to save resume data");
        }

        logger.info("Resume data saved successfully", { id: savedData.id });

        setResumeData({ ...data, id: savedData.id });
        setIsUploaded(true);

        toast({
          title: "Resume Uploaded Successfully",
          description: "Your resume has been analyzed and saved.",
        });
      } catch (error) {
        const toastError = handleError(
          error,
          ErrorCategory.DATABASE,
          "resume save"
        );
        toast(toastError);
        setError(toastError.description);
        setResumeData(null);
        setIsUploaded(false);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [toast]
  );

  const resetResumeState = useCallback(() => {
    setResumeData(null);
    setIsUploaded(false);
    setIsAnalyzing(false);
    setError(null);
  }, []);

  return {
    resumeData,
    isUploaded,
    isAnalyzing,
    error,
    handleResumeUpload,
    resetResumeState,
  };
}
