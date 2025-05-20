"use client"
import { useRouter } from "next/navigation"

export function Main() {
  const router = useRouter();
  return (
    <div className="lg:grid lg:grid-cols-2 items-center font-sans my-4">
      <div className="flex flex-col gap-5 p-3">
        <div
          className=" text-6xl lg:text-7xl font-light mb-8
            bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800
            bg-clip-text text-transparent"
        >
          Get ready for the new era of AI
        </div>
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
      <div className="relative lg:flex hidden lg:block">
        <img
          src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747667100/bot_o4epk9.png"
          alt="robo"
          className="w-95 md:w-120 lg:w-150"
        />
        <img
          src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747667100/Ellipse_1249_kq8bej.png"
          alt="shadow"
          className="absolute bottom-0"
        />
      </div>
    </div>
  );
}
