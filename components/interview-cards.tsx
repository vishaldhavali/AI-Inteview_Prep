"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Code,
  Users,
  Crown,
  Clock,
  Target,
  Lock,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InterviewCardsProps, ResumeData } from "@/types/app";
import { logger } from "@/lib/utils/error-handler";

const interviewTypes = [
  {
    id: "technical",
    title: "Technical Interview",
    description:
      "Test your programming skills, algorithms, and technical knowledge",
    icon: Code,
    color: "from-blue-500 to-blue-600",
    hoverColor: "hover:from-blue-600 hover:to-blue-700",
    borderColor: "border-blue-200",
    hoverBorderColor: "hover:border-blue-300",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    questions: "8-10 questions",
    duration: "45-60 minutes",
    difficulty: "Beginner to Advanced",
  },
  {
    id: "behavioral",
    title: "Behavioral Interview",
    description:
      "Assess your soft skills, teamwork, and problem-solving approach",
    icon: Users,
    color: "from-green-500 to-green-600",
    hoverColor: "hover:from-green-600 hover:to-green-700",
    borderColor: "border-green-200",
    hoverBorderColor: "hover:border-green-300",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    questions: "6-8 questions",
    duration: "30-45 minutes",
    difficulty: "Communication Focus",
  },
  {
    id: "management",
    title: "Management Round",
    description:
      "Leadership potential, strategic thinking, and career aspirations",
    icon: Crown,
    color: "from-purple-500 to-purple-600",
    hoverColor: "hover:from-purple-600 hover:to-purple-700",
    borderColor: "border-purple-200",
    hoverBorderColor: "hover:border-purple-300",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    questions: "5-7 questions",
    duration: "30-40 minutes",
    difficulty: "Leadership & Vision",
  },
] as const;

export default function InterviewCards({
  resumeUploaded,
  resumeData,
  isAnalyzing = false,
}: InterviewCardsProps) {
  const router = useRouter();

  const handleStartInterview = (type: string) => {
    try {
      if (!resumeUploaded || isAnalyzing) {
        return;
      }
      logger.info(`Starting ${type} interview`, { type, resumeData });
      router.push(`/interview/${type}`);
    } catch (error) {
      logger.error("Failed to start interview", error);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Target className="h-4 w-4" />
          <span>Choose Your Interview Type</span>
        </div>
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          AI-Powered Interview Practice
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          {!resumeUploaded
            ? "Upload your resume first to unlock personalized interview sessions tailored to your experience and skills."
            : isAnalyzing
            ? "Your resume is being analyzed by AI. Please wait..."
            : "Your resume has been analyzed by AI. Select an interview type to begin practicing with personalized questions."}
        </p>
        {resumeUploaded && resumeData && !isAnalyzing && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200"
            >
              <Target className="w-3 h-3 mr-1" />
              Skills: {resumeData.skills?.length || 0} identified
            </Badge>
            <Badge
              variant="secondary"
              className="bg-purple-50 text-purple-700 border-purple-200"
            >
              <Code className="w-3 h-3 mr-1" />
              Projects: {resumeData.projects?.length || 0} analyzed
            </Badge>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {interviewTypes.map((type) => {
          const Icon = type.icon;
          const isEnabled = resumeUploaded && !isAnalyzing;

          return (
            <TooltipProvider key={type.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`relative transition-all duration-300 transform ${
                      isEnabled
                        ? `cursor-pointer border-2 ${type.borderColor} ${type.hoverBorderColor} hover:shadow-2xl hover:scale-105 bg-white/80 backdrop-blur-sm`
                        : "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50/80 backdrop-blur-sm pointer-events-none"
                    } group overflow-hidden`}
                    onClick={() => handleStartInterview(type.id)}
                  >
                    {/* Animated background gradient */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${
                        isEnabled ? type.color : "from-gray-400 to-gray-500"
                      } opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                    ></div>

                    {/* Lock overlay for disabled cards */}
                    {!isEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 backdrop-blur-sm z-10">
                        <div className="text-center space-y-2">
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-8 w-8 text-gray-400 mx-auto animate-spin" />
                              <p className="text-sm font-medium text-gray-500">
                                Analyzing Resume...
                              </p>
                            </>
                          ) : (
                            <>
                              <Lock className="h-8 w-8 text-gray-400 mx-auto" />
                              <p className="text-sm font-medium text-gray-500">
                                Upload Resume to Unlock
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4 relative z-20">
                      <div className="flex justify-center mb-4">
                        <div
                          className={`p-4 rounded-full ${
                            isEnabled
                              ? `bg-gradient-to-r ${type.color}`
                              : "bg-gray-400"
                          } text-white shadow-lg transform transition-transform duration-300 ${
                            isEnabled ? "group-hover:scale-110" : ""
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold">
                        {type.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {type.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="text-center space-y-4 relative z-20">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <Target className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {type.questions}
                          </span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {type.duration}
                          </span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Sparkles className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {type.difficulty}
                          </span>
                        </div>
                      </div>

                      <Button
                        className={`w-full ${
                          isEnabled
                            ? `bg-gradient-to-r ${type.color} text-white hover:opacity-90`
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        } transition-all duration-300`}
                        disabled={!isEnabled}
                      >
                        {isEnabled ? "Start Interview" : "Resume Required"}
                      </Button>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!resumeUploaded
                      ? "Upload your resume to unlock this interview type"
                      : isAnalyzing
                      ? "Please wait while we analyze your resume"
                      : `Start ${type.title.toLowerCase()} practice session`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-center">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <span>How AI Interview Prep Works</span>
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-blue-50/50">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-blue-700 mb-1">
                    AI Resume Analysis
                  </h4>
                  <p>
                    Advanced AI analyzes your resume to understand your skills,
                    experience, and career level
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-green-50/50">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-green-700 mb-1">
                    Personalized Questions
                  </h4>
                  <p>
                    Generates tailored interview questions based on your
                    specific background and target role
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-purple-50/50">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-purple-700 mb-1">
                    Detailed Feedback
                  </h4>
                  <p>
                    Provides comprehensive feedback with scoring and improvement
                    suggestions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
