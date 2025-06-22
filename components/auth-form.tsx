"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { CountrySelect } from "@/components/ui/country-select";

export default function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationType, setVerificationType] = useState<"email" | "phone">(
    "email"
  );
  const [countryCode, setCountryCode] = useState("+91");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Clear any existing auth state and cache
    const clearAuthState = async () => {
      try {
        await supabase.auth.signOut();
        // Clear local storage
        localStorage.clear();
        // Clear session storage
        sessionStorage.clear();
      } catch (error) {
        console.error("Error clearing auth state:", error);
      }
    };

    clearAuthState();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast({
          title: "Name Required",
          description: "Please enter your full name.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        toast({
          title: "Email Required",
          description: "Please enter your email address.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.phone) {
        toast({
          title: "Phone Required",
          description: "Please enter your phone number for verification.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validate phone number length
      if (formData.phone.length !== 10) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid 10-digit phone number.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Format phone number with country code
      const fullPhoneNumber = `${countryCode}${formData.phone}`;

      // Show loading state
      toast({
        title: "Creating Account",
        description: "Please wait while we set up your account...",
      });

      // First, create the user with phone auth
      const { data: phoneData, error: phoneError } = await supabase.auth.signUp(
        {
          phone: fullPhoneNumber,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              email: formData.email.trim(),
              phone: fullPhoneNumber,
            },
          },
        }
      );

      if (phoneError) {
        throw phoneError;
      }

      // Add a delay of 4 seconds before sending OTP
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Now initiate phone verification
      const { error: verificationError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (verificationError) {
        throw verificationError;
      }

      // Redirect to OTP verification
      const redirectPath = `/verify-otp?phone=${encodeURIComponent(
        fullPhoneNumber
      )}&name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(
        formData.email
      )}`;

      toast({
        title: "Verification Code Sent!",
        description: "Please check your phone for the OTP.",
      });
      router.push(redirectPath);
    } catch (error: any) {
      console.error("Sign up error:", error);
      if (error.message.includes("security purposes")) {
        // Handle rate limit error
        toast({
          title: "Please Wait",
          description:
            "Please wait a few seconds before requesting another code.",
          variant: "destructive",
        });
      } else if (error.message.includes("phone number format")) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number with country code.",
          variant: "destructive",
        });
      } else if (error.message.includes("already registered")) {
        toast({
          title: "Account Exists",
          description:
            "An account with this phone number already exists. Please sign in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign Up Error",
          description: error.message || "Failed to create account",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (verificationType === "email") {
        if (!formData.email) {
          toast({
            title: "Email Required",
            description: "Please enter your email address.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Email sign in
        const signInData = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        const { data, error } = signInData;

        if (error) {
          console.error("Sign in error:", error);
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Sign In Failed",
              description: "Invalid email or password.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign In Error",
              description: error.message,
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

        if (data?.user) {
          const userName = data.user.user_metadata?.name || "User";
          toast({
            title: "Welcome back! 👋",
            description: `Hello ${userName}! Successfully signed in.`,
          });
          router.push("/dashboard");
        }
      } else {
        // Phone login logic
        if (!formData.phone) {
          toast({
            title: "Phone Required",
            description: "Please enter your phone number.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (formData.phone.length !== 10) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid 10-digit phone number.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Format phone number with country code
        const fullPhoneNumber = `${countryCode}${formData.phone}`;

        try {
          // First try to find the user by phone using a single query
          let userData = null; // Changed to let and initialized as null

          // Try with full phone number first
          const { data: userDataFull, error: userError } = await supabase
            .from("users")
            .select("email")
            .eq("phone", fullPhoneNumber)
            .single();

          if (!userError && userDataFull) {
            userData = userDataFull;
          } else {
            // If not found with full number, try without country code
            const { data: userDataSimple, error: userError2 } = await supabase
              .from("users")
              .select("email")
              .eq("phone", formData.phone)
              .single();

            if (!userError2 && userDataSimple) {
              userData = userDataSimple;
            }
          }

          // Check if we found a user
          if (!userData) {
            toast({
              title: "Sign In Failed",
              description: "No account found with this phone number.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Sign in with the found email
          const { data, error } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: formData.password,
          });

          if (error) {
            toast({
              title: "Sign In Failed",
              description: "Invalid password.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          if (data?.user) {
            // Update user profile with the latest phone number format
            await supabase
              .from("users")
              .update({
                phone: fullPhoneNumber,
                last_sign_in: new Date().toISOString(),
              })
              .eq("id", data.user.id);

            const userName =
              data.user.user_metadata?.name ||
              data.user.user_metadata?.full_name ||
              "User";

            toast({
              title: "Welcome back! 👋",
              description: `Hello ${userName}! Successfully signed in.`,
            });
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("Phone sign in error:", error);
          toast({
            title: "Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome! 👋</CardTitle>
          <CardDescription>
            Sign in or create an account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-3">
                      <Label>Sign In Method</Label>
                      <div className="flex space-x-4">
                        <Button
                          type="button"
                          variant={
                            verificationType === "email" ? "default" : "outline"
                          }
                          onClick={() => setVerificationType("email")}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </Button>
                        <Button
                          type="button"
                          variant={
                            verificationType === "phone" ? "default" : "outline"
                          }
                          onClick={() => setVerificationType("phone")}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Phone
                        </Button>
                      </div>
                    </div>

                    {verificationType === "email" ? (
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="signin-email"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="signin-phone">Phone Number</Label>
                        <div className="flex space-x-2">
                          <CountrySelect
                            value={countryCode}
                            onValueChange={setCountryCode}
                          />
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="signin-phone"
                              name="phone"
                              type="tel"
                              placeholder="10-digit number"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="pl-10"
                              pattern="[0-9]{10}"
                              maxLength={10}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signin-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="pl-10 pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <CountrySelect
                      value={countryCode}
                      onValueChange={setCountryCode}
                    />
                    <Input
                      id="signup-phone"
                      type="tel"
                      name="phone"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
