import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function Feats() {
  const features = [
    {
      title: "Built for developers",
      description:
        "Built for engineers, developers, dreamers, thinkers and doers.",
      icon: <IconTerminal2 />,
    },
    {
      title: "Ease of use",
      description:
        "It's as easy as using an Apple.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Pricing like no other",
      description:
        "Luno is completely free to use. No cap, no hidden charges, nothing.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Versatile Use Cases",
      description: "Whether it’s learning, brainstorming, scheduling, coding help, or creative writing—Luno adapts to your needs.",
      icon: <IconCloud />,
    },
    {
      title: "Cross-Platform Sync",
      description: "Access Luno on desktop, tablet, or mobile—with synchronized chats and a consistent experience everywhere.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "Fast & Intelligent Responses",
      description:
        "Powered by cutting-edge language models, Luno delivers quick, relevant answers, insights, and actions.",
      icon: <IconHelp />,
    },
    {
      title: "Smart, Human-like Conversations",
      description:
        "Luno uses advanced AI to engage in natural, flowing dialogues that feel intuitive and genuinely helpful.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "Customizable Personality & Tone",
      description: "Choose how Luno interacts with you—professional, friendly, witty, or supportive—your chatbot, your way.",
      icon: <IconHeart />,
    },
  ];
  const totalFeatures = features.length;
  return (
    <div className="py-10 max-w-7xl mx-auto" id="features">
      <h2 className="text-5xl md:text-6xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 via-purple-600 to-purple-800 bg-clip-text text-transparent">
        Features
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} totalFeatures={totalFeatures} />
        ))}
      </div>
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
  totalFeatures,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
  totalFeatures: number;
}) => {
  const borderColorClass = "border-neutral-300 dark:border-neutral-700"; // Consistent border color

  return (
    <div
      className={cn(
        "flex flex-col py-10 relative group/feature", // Base styles
        borderColorClass, // Apply consistent border color for mobile's border-b

        // Mobile (default, 1 column)
        // Add bottom border to all items, except the very last one.
        index !== totalFeatures - 1 ? "border-b" : "border-b-0",

        // Tablet (md:grid-cols-2) - Remove all borders
        "md:border-b-0",
        "md:border-r-0",
        "md:border-l-0",
        "md:border-t-0",

        // Desktop (lg:grid-cols-4) - Remove all borders
        "lg:border-b-0",
        "lg:border-r-0",
        "lg:border-l-0",
        "lg:border-t-0"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-purple-400/20 dark:from-purple-700/20 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-purple-400/20 dark:from-purple-700/20 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-200 dark:text-neutral-200">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-purple-400 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-200 dark:text-neutral-200">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-200 dark:text-neutral-200 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
