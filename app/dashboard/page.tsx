"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ResumeUploader from "@/components/resume-uploader";
import InterviewCards from "@/components/interview-cards";
import ProfileDropdown from "@/components/profile-dropdown";
import { useToast } from "@/hooks/use-toast";
import { useResume } from "@/hooks/use-resume";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { logger, handleError, ErrorCategory } from "@/lib/utils/error-handler";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  last_sign_in?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const {
    resumeData,
    isUploaded,
    isAnalyzing,
    error: resumeError,
    handleResumeUpload,
    resetResumeState,
  } = useResume();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading && !isUploaded) {
      setShowUploader(true);
    }
  }, [loading, isUploaded]);

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        logger.info("No user found, redirecting to login");
        router.push("/");
        return;
      }

      logger.info("User found:", { email: user.email, phone: user.phone });
      setUser(user);

      // Get user profile from our users table
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profileError && profile) {
        setUserProfile(profile);
      }

      // Check if user has uploaded resume
      const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .single();

      if (!resumeError && resume) {
        logger.info("Resume found:", { id: resume.id });
        handleResumeUpload(resume);
      } else {
        logger.info("No resume found");
      }
    } catch (error) {
      const toastError = handleError(error, ErrorCategory.AUTH, "user check");
      toast(toastError);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      router.push("/");
    } catch (error) {
      const toastError = handleError(error, ErrorCategory.AUTH, "sign out");
      toast(toastError);
    }
  };

  const handleDeleteResume = async () => {
    if (!resumeData || !user) return;

    try {
      // Delete from storage
      const fileName = resumeData.file_url.split("/").pop();
      if (fileName) {
        await supabase.storage
          .from("resumes")
          .remove([`${user.id}/${fileName}`]);
      }

      // Delete from database
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeData.id);

      if (error) throw error;

      resetResumeState();
      toast({
        title: "Resume Deleted",
        description: "Your resume has been deleted successfully",
      });
    } catch (error) {
      const toastError = handleError(
        error,
        ErrorCategory.STORAGE,
        "resume delete"
      );
      toast(toastError);
    }
  };

  const handleResumeUploadAndDone = (data: any) => {
    handleResumeUpload(data);
    setShowUploader(false);
  };

  // Get user display name from multiple sources
  const getUserDisplayName = () => {
    return (
      userProfile?.name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  };

  const getUserEmail = () => {
    return user?.email || user?.user_metadata?.email || "";
  };

  const getUserPhone = () => {
    return (
      user?.phone || user?.user_metadata?.phone || userProfile?.phone || ""
    );
  };

  // Check if this is user's first login
  const isFirstTimeLogin = () => {
    if (!userProfile?.last_sign_in) return true;
    const lastSignIn = new Date(userProfile.last_sign_in);
    const createdAt = new Date(userProfile.created_at);
    return lastSignIn.getTime() - createdAt.getTime() < 1000 * 60; // Within 1 minute
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
            <div className="mt-4 text-gray-600">Loading your dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 right-0 p-4 z-50">
        <ProfileDropdown
          name={getUserDisplayName()}
          email={getUserEmail()}
          phone={getUserPhone()}
          onSignOut={handleSignOut}
          isFirstTimeLogin={isFirstTimeLogin()}
        />
                </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">
            {isFirstTimeLogin()
              ? "Welcome to AI Interview Prep"
              : "Welcome back"}
            , {getUserDisplayName()}! 👋
          </h1>
          <p className="text-indigo-100 mt-1">
            {isFirstTimeLogin()
              ? "Get started by uploading your resume for personalized interview practice"
              : "Continue your interview preparation journey"}
          </p>
            </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
      {/* Resume Section */}
          <Card className="bg-white/80 backdrop-blur-sm border-2 border-indigo-100">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Resume Status</CardTitle>
                  <CardDescription>
                    {resumeData
                      ? "Your resume is ready for AI-powered interview practice"
                      : "Upload your resume to get started"}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  {resumeData && (
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleDeleteResume}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Resume
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowUploader(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  >
                    {resumeData ? (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Update Resume
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Upload Resume
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {resumeData && (
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700"
                  >
                    {resumeData.skills?.length || 0} Skills Found
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-purple-50 text-purple-700"
                  >
                    {resumeData.projects?.length || 0} Projects
                  </Badge>
                  {resumeData.careerLevel && (
                    <Badge
                      variant="secondary"
                      className="bg-green-50 text-green-700"
                    >
                      {resumeData.careerLevel} Level
                    </Badge>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Interview Cards or Resume Uploader */}
          {showUploader && (
            <ResumeUploader onUploadComplete={handleResumeUploadAndDone} />
        )}

      <InterviewCards
        resumeData={resumeData}
            resumeUploaded={isUploaded}
        isAnalyzing={isAnalyzing}
      />
        </div>
      </div>
    </div>
  );
}
