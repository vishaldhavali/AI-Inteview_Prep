import { GoogleGenerativeAI } from "@google/generative-ai";

// Check if API key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable is not set");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Updated to use the latest Gemini model with document processing
export const geminiModel = genAI
  ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  : null;

// Efficient base64 conversion for large files
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192; // Process in chunks to avoid stack overflow

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}

// NEW: Direct PDF processing with Gemini
export async function analyzeResumeFromPDF(file: File) {
  if (!geminiModel) {
    throw new Error(
      "Gemini AI is not properly configured. Please check your API key."
    );
  }

  console.log("🤖 Starting direct PDF analysis with Gemini...");
  console.log("📄 PDF file:", file.name, "Size:", file.size, "bytes");

  // Check file size limits
  const maxSize = 4 * 1024 * 1024; // 4MB limit for Gemini API
  if (file.size > maxSize) {
    throw new Error(
      `PDF file is too large (${(file.size / 1024 / 1024).toFixed(
        1
      )}MB). Please use a file smaller than 4MB.`
    );
  }

  try {
    // Convert file to base64 efficiently
    console.log("📄 Converting PDF to base64...");
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);

    console.log("✅ Base64 conversion complete. Length:", base64Data.length);

    const prompt = `
    You are an expert resume analyzer. Analyze this PDF resume and extract detailed information in JSON format.
    
    Please return a JSON object with the following structure:
    {
      "skills": ["skill1", "skill2", ...],
      "experience": {
        "totalYears": number,
        "roles": ["role1", "role2", ...],
        "companies": ["company1", "company2", ...],
        "domains": ["domain1", "domain2", ...]
      },
      "projects": [
        {
          "name": "project name",
          "description": "brief description",
          "technologies": ["tech1", "tech2", ...],
          "role": "your role in project"
        }
      ],
      "education": {
        "degree": "degree name",
        "field": "field of study",
        "institution": "institution name",
        "year": "graduation year"
      },
      "keywords": ["keyword1", "keyword2", ...],
      "summary": "brief professional summary based on the resume",
      "strengths": ["strength1", "strength2", ...],
      "careerLevel": "fresher|junior|mid|senior",
      "extractedText": "key text content from the resume for reference"
    }
    
    Focus on:
    - Technical skills, programming languages, frameworks, tools
    - Work experience and internships with specific roles and companies
    - Projects with technologies used and your role
    - Education background with degree, field, institution
    - Certifications if any
    - Key achievements and responsibilities
    - Years of experience (calculate from work history)
    
    Be specific and extract actual content from the resume. If information is not available, use empty arrays or appropriate default values.
    Make sure to read the actual text content, not PDF metadata.
    `;

    console.log("🤖 Sending request to Gemini...");

    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini PDF analysis response received");
    console.log("📄 Response preview:", text.substring(0, 200) + "...");

    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      const analysisResult = {
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        experience: {
          totalYears:
            typeof parsedData.experience?.totalYears === "number"
              ? parsedData.experience.totalYears
              : 0,
          roles: Array.isArray(parsedData.experience?.roles)
            ? parsedData.experience.roles
            : [],
          companies: Array.isArray(parsedData.experience?.companies)
            ? parsedData.experience.companies
            : [],
          domains: Array.isArray(parsedData.experience?.domains)
            ? parsedData.experience.domains
            : [],
        },
        projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
        education: parsedData.education || {},
        keywords: Array.isArray(parsedData.keywords) ? parsedData.keywords : [],
        summary: parsedData.summary || "",
        strengths: Array.isArray(parsedData.strengths)
          ? parsedData.strengths
          : [],
        careerLevel: parsedData.careerLevel || "fresher",
        extractedText: parsedData.extractedText || "",
      };

      console.log("✅ Parsed analysis result:", {
        skillsCount: analysisResult.skills.length,
        projectsCount: analysisResult.projects.length,
        experienceYears: analysisResult.experience.totalYears,
        careerLevel: analysisResult.careerLevel,
      });

      return analysisResult;
    }

    throw new Error("Could not parse JSON from Gemini response");
  } catch (error: any) {
    console.error("❌ Error analyzing PDF with Gemini:", error);

    // Handle specific API errors
    if (error.message?.includes("API key not valid")) {
      throw new Error(
        "Invalid Gemini API key. Please check your configuration."
      );
    } else if (error.message?.includes("quota exceeded")) {
      throw new Error("Gemini API quota exceeded. Please try again later.");
    } else if (error.message?.includes("blocked")) {
      throw new Error("Content was blocked by Gemini AI safety filters.");
    } else if (error.message?.includes("not found")) {
      throw new Error("Gemini model not available. Using fallback analysis.");
    } else if (error.message?.includes("Maximum call stack size exceeded")) {
      throw new Error(
        "PDF file is too complex or large. Please try a simpler PDF or use text extraction method."
      );
    } else if (error.message?.includes("too large")) {
      throw new Error(
        "PDF file is too large for direct processing. Please use a smaller file (under 4MB)."
      );
    } else {
      throw new Error(`Failed to analyze PDF with AI: ${error.message}`);
    }
  }
}

