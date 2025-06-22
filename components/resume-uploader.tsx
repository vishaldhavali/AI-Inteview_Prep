"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  analyzeResumeFromPDF,
  analyzeResume,
  isGeminiConfigured,
} from "@/lib/gemini";
import { extractTextFromPDF } from "@/lib/pdf-extractor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Brain,
  AlertTriangle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ResumeUploaderProps, ResumeData } from "@/types/app";
import { logger, handleError, ErrorCategory } from "@/lib/utils/error-handler";

export default function ResumeUploader({
  onUploadComplete,
}: ResumeUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<ResumeData | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [analysisMethod, setAnalysisMethod] = useState<
    "direct" | "text" | "fallback"
  >("");
  const [analysisError, setAnalysisError] = useState<string>("");
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        const file = acceptedFiles[0];
        if (file && file.type === "application/pdf") {
          // Check file size - 4MB limit for direct PDF processing
          const maxDirectSize = 4 * 1024 * 1024; // 4MB
          const maxTotalSize = 5 * 1024 * 1024; // 5MB

          if (file.size > maxTotalSize) {
            const error = handleError(
              new Error("File size exceeds limit"),
              ErrorCategory.VALIDATION,
              "resume upload"
            );
            toast(error);
            return;
          }

          setUploadedFile(file);
          setExtractedText("");
          setAnalysisResult(null);
          setAnalysisMethod("");
          setAnalysisError("");

          // Show file size warning if it's large
          if (file.size > maxDirectSize) {
            toast({
              title: "Large File Detected",
              description: `File is ${(file.size / 1024 / 1024).toFixed(
                1
              )}MB. Will use text extraction method for analysis.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "PDF Uploaded Successfully",
              description: `${file.name} (${(file.size / 1024 / 1024).toFixed(
                1
              )}MB) is ready for AI analysis.`,
            });
          }
        } else {
          const error = handleError(
            new Error("Invalid file type"),
            ErrorCategory.VALIDATION,
            "resume upload"
          );
          toast(error);
        }
      } catch (error) {
        const toastError = handleError(
          error,
          ErrorCategory.STORAGE,
          "resume upload"
        );
        toast(toastError);
      }
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleUpload = async () => {
    if (!uploadedFile) {
      const error = handleError(
        new Error("No file selected"),
        ErrorCategory.VALIDATION,
        "resume upload"
      );
      toast(error);
      return;
    }

    setUploading(true);
    setAnalyzing(false);
    setAnalysisError("");

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${uploadedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("resumes").getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      setUploading(false);
      setAnalyzing(true);

      let analysis: ResumeData;
      let method = "fallback";
      const fileSize = uploadedFile.size;
      const maxDirectSize = 4 * 1024 * 1024;

      try {
        if (isGeminiConfigured()) {
          // Method 1: Direct PDF processing (if file is small enough)
          if (fileSize <= maxDirectSize) {
            try {
              logger.info("Attempting direct PDF analysis with Gemini...");
              analysis = await analyzeResumeFromPDF(uploadedFile);
              method = "direct";

              // Add file information to analysis result
              analysis = {
                ...analysis,
                file_url: publicUrl,
                file_name: uploadedFile.name,
                user_id: user.id,
              };

              setAnalysisResult(analysis);

              // Set extracted text from Gemini response if available
              if (analysis.extractedText) {
                setExtractedText(analysis.extractedText);
              }

              logger.info("Direct PDF analysis successful!");

              toast({
                title: "🤖 Direct PDF Analysis Complete",
                description: "Gemini successfully read your PDF directly!",
              });
            } catch (directError: any) {
              logger.warn("Direct PDF analysis failed:", directError);
              setAnalysisError(
                `Direct analysis failed: ${directError.message}`
              );

              // Fall back to text extraction method
              throw new Error(
                "Direct PDF analysis failed, trying text extraction"
              );
            }
          } else {
            logger.info(
              "File too large for direct processing, using text extraction..."
            );
            throw new Error("File too large for direct processing");
          }
        } else {
          throw new Error("Gemini not configured");
        }
      } catch (aiError: any) {
        logger.warn("Trying text extraction method:", aiError);

        // Method 2: Extract text first, then analyze
        try {
          logger.info("Extracting text from PDF...");
          const text = await extractTextFromPDF(uploadedFile);
          setExtractedText(text);

          if (text.length > 100 && isGeminiConfigured()) {
            logger.info("Analyzing extracted text with Gemini...");
            analysis = await analyzeResume(text);
            method = "text";

            // Add file information to analysis result
            analysis = {
              ...analysis,
              file_url: publicUrl,
              file_name: uploadedFile.name,
              user_id: user.id,
            };

            setAnalysisResult(analysis);

            logger.info("Text-based analysis successful!");

            toast({
              title: "📝 Text Analysis Complete",
              description: "Successfully analyzed extracted text with AI.",
            });
          } else {
            throw new Error(
              "Insufficient text extracted or Gemini not available"
            );
          }
        } catch (textError: any) {
          logger.error("Text extraction/analysis failed:", textError);
          setAnalysisError(`Text analysis failed: ${textError.message}`);

          // Method 3: Fallback to basic text analysis
          logger.info("Using fallback analysis method...");
          analysis = createEnhancedFallbackAnalysis(
            extractedText,
            uploadedFile.name
          );

          // Add file information to analysis result
          analysis = {
            ...analysis,
            file_url: publicUrl,
            file_name: uploadedFile.name,
            user_id: user.id,
          };

          method = "fallback";
          setAnalysisResult(analysis);

          toast({
            title: "⚠️ Using Basic Analysis",
            description:
              "AI analysis unavailable. Using basic text analysis instead.",
            variant: "destructive",
          });
        }
      }

      setAnalysisMethod(method);
      await onUploadComplete(analysis);
    } catch (error: any) {
      const toastError = handleError(
        error,
        ErrorCategory.RESUME,
        "resume processing"
      );
      toast(toastError);
      setUploading(false);
      setAnalyzing(false);
      setAnalysisError(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const createEnhancedFallbackAnalysis = (text: string, fileName: string) => {
    // Enhanced fallback that analyzes extracted text more intelligently
    const lowerText = text.toLowerCase();

    // More comprehensive skill detection
    const skillCategories = {
      frontend: [
        "react",
        "vue",
        "angular",
        "javascript",
        "typescript",
        "html",
        "css",
        "sass",
        "tailwind",
        "bootstrap",
      ],
      backend: [
        "node.js",
        "express",
        "python",
        "django",
        "flask",
        "java",
        "spring",
        "php",
        "laravel",
        ".net",
      ],
      database: [
        "mongodb",
        "postgresql",
        "mysql",
        "redis",
        "firebase",
        "sql",
        "nosql",
      ],
      cloud: [
        "aws",
        "azure",
        "gcp",
        "docker",
        "kubernetes",
        "heroku",
        "vercel",
        "netlify",
      ],
      mobile: ["react native", "flutter", "swift", "kotlin", "ionic"],
      tools: [
        "git",
        "github",
        "gitlab",
        "jenkins",
        "webpack",
        "vite",
        "npm",
        "yarn",
      ],
    };

    const foundSkills: string[] = [];
    Object.values(skillCategories)
      .flat()
      .forEach((skill) => {
        if (lowerText.includes(skill.toLowerCase())) {
          foundSkills.push(skill);
        }
      });

    // Extract experience more accurately
    const experienceYears = extractExperienceYears(text);
    const roles = extractRoles(text);
    const companies = extractCompanies(text);
    const projects = extractProjects(text);

    // Determine career level based on multiple factors
    let careerLevel = "fresher";
    if (
      experienceYears >= 5 ||
      roles.some((r) => r.includes("senior") || r.includes("lead"))
    ) {
      careerLevel = "senior";
    } else if (
      experienceYears >= 2 ||
      roles.some((r) => r.includes("developer") || r.includes("engineer"))
    ) {
      careerLevel = "mid";
    } else if (
      experienceYears >= 1 ||
      roles.some((r) => r.includes("junior") || r.includes("intern"))
    ) {
      careerLevel = "junior";
    }

    return {
      skills:
        foundSkills.length > 0
          ? foundSkills
          : ["JavaScript", "React", "Node.js", "SQL"],
      experience: {
        totalYears: experienceYears,
        roles: roles,
        companies: companies,
        domains: determineDomains(foundSkills),
      },
      projects: projects,
      education: extractEducation(text),
      keywords: foundSkills,
      summary: generateSummary(foundSkills, experienceYears, careerLevel),
      strengths: ["Problem Solving", "Technical Skills", "Team Collaboration"],
      careerLevel: careerLevel,
      extractedText: text.substring(0, 1000) + "...", // First 1000 chars for reference
    };
  };

  const extractExperienceYears = (text: string): number => {
    const patterns = [
      /(\d+)\s*years?\s*(of\s*)?(experience|exp)/gi,
      /(\d+)\s*yr/gi,
      /experience.*?(\d+)\s*years?/gi,
    ];

    const years: number[] = [];
    patterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const yearMatch = match.match(/\d+/);
          if (yearMatch) {
            years.push(Number.parseInt(yearMatch[0]));
          }
        });
      }
    });

    return years.length > 0 ? Math.max(...years) : 0;
  };

  const extractRoles = (text: string): string[] => {
    const rolePatterns = [
      /software\s+(developer|engineer)/gi,
      /full\s*stack\s+(developer|engineer)/gi,
      /frontend\s+(developer|engineer)/gi,
      /backend\s+(developer|engineer)/gi,
      /web\s+(developer|engineer)/gi,
      /(senior|junior|lead)\s+(developer|engineer)/gi,
      /intern/gi,
      /analyst/gi,
      /consultant/gi,
    ];

    const roles: string[] = [];
    rolePatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        roles.push(...matches.map((m) => m.trim()));
      }
    });

    return [...new Set(roles)]; // Remove duplicates
  };

  const extractCompanies = (text: string): string[] => {
    // Look for company patterns
    const companyPatterns = [
      /\b[A-Z][a-z]+\s+(Inc|Corp|LLC|Ltd|Technologies|Solutions|Systems|Labs)\b/g,
      /\b[A-Z][A-Z]+\b/g, // Acronyms like IBM, TCS, etc.
    ];

    const companies: string[] = [];
    companyPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        companies.push(...matches.slice(0, 3)); // Limit to 3 companies
      }
    });

    return companies.length > 0 ? [...new Set(companies)] : ["Tech Company"];
  };

  const extractProjects = (text: string): any[] => {
    const projectKeywords = [
      "project",
      "built",
      "developed",
      "created",
      "implemented",
      "designed",
    ];
    const hasProjects = projectKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword)
    );

    if (hasProjects) {
      // Try to extract actual project names (this is basic, could be enhanced)
      const projectLines = text
        .split("\n")
        .filter((line) =>
          projectKeywords.some((keyword) =>
            line.toLowerCase().includes(keyword)
          )
        );

      return projectLines.slice(0, 3).map((line, index) => ({
        name: `Project ${index + 1}`,
        description: line.substring(0, 100) + "...",
        technologies: ["JavaScript", "React", "Node.js"], // Default
        role: "Developer",
      }));
    }

    return [];
  };

  const extractEducation = (text: string) => {
    const degreeMatch = text.match(
      /(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech|diploma)/gi
    );
    const fieldMatch = text.match(
      /(computer science|software|engineering|information technology|it|computer)/gi
    );
    const yearMatch = text.match(/(20\d{2}|19\d{2})/g);

    return {
      degree: degreeMatch ? degreeMatch[0] : "Bachelor's",
      field: fieldMatch ? fieldMatch[0] : "Computer Science",
      institution: "University",
      year: yearMatch ? yearMatch[yearMatch.length - 1] : "2024",
    };
  };

  const determineDomains = (skills: string[]): string[] => {
    const domains = [];
    if (
      skills.some((s) =>
        ["react", "vue", "angular", "html", "css"].includes(s.toLowerCase())
      )
    ) {
      domains.push("Frontend Development");
    }
    if (
      skills.some((s) =>
        ["node.js", "python", "java", "express", "django"].includes(
          s.toLowerCase()
        )
      )
    ) {
      domains.push("Backend Development");
    }
    if (
      skills.some((s) =>
        ["react native", "flutter", "swift", "kotlin"].includes(s.toLowerCase())
      )
    ) {
      domains.push("Mobile Development");
    }
    if (
      skills.some((s) =>
        ["aws", "docker", "kubernetes", "azure"].includes(s.toLowerCase())
      )
    ) {
      domains.push("Cloud & DevOps");
    }

    return domains.length > 0 ? domains : ["Software Development"];
  };

  const generateSummary = (
    skills: string[],
    years: number,
    level: string
  ): string => {
    const primarySkills = skills.slice(0, 3).join(", ");
    return `${
      level.charAt(0).toUpperCase() + level.slice(1)
    } developer with ${years} years of experience in ${primarySkills}. Passionate about building scalable applications and learning new technologies.`;
  };

  const getAnalysisMethodBadge = () => {
    const methods = {
      direct: {
        label: "🚀 Direct PDF",
        color: "bg-green-100 text-green-800",
        desc: "Gemini read your PDF directly",
      },
      text: {
        label: "📝 Text Analysis",
        color: "bg-blue-100 text-blue-800",
        desc: "AI analyzed extracted text",
      },
      fallback: {
        label: "📊 Enhanced Analysis",
        color: "bg-orange-100 text-orange-800",
        desc: "Smart content analysis",
      },
    };

    const method = methods[analysisMethod as keyof typeof methods];
    return method ? (
      <Badge className={method.color} title={method.desc}>
        {method.label}
      </Badge>
    ) : null;
  };

  const getFileSizeWarning = () => {
    if (!uploadedFile) return null;

    const fileSize = uploadedFile.size;
    const maxDirectSize = 4 * 1024 * 1024; // 4MB

    if (fileSize > maxDirectSize) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Large File Notice</p>
              <p className="text-amber-700">
                File is {(fileSize / 1024 / 1024).toFixed(1)}MB. Files over 4MB
                will use text extraction method instead of direct PDF
                processing.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Upload Your Resume</CardTitle>
        <CardDescription>
          Upload your resume in PDF format for AI-powered analysis and
          personalized interview questions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className={`border-2 ${
              uploadedFile ? "border-green-200 bg-green-50" : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                {uploadedFile ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Upload className="h-5 w-5 text-gray-400" />
                )}
                <span
                  className={`font-medium ${
                    uploadedFile ? "text-green-800" : "text-gray-600"
                  }`}
                >
                  1. Upload PDF
                </span>
              </div>
              {uploadedFile && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Ready for analysis
                </p>
              )}
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              analyzing
                ? "border-blue-200 bg-blue-50"
                : analysisResult
                ? "border-green-200 bg-green-50"
                : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                {analyzing ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : analysisResult ? (
                  <Brain className="h-5 w-5 text-green-600" />
                ) : (
                  <Zap className="h-5 w-5 text-gray-400" />
                )}
                <span
                  className={`font-medium ${
                    analysisResult
                      ? "text-green-800"
                      : analyzing
                      ? "text-blue-800"
                      : "text-gray-600"
                  }`}
                >
                  2. AI Analysis
                </span>
              </div>
              {analyzing && (
                <p className="text-xs text-blue-600 mt-1">🤖 Processing...</p>
              )}
              {analysisResult && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Analysis complete
                </p>
              )}
              {analysisError && (
                <p className="text-xs text-red-600 mt-1">⚠️ Had issues</p>
              )}
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              analysisResult
                ? "border-green-200 bg-green-50"
                : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                {analysisResult ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-400" />
                )}
                <span
                  className={`font-medium ${
                    analysisResult ? "text-green-800" : "text-gray-600"
                  }`}
                >
                  3. Ready to Interview
                </span>
              </div>
              {analysisResult && (
                <p className="text-xs text-green-600 mt-1">
                  🎯 Questions personalized
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gemini API Status */}
        <div
          className={`border rounded-lg p-4 ${
            isGeminiConfigured()
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {isGeminiConfigured() ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <h3
                className={`font-medium ${
                  isGeminiConfigured() ? "text-green-800" : "text-amber-800"
                }`}
              >
                {isGeminiConfigured()
                  ? "🚀 Gemini AI Ready"
                  : "⚠️ Limited AI Analysis"}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  isGeminiConfigured() ? "text-green-700" : "text-amber-700"
                }`}
              >
                {isGeminiConfigured()
                  ? "Gemini will read PDFs under 4MB directly. Larger files will use text extraction method."
                  : "Using enhanced fallback analysis. Questions will still be customized based on your resume content."}
              </p>
            </div>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            {uploadedFile ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div>
                  <p className="text-lg font-medium text-green-700">
                    {uploadedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    ✅ Ready for AI analysis
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive
                      ? "Drop your resume here"
                      : "Drag & drop your resume here"}
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to browse files
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PDF files up to 5MB • Files under 4MB get direct AI
                    processing
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* File size warning */}
        {getFileSizeWarning()}

        {/* Show analysis error if any */}
        {analysisError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Analysis Issues</h3>
                <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                <p className="text-xs text-red-600 mt-2">
                  Don't worry - the system will try alternative methods
                  automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show extracted text preview if available */}
        {extractedText && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                {showExtractedText ? "Hide" : "Show"} Extracted Content (
                {extractedText.length} characters)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Content Extracted from PDF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded text-xs font-mono whitespace-pre-wrap">
                    {extractedText}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {uploadedFile && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-medium">{uploadedFile.name}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-500">
                    PDF Document •{" "}
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                  {getAnalysisMethodBadge()}
                </div>
              </div>
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading || analyzing}
              className="min-w-[140px]"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading
                ? "Uploading..."
                : analyzing
                ? "Analyzing..."
                : "Analyze with AI"}
            </Button>
          </div>
        )}

        {/* Show analysis results */}
        {analysisResult && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg text-blue-800">
                    🤖 AI Analysis Results
                  </CardTitle>
                  {getAnalysisMethodBadge()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnalysis(!showAnalysis)}
                >
                  {showAnalysis ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showAnalysis ? "Hide" : "Show"} Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResult.skills?.length || 0}
                    </div>
                    <div className="text-sm text-blue-700">Skills Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResult.projects?.length || 0}
                    </div>
                    <div className="text-sm text-blue-700">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 capitalize">
                      {analysisResult.careerLevel || "N/A"}
                    </div>
                    <div className="text-sm text-blue-700">Level</div>
                  </div>
                </div>

                {/* Skills Preview */}
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">
                    🛠️ Skills Identified:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.skills
                      ?.slice(0, 10)
                      .map((skill: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </Badge>
                      ))}
                    {analysisResult.skills?.length > 10 && (
                      <Badge variant="outline" className="text-blue-600">
                        +{analysisResult.skills.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Detailed Analysis */}
                {showAnalysis && (
                  <div className="space-y-4 pt-4 border-t border-blue-200">
                    {analysisResult.summary && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">
                          📋 Professional Summary:
                        </h4>
                        <p className="text-blue-700 text-sm">
                          {analysisResult.summary}
                        </p>
                      </div>
                    )}

                    {analysisResult.experience && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">
                          💼 Experience Analysis:
                        </h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>
                            • Roles:{" "}
                            {analysisResult.experience.roles?.join(", ") ||
                              "N/A"}
                          </p>
                          <p>
                            • Companies:{" "}
                            {analysisResult.experience.companies?.join(", ") ||
                              "N/A"}
                          </p>
                          <p>
                            • Domains:{" "}
                            {analysisResult.experience.domains?.join(", ") ||
                              "N/A"}
                          </p>
                        </div>
                      </div>
                    )}

                    {analysisResult.projects &&
                      analysisResult.projects.length > 0 && (
                        <div>
                          <h4 className="font-medium text-blue-800 mb-2">
                            🚀 Projects Found:
                          </h4>
                          <div className="space-y-2">
                            {analysisResult.projects.map(
                              (project: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-white p-3 rounded border"
                                >
                                  <h5 className="font-medium text-blue-800">
                                    {project.name}
                                  </h5>
                                  <p className="text-sm text-blue-700">
                                    {project.description}
                                  </p>
                                  {project.technologies && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {project.technologies.map(
                                        (tech: string, techIndex: number) => (
                                          <Badge
                                            key={techIndex}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {tech}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {analysisResult.education && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">
                          🎓 Education:
                        </h4>
                        <div className="text-sm text-blue-700">
                          <p>
                            {analysisResult.education.degree} in{" "}
                            {analysisResult.education.field}
                          </p>
                          <p>
                            {analysisResult.education.institution} (
                            {analysisResult.education.year})
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>
            🚀 <strong>FIXED:</strong> Efficient PDF processing prevents memory
            issues
          </p>
          <p>
            📄 Supported: PDF files up to 5MB • 🤖 Direct processing for files
            under 4MB
          </p>
          <p>
            🎯 Multiple analysis methods ensure your resume is always processed
            successfully
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
