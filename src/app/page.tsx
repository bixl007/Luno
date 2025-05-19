import Image from "next/image";
import { Landing } from "./components/Landing";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <Landing />

    </div>
  );
}