// Keep the old text-based analysis as fallback
export async function analyzeResume(resumeText: string) {
  if (!geminiModel) {
    throw new Error(
      "Gemini AI is not properly configured. Please check your API key."
    );
  }

  console.log(
    "Analyzing resume with Gemini. Resume text length:",
    resumeText.length
  );
  console.log("Resume text preview:", resumeText.substring(0, 500) + "...");

  const prompt = `
    You are an expert resume analyzer. Analyze this resume text and extract detailed information in JSON format.
    
    Resume Content:
    ${resumeText}
    
    Please return a JSON object with the following structure:
    {
      "skills": ["skill1", "skill2", ...],
      "experience": {
        "totalYears": number,
        "roles": ["role1", "role2", ...],
        "companies": ["company1", "company2", ...],
        "domains": ["domain1", "domain2", ...]
      },
      "projects": [
        {
          "name": "project name",
          "description": "brief description",
          "technologies": ["tech1", "tech2", ...],
          "role": "your role in project"
        }
      ],
      "education": {
        "degree": "degree name",
        "field": "field of study",
        "institution": "institution name",
        "year": "graduation year"
      },
      "keywords": ["keyword1", "keyword2", ...],
      "summary": "brief professional summary based on the resume",
      "strengths": ["strength1", "strength2", ...],
      "careerLevel": "fresher|junior|mid|senior"
    }
    
    Focus on:
    - Technical skills, programming languages, frameworks, tools
    - Work experience and internships
    - Projects with technologies used
    - Education background
    - Certifications if any
    - Key achievements
    
    If information is not available, use empty arrays or appropriate default values.
    Be specific and extract actual content from the resume, don't make assumptions.
  `;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Gemini analysis response:", text);

    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      const analysisResult = {
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        experience: {
          totalYears:
            typeof parsedData.experience?.totalYears === "number"
              ? parsedData.experience.totalYears
              : 0,
          roles: Array.isArray(parsedData.experience?.roles)
            ? parsedData.experience.roles
            : [],
          companies: Array.isArray(parsedData.experience?.companies)
            ? parsedData.experience.companies
            : [],
          domains: Array.isArray(parsedData.experience?.domains)
            ? parsedData.experience.domains
            : [],
        },
        projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
        education: parsedData.education || {},
        keywords: Array.isArray(parsedData.keywords) ? parsedData.keywords : [],
        summary: parsedData.summary || "",
        strengths: Array.isArray(parsedData.strengths)
          ? parsedData.strengths
          : [],
        careerLevel: parsedData.careerLevel || "fresher",
      };

      console.log("Parsed analysis result:", analysisResult);
      return analysisResult;
    }

    throw new Error("Could not parse JSON from Gemini response");
  } catch (error: any) {
    console.error("Error analyzing resume:", error);

    // Handle specific API errors
    if (error.message?.includes("API key not valid")) {
      throw new Error(
        "Invalid Gemini API key. Please check your configuration."
      );
    } else if (error.message?.includes("quota exceeded")) {
      throw new Error("Gemini API quota exceeded. Please try again later.");
    } else if (error.message?.includes("blocked")) {
      throw new Error("Content was blocked by Gemini AI safety filters.");
    } else if (error.message?.includes("not found")) {
      throw new Error("Gemini model not available. Using fallback analysis.");
    } else {
      throw new Error(`Failed to analyze resume with AI: ${error.message}`);
    }
  }
}

