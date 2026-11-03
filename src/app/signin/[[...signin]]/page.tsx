"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function Signin() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <AuthShell heading="Welcome back." subheading="Pick up your conversations where you left them.">
      <SignIn afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard" />
    </AuthShell>
  );
}
