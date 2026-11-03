"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function Signup() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function createUser() {
      await fetch("/api/user", { method: "POST" });
    }
    if (isSignedIn) {
      createUser();
      router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <AuthShell heading="Ask better questions, get current answers." subheading="Create an account to start your first conversation.">
      <SignUp afterSignUpUrl="/dashboard" afterSignInUrl="/dashboard" />
    </AuthShell>
  );
}
