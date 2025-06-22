# AI Interview Prep

An AI-powered interview preparation platform built with Next.js and deployed on Vercel.

## Environment Variables Setup

### Required Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
```

### How to Set Up Environment Variables

1. **For Local Development:**

   - Create a `.env.local` file in the root directory
   - Copy the above variables and fill in your values
   - Never commit this file to version control

2. **For Vercel Deployment:**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add each variable with its corresponding value
   - Make sure to add variables to all environments (Production, Preview, Development)

### Getting the Values

1. **Supabase Variables:**

   - Log in to your [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Project Settings > API
   - Copy the `Project URL` for `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the `anon public` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Gemini AI API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create or select a project
   - Generate an API key
   - Copy the key for `GEMINI_API_KEY`

### Security Notes

- Never expose your API keys in your code
- Don't commit `.env` files to version control
- Use appropriate environment variables for different deployment environments
- Rotate API keys periodically for security

## Deployment Guide

### Prerequisites

- A Vercel account
- A Google Cloud account (for Gemini AI API)
- A Supabase account

### Deployment Steps

1. Fork or clone this repository
2. Import the project to Vercel:
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Configure environment variables
   - Deploy

### Important Notes

- Make sure to set up proper CORS settings in your Supabase project
- The Gemini API key should be kept secret and only set in Vercel environment variables
- The project uses Next.js 14 with App Router
- All API routes are serverless functions compatible with Vercel's infrastructure

### Local Development

```bash
# Install dependencies
npm install

# Create .env.local file with required environment variables
# See .env.example for required variables

# Run development server
npm run dev
```

### Features

- AI-powered resume analysis
- Technical interview preparation
- Behavioral interview questions
- Real-time answer validation
- Voice recording capabilities
- PDF processing
- User authentication via Supabase

### Tech Stack

- Next.js 14
- React 18
- Supabase
- Google's Gemini AI
- TailwindCSS
- Radix UI Components
- TypeScript
