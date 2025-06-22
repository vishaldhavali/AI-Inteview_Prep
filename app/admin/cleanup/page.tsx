import type { Metadata } from "next"
import CompleteCleanup from "@/components/admin/complete-cleanup"

export const metadata: Metadata = {
  title: "Complete Cleanup - AI Interview Prep",
  description: "Completely clear all user data from the application",
}

export default function CompleteCleanupPage() {
  return <CompleteCleanup />
}
