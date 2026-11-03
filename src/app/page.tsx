import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";

export default async function Home() {
  // Signed-in users go straight to the chat; everyone else sees the landing page.
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return <Landing />;
}
