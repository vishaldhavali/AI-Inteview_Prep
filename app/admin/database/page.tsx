import type { Metadata } from "next"
import DatabaseManager from "@/components/admin/database-manager"

export const metadata: Metadata = {
  title: "Database Management - AI Interview Prep",
  description: "Manage your application database",
}

export default function DatabaseManagementPage() {
  return <DatabaseManager />
}
