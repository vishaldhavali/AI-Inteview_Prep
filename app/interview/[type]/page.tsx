"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateQuestion, validateAnswer } from "@/lib/gemini";
import VoiceRecorder from "@/components/voice-recorder";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TextToSpeech } from "@/components/ui/text-to-speech";
import {
  ArrowLeft,
  Send,
  Lightbulb,
  ThumbsUp,
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  CheckCircle,
  Volume2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [answerGiven, setAnswerGiven] = useState(false);
  const [showIdealAnswer, setShowIdealAnswer] = useState(false);
  const [idealAnswer, setIdealAnswer] = useState("");
  const [generatingIdeal, setGeneratingIdeal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const interviewType = params.type as
    | "technical"
    | "behavioral"
    | "management";

  const typeConfig = {
    technical: {
      title: "Technical Interview",
      description: "Programming skills and technical knowledge",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    behavioral: {
      title: "Behavioral Interview",
      description: "Soft skills and problem-solving approach",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
    },
    management: {
      title: "Management Round",
      description: "Leadership potential and strategic thinking",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
    },
  };

  useEffect(() => {
    initializeInterview();

    // Cleanup function to stop any ongoing speech when navigating away
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Check if user has given an answer
    setAnswerGiven(userAnswer.trim().length > 0);
  }, [userAnswer]);

  const initializeInterview = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User error:", userError);
        toast({
          title: "Authentication Error",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      console.log("User found:", user.id);
      setUser(user);

      // Get user's resume data
      const { data: resume, error: resumeError } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .single();

      if (resumeError || !resume) {
        console.error("Resume error:", resumeError);
        toast({
          title: "Resume Required",
          description:
            "Please upload your resume first to start the interview.",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      console.log("Resume found:", resume.id);
      setResumeData(resume);
      await generateNewQuestion(resume, user);
    } catch (error) {
      console.error("Error initializing interview:", error);
      toast({
        title: "Error",
        description: "Failed to initialize interview. Please try again.",
        variant: "destructive",
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const generateNewQuestion = async (resume: any, currentUser: any) => {
    try {
      console.log(
        "Generating question for user:",
        currentUser?.id,
        "resume:",
        resume?.id
      );

      if (!currentUser || !resume) {
        throw new Error("Missing user or resume data");
      }

      const question = await generateQuestion(
        interviewType,
        resume,
        previousQuestions
      );
      console.log("Generated question:", question);

      // Save question to database
      const { data: questionData, error } = await supabase
        .from("questions")
        .insert({
          user_id: currentUser.id,
          resume_id: resume.id,
          type: interviewType,
          question_text: question,
        })
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Question saved:", questionData.id);
      setCurrentQuestion(question);
      setQuestionId(questionData.id);
      setPreviousQuestions((prev) => [...prev, question]);
      setShowResults(false);
      setUserAnswer("");
      setValidationResult(null);
      setAnswerGiven(false);
      setShowIdealAnswer(false);
      setIdealAnswer("");
    } catch (error) {
      console.error("Error generating question:", error);
      toast({
        title: "Error",
        description: "Failed to generate question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTranscriptChange = (transcript: string) => {
    setUserAnswer(transcript);
  };

  const handleRecordingComplete = (transcript: string) => {
    setUserAnswer(transcript);
  };

  const handleValidateAnswer = async () => {
    if (!userAnswer.trim()) {
      toast({
        title: "No Answer Provided",
        description: "Please provide an answer before validation.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Validate answer with Gemini AI
      const validation = await validateAnswer(currentQuestion, userAnswer);

      // Save answer to database
      const { error } = await supabase.from("answers").insert({
        user_id: user.id,
        question_id: questionId,
        answer_text: userAnswer,
        score: validation.score,
        ideal_answer: validation.idealAnswer,
        feedback: validation.feedback,
      });

      if (error) throw error;

      setValidationResult(validation);
      setShowResults(true);

      toast({
        title: "Answer Validated! 🎉",
        description: `You scored ${validation.score}/10 on this question.`,
      });
    } catch (error) {
      console.error("Error validating answer:", error);
      toast({
        title: "Validation Error",
        description: "Failed to validate answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowIdealAnswer = async () => {
    if (idealAnswer) {
      setShowIdealAnswer(!showIdealAnswer);
      return;
    }

    setGeneratingIdeal(true);
    try {
      // Generate ideal answer using Gemini
      const validation = await validateAnswer(currentQuestion, "");
      setIdealAnswer(validation.idealAnswer);
      setShowIdealAnswer(true);
    } catch (error) {
      console.error("Error generating ideal answer:", error);
      toast({
        title: "Error",
        description: "Failed to generate ideal answer.",
        variant: "destructive",
      });
    } finally {
      setGeneratingIdeal(false);
    }
  };

  const handleNextQuestion = async () => {
    try {
      // Reset all states
      setUserAnswer("");
      setShowResults(false);
      setValidationResult(null);
      setAnswerGiven(false);
      setShowIdealAnswer(false);
      setIdealAnswer("");
      setQuestionCount((prev) => prev + 1);

      // Reset voice recorder state
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsRecording(false);

      // Reset the transcript
      voiceRecorderRef.current?.resetTranscript();

      // Generate new question
      await generateNewQuestion(resumeData, user);
    } catch (error) {
      console.error("Error generating next question:", error);
      toast({
        title: "Error",
        description: "Failed to generate next question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSpeakIdealAnswer = () => {
    if (validationResult?.idealAnswer) {
      speak(validationResult.idealAnswer);
    } else if (idealAnswer) {
      speak(idealAnswer);
    }
  };

  const handleSpeakText = (text: string) => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      console.error("Speech synthesis error");
    };

    window.speechSynthesis.speak(utterance);
  };

  // Add cleanup for speech synthesis
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, []);

  // Replace the existing button with TextToSpeech component
  const renderSpeakButton = (text: string) => (
    <TextToSpeech
      text={text}
      onStateChange={(speaking) => setIsSpeaking(speaking)}
      className="hover:bg-blue-100 transition-all duration-200"
    />
  );

  // Add a reference to the voice recorder component
  const voiceRecorderRef = useRef<{ resetTranscript: () => void } | null>(null);

  // Update the voice recorder component props
  const handleRecordingStart = () => {
    setIsRecording(true);
    // Clear previous answer when starting new recording
    setUserAnswer("");
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <Brain className="h-6 w-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-600 font-medium">
            Preparing your personalized interview...
          </p>
        </div>
      </div>
    );
  }

  const config = typeConfig[interviewType];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <Badge variant="outline" className={`${config.textColor} ml-auto`}>
          Question {questionCount}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle
            className={`text-3xl font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}
          >
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-500" />
            <CardTitle>Interview Question</CardTitle>
          </div>
          <TextToSpeech text={currentQuestion} />
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{currentQuestion}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <VoiceRecorder
          ref={voiceRecorderRef}
          onTranscriptChange={handleTranscriptChange}
          onRecordingComplete={handleRecordingComplete}
          isRecording={isRecording}
          onStartRecording={handleRecordingStart}
          onStopRecording={handleRecordingStop}
        />

        {userAnswer && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Your Answer</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-4">{userAnswer}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleValidateAnswer}
                      disabled={!answerGiven || submitting}
                      className={`w-full ${
                        answerGiven
                          ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                          : "bg-gray-300"
                      } transition-all duration-200`}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Validate Answer
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {answerGiven
                        ? "Get AI feedback on your answer"
                        : "Please provide an answer first"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleShowIdealAnswer}
                      disabled={generatingIdeal}
                      variant="outline"
                      className="w-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-200"
                    >
                      {generatingIdeal ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Sample Answer
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View an ideal answer for this question</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleNextQuestion}
                      variant="outline"
                      className="w-full hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all duration-200"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Next Question
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Skip to the next question</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>

      {showResults && validationResult && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg text-green-800">
                  Score: {validationResult.score}/10
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-800 mb-2">
                    AI Feedback:
                  </h4>
                  <p className="text-green-700 leading-relaxed">
                    {validationResult.feedback}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg text-blue-800">
                    Sample Ideal Answer
                  </CardTitle>
                </div>
                <TextToSpeech
                  text={validationResult.idealAnswer}
                  onStateChange={(speaking) => setIsSpeaking(speaking)}
                  className="hover:bg-blue-100 transition-all duration-200"
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 leading-relaxed">
                {validationResult.idealAnswer}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {showIdealAnswer && idealAnswer && !showResults && (
        <Card className={`mb-6 border ${config.borderColor}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-500" />
              <CardTitle>Sample Answer</CardTitle>
            </div>
            <TextToSpeech text={idealAnswer} />
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg ${config.bgColor}`}>
              <p className={`${config.textColor}`}>{idealAnswer}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
