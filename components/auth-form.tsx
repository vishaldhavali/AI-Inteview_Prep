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
import Image from "next/image";

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

      // Create the user with email as the primary credential, and phone in metadata
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: fullPhoneNumber,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Now send OTP to phone for verification
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });
      if (otpError) {
        throw otpError;
      }

      // Redirect to OTP verification page
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
      toast({
        title: "Sign Up Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
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
          toast({
            title: "Sign In Failed",
            description: "Invalid email or password.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (data?.user) {
          toast({
            title: "Welcome back! 👋",
            description: `Hello ${
              data.user.user_metadata?.name || "User"
            }! Successfully signed in.`,
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

        // Look up the email associated with this phone number
        let userData = null;
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

        if (!userData || !userData.email) {
          toast({
            title: "Sign In Failed",
            description: "No account found with this phone number.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Sign in with the found email and provided password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password: formData.password,
        });

        if (error) {
          toast({
            title: "Sign In Failed",
            description: "Invalid phone or password.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (data?.user) {
          toast({
            title: "Welcome back! 👋",
            description: `Hello ${
              data.user.user_metadata?.name || "User"
            }! Successfully signed in.`,
          });
          router.push("/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An unexpected error occurred. Please try again.",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="rounded-lg text-card-foreground w-full max-w-md relative z-10 backdrop-blur-sm bg-white/90 shadow-2xl border-0 animate-fade-in">
        <div className="flex flex-col p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce-in">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="tracking-tight text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
            AI Interview Prep
          </div>
          <div className="text-sm text-gray-600 animate-fade-in">
            Prepare for your dream job with AI-powered interviews
          </div>
        </div>

        <div className="p-6 pt-0">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin" className="tab-slide">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="tab-slide">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 animate-fade-in">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Sign In Method
                  </Label>
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant={
                        verificationType === "email" ? "default" : "outline"
                      }
                      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 flex-1 btn-transition ${
                        verificationType === "email" ? "active" : ""
                      }`}
                      onClick={() => setVerificationType("email")}
                    >
                      <Mail
                        className={`mr-2 h-4 w-4 transition-colors duration-200 ${
                          verificationType === "email"
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={
                        verificationType === "phone" ? "default" : "outline"
                      }
                      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-10 px-4 py-2 flex-1 btn-transition ${
                        verificationType === "phone" ? "active" : ""
                      }`}
                      onClick={() => setVerificationType("phone")}
                    >
                      <Phone
                        className={`mr-2 h-4 w-4 transition-colors duration-200 ${
                          verificationType === "phone"
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      />
                      Phone
                    </Button>
                  </div>
                </div>

                {verificationType === "email" ? (
                  <div className="space-y-2 form-field-animate">
                    <Label
                      htmlFor="signin-email"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 input-focus-effect"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 form-field-animate">
                    <Label
                      htmlFor="signin-phone"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Phone Number
                    </Label>
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
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 input-focus-effect"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 form-field-animate">
                  <Label
                    htmlFor="signin-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 pr-10 input-focus-effect"
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
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 btn-gradient btn-press"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2 form-field-animate">
                  <Label
                    htmlFor="signup-name"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 input-focus-effect"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 form-field-animate">
                  <Label
                    htmlFor="signup-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Email *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 input-focus-effect"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Required for account recovery
                  </p>
                </div>

                <div className="space-y-2 form-field-animate">
                  <Label
                    htmlFor="signup-phone"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Phone Number *
                  </Label>
                  <div className="flex space-x-2">
                    <CountrySelect
                      value={countryCode}
                      onValueChange={setCountryCode}
                    />
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-phone"
                        name="phone"
                        type="tel"
                        placeholder="10-digit number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 input-focus-effect"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    You'll receive a verification code on this number
                  </p>
                </div>

                <div className="space-y-2 form-field-animate">
                  <Label
                    htmlFor="signup-password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Password *
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 6 characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 pr-10 input-focus-effect"
                      minLength={6}
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
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 btn-gradient btn-press"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
