"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { shadesOfPurple } from "@clerk/themes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Signin() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <div
      className="h-screen flex justify-center items-center bg-gradient-to-r from-[#210649] to-[#090014]"
      style={{
        marginLeft: "0",
      }}
    >
      <SignIn
        appearance={{ baseTheme: shadesOfPurple }}
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  );
}
