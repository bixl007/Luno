import { LogoMark } from "@/components/brand/Logo";

export default function Loading() {
  return (
    <div className="grid h-dvh place-items-center bg-background" role="status" aria-label="Loading Luno">
      <LogoMark className="size-9 animate-pulse text-foreground" />
    </div>
  );
}
