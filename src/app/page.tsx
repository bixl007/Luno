"use client";
import { useState, useEffect } from "react";
import { Landing } from "./components/Landing";

export default function Home() {
  // Remove loader/video logic, just animate content in
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`w-full opacity-0 ${
          contentVisible ? "animate-fade-in-content" : ""
        }`}
      >
        <Landing />
      </div>
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