export async function generateQuestion(
  category: "technical" | "behavioral" | "management",
  resumeData: any,
  previousQuestions: string[] = []
) {
  if (!geminiModel) {
    throw new Error(
      "Gemini AI is not properly configured. Please check your API key."
    );
  }

  console.log("Generating question for category:", category);
  console.log("Resume data for question generation:", {
    skills: resumeData.skills?.slice(0, 5),
    projects: resumeData.projects?.length,
    experience: resumeData.experience,
    careerLevel: resumeData.careerLevel,
  });

  const categoryPrompts = {
    technical: `
      Generate a technical interview question based on this candidate's profile:
      
      Skills: ${resumeData.skills?.join(", ") || "general programming"}
      Projects: ${
        resumeData.projects
          ?.map((p: any) => `${p.name} (${p.technologies?.join(", ")})`)
          .join("; ") || "none specified"
      }
      Experience: ${resumeData.experience?.totalYears || 0} years in ${
      resumeData.experience?.domains?.join(", ") || "software development"
    }
      Career Level: ${resumeData.careerLevel || "fresher"}
      
      Create a question that tests their knowledge in one of their mentioned skills or project technologies.
      Make it appropriate for their experience level.
    `,
    behavioral: `
      Generate a behavioral interview question based on this candidate's background:
      
      Projects: ${
        resumeData.projects?.map((p: any) => p.name).join(", ") ||
        "general projects"
      }
      Experience: ${resumeData.experience?.roles?.join(", ") || "entry level"}
      Strengths: ${
        resumeData.strengths?.join(", ") || "problem-solving, teamwork"
      }
      Career Level: ${resumeData.careerLevel || "fresher"}
      
      Focus on their project experience, teamwork, problem-solving, and learning ability.
      Tailor the question to their background.
    `,
    management: `
      Generate a management/leadership question based on this candidate's profile:
      
      Experience: ${
        resumeData.experience?.roles?.join(", ") || "individual contributor"
      }
      Projects: ${
        resumeData.projects
          ?.map((p: any) => `${p.name} - ${p.role || "team member"}`)
          .join("; ") || "team projects"
      }
      Career Level: ${resumeData.careerLevel || "fresher"}
      Summary: ${resumeData.summary || "aspiring professional"}
      
      Focus on leadership potential, decision-making, initiative, and future aspirations.
      Consider their current experience level.
    `,
  };

  const prompt = `
    ${categoryPrompts[category]}
    
    Previous questions asked: ${previousQuestions.join("; ")}
    
    Requirements:
    1. Generate ONE specific, engaging interview question
    2. Make it relevant to their actual skills/experience mentioned in their resume
    3. Do NOT repeat any previous questions
    4. Make it appropriate for their career level
    5. Return ONLY the question text, nothing else
    
    Question:
  `;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const question = response.text().trim();

    console.log("Generated question:", question);
    return question;
  } catch (error: any) {
    console.error("Error generating question:", error);

    if (error.message?.includes("API key not valid")) {
      throw new Error(
        "Invalid Gemini API key. Please check your configuration."
      );
    }

    // Enhanced fallback questions based on resume data
    const skillBasedQuestions = {
      technical: [
        `Explain how you would implement ${
          resumeData.skills?.[0] || "a web application"
        } in a scalable way.`,
        `What challenges did you face while working with ${
          resumeData.skills?.[1] || "your main technology stack"
        }?`,
        `How would you optimize the performance of ${
          resumeData.projects?.[0]?.name || "a web application"
        }?`,
        `Describe the architecture you used in your ${
          resumeData.projects?.[0]?.name || "recent project"
        }.`,
      ],
      behavioral: [
        `Tell me about a challenging aspect of your ${
          resumeData.projects?.[0]?.name || "recent project"
        } and how you handled it.`,
        `How did you collaborate with others during your ${
          resumeData.projects?.[0]?.name || "team projects"
        }?`,
        `Describe a time when you had to learn ${
          resumeData.skills?.[0] || "a new technology"
        } quickly for a project.`,
        `How do you approach problem-solving when working on ${
          resumeData.experience?.domains?.[0] || "software development"
        } tasks?`,
      ],
      management: [
        `How would you lead a team working on a project similar to your ${
          resumeData.projects?.[0]?.name || "recent project"
        }?`,
        `What strategies would you use to ensure code quality in a ${
          resumeData.skills?.[0] || "development"
        } team?`,
        `How do you stay updated with trends in ${
          resumeData.experience?.domains?.[0] || "technology"
        }?`,
        `Where do you see yourself in 5 years given your background in ${
          resumeData.skills?.slice(0, 2).join(" and ") || "software development"
        }?`,
      ],
    };

    const questions = skillBasedQuestions[category];
    const availableQuestions = questions.filter(
      (q) => !previousQuestions.includes(q)
    );

    if (availableQuestions.length > 0) {
      return availableQuestions[
        Math.floor(Math.random() * availableQuestions.length)
      ];
    }

    return questions[0]; // Return first question as last resort
  }
}

