# AI Interview Prep

Welcome to **AI Interview Prep**, a modern web application designed to help users practice for job interviews by leveraging the power of Generative AI. This tool analyzes your resume, extracts key information, and generates personalized interview questions tailored to your specific skills and experience.

![AI Interview Prep Screenshot](public/placeholder.jpg) 

## ✨ Features

- **📄 Resume Analysis:** Upload your PDF resume for in-depth analysis. The AI extracts your skills, work experience, projects, and education.
- **🤖 AI-Powered Question Generation:** Receive custom-generated interview questions based on your resume in categories like Technical, Behavioral, and Management.
- **🎙️ Voice-to-Text Practice:** Practice your answers using your voice. The application transcribes your speech to text in real-time.
- **✅ Answer Validation:** Get instant feedback on your answers. The AI provides a score, an ideal answer, and constructive feedback to help you improve.
- **🔒 Secure & Private:** Your data is securely handled, and API keys are managed through environment variables, ensuring your information stays private.
- **🚀 Vercel Ready:** The application is fully configured for easy deployment on Vercel with automatic builds and deployments from your Git repository.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
- **AI/ML:** [Google Gemini API](https://ai.google.dev/) for resume analysis and question generation
- **Backend & Database:** [Supabase](https://supabase.io/) for user authentication, database, and file storage
- **State Management:** React Hooks & Context API
- **Deployment:** [Vercel](https://vercel.com/)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.io/) account and project
- A [Google AI Studio](https://ai.google.dev/) API key (for Gemini)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/vishaldhavali/AI-Inteview_Prep.git
    cd AI-Inteview_Prep
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Set up your environment variables:**
    Create a new file named `.env.local` in the root of your project and add the following, replacing the placeholder values with your actual credentials.

    ```env
    NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

    - You can get your Supabase URL and anon key from your Supabase project's **Settings > API** page.
    - You can get your Gemini API key from the [Google AI Studio](https://aistudio.google.com/app/apikey).

4. **Set up the Supabase Database**
   In your Supabase project's SQL Editor, run the SQL scripts located in the `/scripts` directory in numerical order to create the necessary tables.
   - `01-create-tables.sql`
   - `08-add-email-column.sql`


5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/).

1.  **Push your code** to your GitHub repository.
2.  **Import the repository** into Vercel.
3.  **Configure the Environment Variables** in the Vercel project settings, just as you did in your `.env.local` file.
4.  **Deploy!** Vercel will automatically handle the build process.

Every time you push a new commit to your `main` branch, Vercel will automatically redeploy your application with the latest changes.

---

Feel free to contribute to this project by submitting a pull request or opening an issue. 