"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ResumeUploader from "@/components/resume-uploader";
import InterviewCards from "@/components/interview-cards";
import ProfileDropdown from "@/components/profile-dropdown";
import { useToast } from "@/hooks/use-toast";
import { useResume } from "@/hooks/use-resume";
import { Loader2, Upload, FileText, Trash2, Sparkles } from "lucide-react";
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
      {/* Header Bar */}
      <header className="w-full bg-white shadow-sm flex items-center justify-between px-8 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent select-none">
            AI Interview Prep
          </span>
        </div>
        <div className="flex items-center gap-4 bg-white/70 rounded-full px-4 py-2 shadow-sm">
          <div className="flex flex-col items-end mr-2">
            <span className="font-semibold text-gray-900">
              {getUserDisplayName()}
            </span>
            <span className="text-xs text-gray-500">{getUserEmail()}</span>
            <span className="text-xs text-gray-500">{getUserPhone()}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow">
            {getUserDisplayName()
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <button
            onClick={handleSignOut}
            className="ml-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-medium flex items-center gap-2 transition"
          >
            <span className="hidden md:inline">Sign Out</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-6-3h12m0 0l-3-3m3 3l-3 3"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="flex justify-center w-full mt-8 mb-6">
        <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full px-8 py-3 shadow-lg">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg md:text-xl">
            Welcome back, {getUserDisplayName()}!
          </span>
        </div>
      </div>

      {/* Main Heading and Subtitle */}
      <div className="flex flex-col items-center mb-10">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 text-center mb-3">
          Let's Get Started with Your Interview Preparation
        </h1>
        <p className="text-gray-500 text-lg text-center max-w-2xl">
          Upload your resume to unlock personalized AI-powered interview
          practice sessions tailored to your experience and skills.
        </p>
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