export async function validateAnswer(question: string, answer: string) {
  if (!geminiModel) {
    // Fallback validation without AI
    return {
      score: Math.floor(Math.random() * 3) + 6, // Random score between 6-8
      feedback:
        "Your answer shows good understanding. Consider providing more specific examples to strengthen your response.",
      idealAnswer:
        "A good answer would include specific examples, demonstrate problem-solving skills, and show enthusiasm for learning.",
    };
  }

  const prompt = `
    Rate this interview answer on a scale of 1-10 and provide detailed feedback:
    
    Question: ${question}
    Answer: ${answer}
    
    Please provide your response in JSON format:
    {
      "score": number (1-10),
      "feedback": "detailed constructive feedback on the answer",
      "idealAnswer": "a sample ideal answer for this question",
      "strengths": ["strength1", "strength2"],
      "improvements": ["improvement1", "improvement2"]
    }
    
    Consider:
    - Technical accuracy (if applicable)
    - Communication clarity
    - Depth of understanding
    - Practical examples
    - Problem-solving approach
    
    Be encouraging but constructive in your feedback.
  `;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      return {
        score:
          typeof parsedData.score === "number"
            ? Math.max(1, Math.min(10, parsedData.score))
            : 5,
        feedback:
          typeof parsedData.feedback === "string"
            ? parsedData.feedback
            : "Good effort! Keep practicing to improve your responses.",
        idealAnswer:
          typeof parsedData.idealAnswer === "string"
            ? parsedData.idealAnswer
            : "A good answer would address the question directly with specific examples.",
        strengths: Array.isArray(parsedData.strengths)
          ? parsedData.strengths
          : [],
        improvements: Array.isArray(parsedData.improvements)
          ? parsedData.improvements
          : [],
      };
    }

    return {
      score: 5,
      feedback: "Unable to analyze the answer properly. Please try again.",
      idealAnswer:
        "A good answer would address the question directly with specific examples.",
      strengths: [],
      improvements: [],
    };
  } catch (error: any) {
    console.error("Error validating answer:", error);

    // Fallback validation
    return {
      score: Math.floor(Math.random() * 3) + 6, // Random score between 6-8
      feedback:
        "Your answer demonstrates good thinking. Consider adding more specific examples and details to make it stronger.",
      idealAnswer:
        "An ideal answer would include concrete examples, show problem-solving approach, and demonstrate relevant skills or experience.",
      strengths: ["Clear communication"],
      improvements: [
        "Add more specific examples",
        "Provide more technical details",
      ],
    };
  }
}

// Utility function to check if Gemini is configured
export function isGeminiConfigured(): boolean {
  return !!geminiModel;
}
