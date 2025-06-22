"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Trash2, RefreshCw, Database, ShieldAlert } from "lucide-react"
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

export default function DatabaseManager() {
  const [loading, setLoading] = useState<string | null>(null)
  const [stats, setStats] = useState<any>({
    users: 0,
    resumes: 0,
    questions: 0,
    answers: 0,
  })
  const { toast } = useToast()

  const fetchStats = async () => {
    setLoading("stats")
    try {
      const [usersRes, resumesRes, questionsRes, answersRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("resumes").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }),
      ])

      setStats({
        users: usersRes.count || 0,
        resumes: resumesRes.count || 0,
        questions: questionsRes.count || 0,
        answers: answersRes.count || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch database statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const clearAllData = async () => {
    setLoading("clearAll")
    try {
      // Execute in correct order to respect foreign key constraints
      await supabase.from("answers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("resumes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      toast({
        title: "Success",
        description: "All data has been cleared from the database",
      })

      // Refresh stats
      await fetchStats()
    } catch (error: any) {
      console.error("Error clearing data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear database",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const clearInterviewData = async () => {
    setLoading("clearInterviews")
    try {
      await supabase.from("answers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      toast({
        title: "Success",
        description: "All interview data has been cleared",
      })

      // Refresh stats
      await fetchStats()
    } catch (error: any) {
      console.error("Error clearing interview data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear interview data",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const clearResumeData = async () => {
    setLoading("clearResumes")
    try {
      // First delete dependent records
      await supabase.from("answers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      // Then delete resumes
      await supabase.from("resumes").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      toast({
        title: "Success",
        description: "All resume data has been cleared",
      })

      // Refresh stats
      await fetchStats()
    } catch (error: any) {
      console.error("Error clearing resume data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear resume data",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>View and manage your application database</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="stats">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stats">Database Statistics</TabsTrigger>
              <TabsTrigger value="actions">Database Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="space-y-4 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.users}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Resumes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.resumes}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.questions}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats.answers}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <Button onClick={fetchStats} disabled={loading === "stats"} variant="outline" className="mt-4">
                  {loading === "stats" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Statistics
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Clear Database Data</h3>
                <p className="text-sm text-gray-500">
                  Select an option below to clear data from your database. These actions cannot be undone.
                </p>

                <div className="grid gap-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will permanently delete ALL data from your database including users, resumes,
                          questions, and answers. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearAllData}
                          disabled={loading === "clearAll"}
                          className="bg-destructive text-destructive-foreground"
                        >
                          {loading === "clearAll" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Clearing...
                            </>
                          ) : (
                            "Yes, Delete Everything"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full border-orange-200 text-orange-700 hover:bg-orange-50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Interview Data Only
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all questions and answers, but keep users and resumes. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearInterviewData}
                          disabled={loading === "clearInterviews"}
                          className="bg-orange-500 text-white hover:bg-orange-600"
                        >
                          {loading === "clearInterviews" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Clearing...
                            </>
                          ) : (
                            "Yes, Delete Interview Data"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Resume Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all resumes, questions, and answers, but keep user accounts. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearResumeData}
                          disabled={loading === "clearResumes"}
                          className="bg-amber-500 text-white hover:bg-amber-600"
                        >
                          {loading === "clearResumes" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Clearing...
                            </>
                          ) : (
                            "Yes, Delete Resume Data"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ShieldAlert className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Important Note</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        These actions directly modify your database and cannot be undone. For more advanced database
                        operations, please use the Supabase dashboard SQL editor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-6">
          <p className="text-xs text-gray-500">Database operations are performed with your current user permissions</p>
          <Button variant="outline" size="sm" onClick={() => window.open("https://app.supabase.com", "_blank")}>
            Open Supabase Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
