"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, CheckCircle } from "lucide-react";

export default function OTPVerification() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const email = searchParams.get("email");
  const phone = searchParams.get("phone");
  const name = searchParams.get("name") || "User";
  const isPhoneVerification = !!phone;
  const contactInfo = phone || email || "";
  const verificationType = isPhoneVerification ? "phone" : "email";

  useEffect(() => {
    if (!email && !phone) {
      toast({
        title: "Error",
        description: "No contact information provided for verification.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [email, phone, router, toast]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && resendDisabled) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown, resendDisabled]);

  const createUserProfile = async (user: any) => {
    try {
      const { error } = await supabase.from("users").upsert(
        {
          id: user.id,
          name: name || user.user_metadata?.name,
          phone: phone || user.user_metadata?.phone || "",
          email: email || user.user_metadata?.email || "",
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error in createUserProfile:", error);
      throw error;
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!phone) {
        throw new Error("Phone number is required for verification");
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: "Invalid OTP. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create user profile after successful OTP verification
        await createUserProfile(data.user);

        toast({
          title: "Success! 🎉",
          description: "Phone number verified successfully. Welcome!",
        });
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
      if (!phone) {
        throw new Error("Phone number is required");
      }

      const { error } = await supabase.auth.signUp({
        phone,
        password: "temporary", // This won't be used as we're only resending OTP
      });

      if (error) {
        throw error;
      }

      setResendDisabled(true);
      setCountdown(30);
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your phone.",
      });
    } catch (error: any) {
      console.error("Error resending OTP:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setResending(false);
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
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              {isPhoneVerification ? (
                <Phone className="h-8 w-8 text-white" />
              ) : (
                <Mail className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Verify Your {isPhoneVerification ? "Phone" : "Email"}
          </CardTitle>
          <CardDescription>
            Hi {name}! We've sent a verification code to your{" "}
            {isPhoneVerification ? "phone number" : "email address"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">
                {isPhoneVerification ? "Phone Number" : "Email Address"}
              </Label>
              <div className="relative">
                {isPhoneVerification ? (
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                ) : (
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                )}
                <Input
                  id="contact"
                  type="text"
                  value={contactInfo}
                  className="pl-10 bg-gray-50 font-medium"
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 text-center">
                Enter the 6-digit code sent to your {verificationType}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify & Continue
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {resendDisabled
                  ? `Resend code in ${countdown}s`
                  : "Didn't receive the code?"}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendOTP}
                disabled={resendDisabled}
                className="text-sm hover:bg-blue-50 transition-all duration-200"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend verification code"
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                ← Back to Sign In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
