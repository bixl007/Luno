import { ClosingCta } from "./ClosingCta";
import { Features } from "./Features";
import { Hero } from "./Hero";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
