"use client"
import { useRouter } from "next/navigation"
import { Cover } from "@/components/ui/cover";
import Image from "next/image";

export function Main() {
  const router = useRouter();
  return (
    <div className="lg:grid lg:grid-cols-2 items-center font-sans my-4">
      <div className="flex flex-col gap-5 p-3">
        <h1 className="text-4xl md:text-4xl lg:text-6xl font-semibold max-w-7xl mx-auto text-center mt-6 relative z-20 py-6 bg-clip-text text-transparent bg-gradient-to-b from-purple-800 via-purple-600 to-purple-400">
        Get ready for the new era of AI  <br /> at <Cover>of AI</Cover>
      </h1>
        <div className="text-xl font-light">
          Luno is a modern, AI-powered chatbot designed for clean, intelligent,
          and human-like conversations. With a minimalist aesthetic and smart
          tech under the hood, Luno helps users connect, learn, and get things
          done—effortlessly.
        </div>
        <button className="mt-2 px-6 text-lg bg-gradient-to-r from-purple-600 to-purple-950 rounded-2xl py-2 w-50 hover:from-purple-700 hover:to-purple-900 transition-colors hover:scale-105 transition-transform" onClick={() => router.push("/signup")}>
          Get Started
        </button>
      </div>
      <div className="relative lg:flex hidden">
        <Image
          src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747667100/bot_o4epk9.png"
          alt="robo"
          className="w-95 md:w-120 lg:w-150"
          width={600}
          height={600}
        />
        <Image
          src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747667100/Ellipse_1249_kq8bej.png"
          alt="shadow"
          className="absolute bottom-0"
          width={600}
          height={100}
        />
      </div>
    </div>
  );
}
