import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Maps Clerk's sign-in, sign-up and account UI onto Luno's tokens (globals.css), so those screens
 * follow the same light and dark palettes as the rest of the app.
 */
export const clerkAppearance: Appearance = {
  layout: { logoImageUrl: "/icon.svg" },
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    colorDanger: "var(--destructive)",
    colorSuccess: "var(--success)",
    colorNeutral: "var(--foreground)",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    borderRadius: "0.625rem",
  },
  elements: {
    card: "shadow-md border border-border",
    formButtonPrimary: "shadow-none font-medium",
    footerActionLink: "text-brand hover:text-brand",
    userButtonAvatarBox: "size-8",
  },
};
