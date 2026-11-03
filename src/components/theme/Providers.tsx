"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { clerkAppearance } from "./clerkAppearance";

function ThemedClerk({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <ClerkProvider appearance={{ ...clerkAppearance, baseTheme: resolvedTheme === "dark" ? dark : undefined }}>
      {children}
    </ClerkProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedClerk>{children}</ThemedClerk>
    </ThemeProvider>
  );
}
