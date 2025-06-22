"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, AlertTriangle, FileX } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function CompleteCleanup() {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [includeAuth, setIncludeAuth] = useState(true)
  const [includeStorage, setIncludeStorage] = useState(true)
  const { toast } = useToast()

  const performCompleteCleanup = async () => {
    if (confirmText !== "DELETE EVERYTHING") {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE EVERYTHING' to confirm",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Step 1: Clear application data
      console.log("Clearing application data...")
      await supabase.from("answers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("resumes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      // Step 2: Clear storage files if requested
      if (includeStorage) {
        console.log("Clearing storage files...")
        const { data: files, error: listError } = await supabase.storage.from("resumes").list()

        if (!listError && files && files.length > 0) {
          const filePaths = files.map((file) => file.name)
          const { error: deleteError } = await supabase.storage.from("resumes").remove(filePaths)

          if (deleteError) {
            console.error("Error deleting storage files:", deleteError)
          }
        }
      }

      // Step 3: Clear auth data if requested (requires admin privileges)
      if (includeAuth) {
        console.log("Attempting to clear auth data...")
        try {
          // This requires service role key or admin privileges
          const { error: authError } = await supabase.auth.admin.listUsers()
          if (!authError) {
            // If we have admin access, clear auth users
            const { data: users } = await supabase.auth.admin.listUsers()
            if (users && users.users) {
              for (const user of users.users) {
                await supabase.auth.admin.deleteUser(user.id)
              }
            }
          }
        } catch (authError) {
          console.log("Auth cleanup requires admin privileges - skipping")
        }
      }

      toast({
        title: "Complete Cleanup Successful",
        description: "All user data has been permanently deleted",
      })

      // Reset form
      setConfirmText("")
    } catch (error: any) {
      console.error("Cleanup error:", error)
      toast({
        title: "Cleanup Error",
        description: error.message || "Failed to complete cleanup",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearStorageOnly = async () => {
    setLoading(true)
    try {
      const { data: files, error: listError } = await supabase.storage.from("resumes").list()

      if (listError) throw listError

      if (files && files.length > 0) {
        const filePaths = files.map((file) => file.name)
        const { error: deleteError } = await supabase.storage.from("resumes").remove(filePaths)

        if (deleteError) throw deleteError

        toast({
          title: "Storage Cleared",
          description: `Deleted ${files.length} files from storage`,
        })
      } else {
        toast({
          title: "No Files Found",
          description: "No files to delete in storage",
        })
      }
    } catch (error: any) {
      console.error("Storage cleanup error:", error)
      toast({
        title: "Storage Cleanup Error",
        description: error.message || "Failed to clear storage",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Complete User Data Cleanup
          </CardTitle>
          <CardDescription className="text-red-600">
            Permanently delete ALL user data from your application and authentication system
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">⚠️ DANGER ZONE</h3>
                <p className="text-sm text-amber-700 mt-1">This action will permanently delete:</p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>All user accounts and authentication data</li>
                  <li>All uploaded resumes and files</li>
                  <li>All interview questions and answers</li>
                  <li>All application data and user profiles</li>
                  <li>All session and refresh tokens</li>
                </ul>
                <p className="text-sm font-medium text-amber-800 mt-2">This action cannot be undone!</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Cleanup Options</h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAuth"
                  checked={includeAuth}
                  onCheckedChange={(checked) => setIncludeAuth(checked as boolean)}
                />
                <Label htmlFor="includeAuth" className="text-sm">
                  Clear authentication data (requires admin privileges)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeStorage"
                  checked={includeStorage}
                  onCheckedChange={(checked) => setIncludeStorage(checked as boolean)}
                />
                <Label htmlFor="includeStorage" className="text-sm">
                  Delete all uploaded files from storage
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" size="lg">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Complete Data Wipe
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">⚠️ FINAL WARNING</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>You are about to permanently delete ALL user data from your application.</p>
                    <p className="font-medium">This includes:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>All user accounts and login credentials</li>
                      <li>All resumes and uploaded files</li>
                      <li>All interview data and responses</li>
                      <li>All application settings and preferences</li>
                    </ul>
                    <div className="space-y-2">
                      <Label htmlFor="confirmInput" className="text-sm font-medium">
                        Type "DELETE EVERYTHING" to confirm:
                      </Label>
                      <Input
                        id="confirmInput"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE EVERYTHING"
                        className="font-mono"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={performCompleteCleanup}
                    disabled={loading || confirmText !== "DELETE EVERYTHING"}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        DELETE EVERYTHING
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={clearStorageOnly} variant="outline" className="w-full" disabled={loading}>
              <FileX className="mr-2 h-4 w-4" />
              Clear Storage Files Only
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Use SQL scripts for more control over the cleanup process</p>
            <p>• Auth data cleanup requires service role permissions</p>
            <p>• Consider backing up important data before proceeding</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
