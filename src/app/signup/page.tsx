"use client";

import { useState } from "react";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="flex items-center justify-center w-full min-h-screen">
          <div className="grid md:grid-cols-2 items-center gap-6 max-w-6xl w-full">
            <div className="border border-slate-300 rounded-lg p-6 max-w-md w-full shadow-[0_2px_22px_-4px_rgba(93,96,127,0.2)] mx-auto">
              <form className="space-y-6">
                <div className="mb-12">
                  <h3 className="text-slate-900 text-3xl font-semibold">
                    Sign Up
                  </h3>
                  <p className="text-slate-500 text-sm mt-6 leading-relaxed">
                    Create your account and explore a world of possibilities.
                    Your journey begins here.
                  </p>
                </div>

                <div>
                  <label className="text-slate-800 text-sm font-medium mb-2 block">
                    Name
                  </label>
                  <div className="relative flex items-center">
                    <input
                      name="username"
                      type="text"
                      required
                      className="w-full text-sm text-slate-800 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                      placeholder="Enter your email"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#bbb"
                      stroke="#bbb"
                      className="w-[18px] h-[18px] absolute right-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="10"
                        cy="7"
                        r="6"
                        data-original="#000000"
                      ></circle>
                      <path
                        d="M14 15H6a5 5 0 0 0-5 5 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 5 5 0 0 0-5-5zm8-4h-2.59l.3-.29a1 1 0 0 0-1.42-1.42l-2 2a1 1 0 0 0 0 1.42l2 2a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42l-.3-.29H22a1 1 0 0 0 0-2z"
                        data-original="#000000"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="text-slate-800 text-sm font-medium mb-2 block">
                    email
                  </label>
                  <div className="relative flex items-center">
                    <input
                      name="username"
                      type="email"
                      required
                      className="w-full text-sm text-slate-800 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                      placeholder="Enter user name"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#bbb"
                      stroke="#bbb"
                      className="w-[18px] h-[18px] absolute right-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="10"
                        cy="7"
                        r="6"
                        data-original="#000000"
                      ></circle>
                      <path
                        d="M14 15H6a5 5 0 0 0-5 5 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 5 5 0 0 0-5-5zm8-4h-2.59l.3-.29a1 1 0 0 0-1.42-1.42l-2 2a1 1 0 0 0 0 1.42l2 2a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42l-.3-.29H22a1 1 0 0 0 0-2z"
                        data-original="#000000"
                      ></path>
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="text-slate-800 text-sm font-medium mb-2 block">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full text-sm text-slate-800 border border-slate-300 pl-4 pr-10 py-3 rounded-lg outline-blue-600"
                      placeholder="Enter password"
                    />
                    {showPassword ? (
                      // Eye closed SVG
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="#bbb"
                        stroke="#bbb"
                        className="w-[18px] h-[18px] absolute right-4 cursor-pointer"
                        viewBox="0 0 24 24"
                        onClick={() => setShowPassword(false)}
                      >
                        <path
                          d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5.05 0-9.29-3.14-11-7 1.21-2.61 3.36-4.77 6-6.11M1 1l22 22"
                          stroke="#bbb"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        <path
                          d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5c.96 0 1.84-.38 2.47-1"
                          stroke="#bbb"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    ) : (
                      // Eye open SVG
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="#bbb"
                        stroke="#bbb"
                        className="w-[18px] h-[18px] absolute right-4 cursor-pointer"
                        viewBox="0 0 24 24"
                        onClick={() => setShowPassword(true)}
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M2 12C3.73 7.61 7.61 4 12 4s8.27 3.61 10 8c-1.73 4.39-5.61 8-10 8S3.73 16.39 2 12z" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      required
                      className="h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                    />
                    <label
                      // for="remember-me"
                      className="ml-3 block text-sm text-slate-500"
                    >
                      Accept Terms & Condition*
                    </label>
                  </div>

                 
                </div>

                <div className="!mt-12">
                  <button
                    type="submit"
                    className="w-full shadow-xl py-2.5 px-4 text-[15px] font-medium tracking-wide rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none cursor-pointer"
                  >
                    Sign in
                  </button>
                  <p className="text-sm !mt-6 text-center text-slate-500">
                    Already have an account{" "}
                    <a
                      href="/signin"
                      className="text-blue-600 font-medium hover:underline ml-1 whitespace-nowrap"
                    >
                      Login
                    </a>
                  </p>
                </div>
              </form>
            </div>

            <div className="max-md:mt-8 invisible md:visible">
              <img
                src="https://res.cloudinary.com/dqlku2tfk/image/upload/v1747322286/simplicity-gestalt-principle-example_ed24mn.png"
                className="w-full aspect-[71/50] max-md:w-4/5 mx-auto block object-cover"
                alt="login img"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
