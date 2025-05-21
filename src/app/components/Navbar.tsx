"use client"

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const scrollToSection = (sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="w-full sticky top-0 z-40">
            <div className="mx-auto max-w-screen-2xl flex justify-between p-6 bg-neutral-950 px-4 my-2 border-gray-900 rounded-3xl font-sans" style={{ boxShadow: '-3px -4px 3px rgba(55, 65, 75, 0.5), 3px -4px 3px rgba(55, 65, 75, 0.5)' }}>
                <div className="flex justify-center items-center gap-2 px-4">
                    <img
                        src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747667099/frame_q9jzw0.png"
                        alt="logo"
                        className="h-8"
                    />
                    <div className="font-sans text-2xl">Luno</div>
                </div>
                <div className="hidden lg:flex gap-6 text-xl font-light">
                    <div onClick={() => scrollToSection('features')} className="hover:text-purple-400 transition-colors cursor-pointer">Features</div>
                    <div onClick={() => scrollToSection('about')} className="hover:text-purple-400 transition-colors cursor-pointer">About</div>
                </div>
                <div className="hidden lg:flex gap-6 ">
                    <button className="px-6 text-xl bg-neutral-900 rounded-2xl py-1 hover:bg-neutral-800 transition-colors" 
                    onClick={() => router.push("/signup")}>Signup</button>
                    <button className="px-6 text-xl bg-gradient-to-r from-purple-600 to-purple-950 rounded-2xl py-1 hover:from-purple-700 hover:to-purple-900 transition-colors" onClick={() => router.push("/signin")}>Login</button>
                </div>
                <div className="flex items-center lg:hidden px-4">
                    <div className="sticky top-0 z-50">
                        <button aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                        </button>
                    </div>
                </div>
                {menuOpen && (
                    <div className="fixed top-0 right-0 h-screen w-64 bg-neutral-950 border-l border-gray-800 z-50 flex flex-col py-8 px-6 animate-slide-in-right lg:hidden shadow-2xl">
                        <div className="flex items-center gap-2 mb-8">
                            <img
                                src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747667099/frame_q9jzw0.png"
                                alt="logo"
                                className="h-7"
                            />
                            <div className="font-sans text-xl">Luno</div>
                            <button className="ml-auto text-gray-400 hover:text-white transition-colors" onClick={() => setMenuOpen(false)}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <button onClick={() => scrollToSection('features')} className="text-lg font-light text-left py-2 px-4 rounded-xl hover:bg-neutral-900 hover:text-purple-400 transition-colors mb-2">Features</button>
                        <button onClick={() => scrollToSection('about')} className="text-lg font-light text-left py-2 px-4 rounded-xl hover:bg-neutral-900 hover:text-purple-400 transition-colors mb-2">About</button>
                        <button className="mt-4 px-6 text-lg bg-neutral-900 rounded-2xl py-2 w-full hover:bg-neutral-800 hover:text-purple-400 transition-colors " onClick={() => {
                            router.push("/signup")
                        }}>Signup</button>
                        <button className="mt-2 px-6 text-lg bg-gradient-to-r from-purple-600 to-purple-950 rounded-2xl py-2 w-full hover:from-purple-700 hover:to-purple-900 hover:text-purple-100 transition-colors " onClick={() => {
                            router.push("/signin")
                        }}>Login</button>
                    </div>
                )}
                <style jsx global>{`
                    @keyframes slide-in-right {
                        0% { transform: translateX(100%); opacity: 0; }
                        100% { transform: translateX(0); opacity: 1; }
                    }
                    .animate-slide-in-right {
                        animation: slide-in-right 0.35s cubic-bezier(0.4,0,0.2,1);
                    }
                `}</style>
            </div>
        </div>
    );
}
