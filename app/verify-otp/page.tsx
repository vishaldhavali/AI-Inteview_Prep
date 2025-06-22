import OTPVerification from "@/components/otp-verification";
import { Suspense } from "react";
import Loading from "./loading";

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OTPVerification />
    </Suspense>
  );
}
