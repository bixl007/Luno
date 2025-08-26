"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Landing } from "./components/Landing";

export default function Home() {
  const [contentVisible, setContentVisible] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
      return;
    }
    const timer = setTimeout(() => setContentVisible(true), 100);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-black">
      {!isLoaded ? (
        <div className="w-full h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : !isSignedIn ? (
        <div
          className={`w-full opacity-0 bg-black ${
            contentVisible ? "animate-fade-in-content" : ""
          }`}
        >
          <Landing />
        </div>
      ) : null}
      <style jsx global>{`
        @keyframes fadeInContent {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-content {
          animation: fadeInContent 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
