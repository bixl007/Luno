"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { shadesOfPurple } from "@clerk/themes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Signup() {
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
      <SignUp
        appearance={{ baseTheme: shadesOfPurple }}
        afterSignUpUrl="/dashboard"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
