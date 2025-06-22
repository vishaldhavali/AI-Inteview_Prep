"use client";

import type React from "react";

import { useState } from "react";
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
    "phone"
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
        return;
      }

      if (verificationType === "phone" && !formData.phone) {
        toast({
          title: "Phone Required",
          description: "Please enter your phone number for phone verification.",
          variant: "destructive",
        });
        return;
      }

      if (verificationType === "email" && !formData.email) {
        toast({
          title: "Email Required",
          description: "Please enter your email for email verification.",
          variant: "destructive",
        });
        return;
      }

      let signUpData;
      let redirectPath;

      if (verificationType === "phone") {
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

        // Phone-based signup - ALWAYS include email and name in user_metadata
        signUpData = await supabase.auth.signUp({
          phone: fullPhoneNumber,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              display_name: formData.name,
              email: formData.email || `${fullPhoneNumber}@phone.local`,
              phone: fullPhoneNumber,
              verification_type: "phone",
              full_name: formData.name,
            },
          },
        });
        redirectPath = `/verify-otp?phone=${encodeURIComponent(
          fullPhoneNumber
        )}&name=${encodeURIComponent(formData.name)}`;
      } else {
        // Email-based signup - ALWAYS include name and phone in user_metadata
        signUpData = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              display_name: formData.name,
              email: formData.email,
              phone: formData.phone || null,
              verification_type: "email",
              full_name: formData.name,
            },
          },
        });
        redirectPath = `/verify-otp?email=${encodeURIComponent(
          formData.email
        )}&name=${encodeURIComponent(formData.name)}`;
      }

      const { data, error } = signUpData;

      if (error) {
        if (error.message.includes("phone number format")) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number with country code.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user && !data.session) {
        // User created but needs verification
        toast({
          title: "Success! 🎉",
          description: `Please check your ${verificationType} for the verification code.`,
        });
        router.push(redirectPath);
      } else if (data.user && data.session) {
        // User created and automatically signed in (verification disabled)
        await createUserProfile(data.user);
        toast({
          title: "Welcome! 🎉",
          description: `Welcome ${formData.name}! Account created successfully.`,
        });
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "Sign Up Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (user: any) => {
    try {
      const userName =
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        formData.name;

      // Ensure we always have an email, even for phone-based auth
      const userEmail =
        user.email ||
        user.user_metadata?.email ||
        formData.email ||
        `${user.phone || user.user_metadata?.phone}@phone.local`;

      const userPhone =
        user.phone || user.user_metadata?.phone || formData.phone;

      const { error } = await supabase.from("users").insert({
        id: user.id,
        name: userName,
        phone: userPhone,
        email: userEmail, // Add email field
      });

      if (error && error.code !== "23505") {
        console.error("Error creating user profile:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in createUserProfile:", error);
      throw error;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let signInData;

      if (verificationType === "email") {
        // Email sign in
        signInData = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
      } else {
        // Validate phone number length for sign in
        if (formData.phone.length !== 10) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid 10-digit phone number.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Format phone number with country code for sign in
        const fullPhoneNumber = `${countryCode}${formData.phone}`;

        signInData = await supabase.auth.signInWithPassword({
          phone: fullPhoneNumber,
          password: formData.password,
        });
      }

      const { data, error } = signInData;

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Sign In Failed",
            description:
              "Invalid credentials. Please check your email/phone and password.",
            variant: "destructive",
          });
        } else if (error.message.includes("not verified")) {
          toast({
            title: "Phone Not Verified",
            description: "Please verify your phone number before signing in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Create or update user profile
        const { error: profileError } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            name: data.user.user_metadata?.name || formData.name,
            email: data.user.email || formData.email,
            phone: data.user.phone || formData.phone,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (profileError) {
          console.error("Error updating user profile:", profileError);
        }

        const userName =
          data.user.user_metadata?.name || formData.name || "User";

        toast({
          title: "Welcome back! 👋",
          description: `Hello ${userName}! Successfully signed in.`,
        });
        router.push("/dashboard");
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

    if (name === "phone") {
      // Only allow numbers and limit to 10 digits
      const numbersOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: numbersOnly,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/90 shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Interview Prep
          </CardTitle>
          <CardDescription className="text-gray-600">
            Prepare for your dream job with AI-powered interviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-3">
                  <Label>Sign In Method</Label>
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant={
                        verificationType === "email" ? "default" : "outline"
                      }
                      className="flex-1"
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
                      className="flex-1"
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
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Required for account recovery
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number *</Label>
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
                        className="pl-10"
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

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 6 characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10"
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
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
