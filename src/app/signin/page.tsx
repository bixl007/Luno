"use client";

import { useState } from "react";

export default function Signin() {
    const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ background: "#15042F" }}>
      <div className="absolute inset-0 z-0">
        <img
          src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747732241/Background_muyxpf.png"
          alt="bg"
          className="w-full h-full object-cover shadow-2xl shadow-indigo-950"
        />
      </div>

      <div className="relative z-10 min-h-screen w-full lg:w-5/12 lg:absolute lg:right-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-4xl sm:text-6xl lg:text-8xl font-sans font-bold mb-4">Sign In</div>
        <form className="w-full max-w-lg mx-auto lg:mx-0 space-y-4 text-base sm:text-lg lg:text-xl">
          

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 26 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.51943 0.038147H21.6713C22.7211 0.038147 23.7278 0.434312 24.4701 1.13949C25.2124 1.84467 25.6294 2.80109 25.6294 3.79837V15.079C25.6294 16.0763 25.2124 17.0327 24.4701 17.7379C23.7278 18.4431 22.7211 18.8392 21.6713 18.8392H4.51943C3.46967 18.8392 2.46291 18.4431 1.72062 17.7379C0.978323 17.0327 0.561308 16.0763 0.561308 15.079V3.79837C0.561308 2.80109 0.978323 1.84467 1.72062 1.13949C2.46291 0.434312 3.46967 0.038147 4.51943 0.038147ZM4.51943 1.29155C3.85974 1.29155 3.27922 1.50463 2.83063 1.88065L13.0954 8.18529L23.3601 1.88065C22.9115 1.50463 22.331 1.29155 21.6713 1.29155H4.51943ZM13.0954 9.70191L2.0522 2.89591C1.94665 3.17166 1.88068 3.48501 1.88068 3.79837V15.079C1.88068 15.7439 2.15869 16.3815 2.65355 16.8516C3.14842 17.3217 3.81959 17.5858 4.51943 17.5858H21.6713C22.3711 17.5858 23.0423 17.3217 23.5372 16.8516C24.032 16.3815 24.3101 15.7439 24.3101 15.079V3.79837C24.3101 3.48501 24.2441 3.17166 24.1385 2.89591L13.0954 9.70191Z" fill="#A4A4A4"/>
              </svg>
              <span>Email:</span>
            </div>
            <input
              type="email"
              placeholder="youremail@email.com"
              className="w-full p-3 sm:p-4 rounded-xl bg-[#280A51]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 26 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.5 7.5H19V5.5C19 3.01472 16.9853 1 14.5 1H13.5C11.0147 1 9 3.01472 9 5.5V7.5H7.5C6.67157 7.5 6 8.17157 6 9V17C6 17.8284 6.67157 18.5 7.5 18.5H20.5C21.3284 18.5 22 17.8284 22 17V9C22 8.17157 21.3284 7.5 20.5 7.5Z" fill="#A4A4A4"/>
              </svg>
              <span>Password:</span>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Your Password"
              className="w-full p-3 sm:p-4 rounded-xl bg-[#280A51]"
            />
          </div>

          <button className="w-full p-3 sm:p-4 mt-6 text-xl sm:text-2xl font-light bg-gradient-to-r from-purple-500 to-purple-700 rounded-full text-white shadow-lg hover:scale-105 transition-transform">
            Sign In
          </button>

          <div className="text-center sm:text-left mt-4">
            New Here? <a href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors">Signup</a>
          </div>
        </form>
      </div>
    </div>
  );
}
