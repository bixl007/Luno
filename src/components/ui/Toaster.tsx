"use client";

import toast, { Toaster as HotToaster } from "react-hot-toast";

/** Notification style comes from the design tokens, so toasts follow the active theme. */
export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 2200,
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border-strong)",
          borderRadius: "0.75rem",
          boxShadow: "var(--shadow-md)",
          fontSize: "0.875rem",
          padding: "0.5rem 0.75rem",
        },
        success: { iconTheme: { primary: "var(--success)", secondary: "var(--popover)" } },
        error: { iconTheme: { primary: "var(--destructive)", secondary: "var(--popover)" } },
      }}
    />
  );
}

export const notify = {
  info: (message: string, duration?: number) => toast(message, { duration }),
  success: (message: string, duration?: number) => toast.success(message, { duration }),
  error: (message: string, duration?: number) => toast.error(message, { duration }),
};
