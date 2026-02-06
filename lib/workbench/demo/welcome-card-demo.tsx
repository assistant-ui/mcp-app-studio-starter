"use client";

import { WelcomeCard } from "@/components/examples/welcome-card";
import { WELCOME_CARD_DEMO_INPUT } from "./default-props";

export function WelcomeCardDemo() {
  return (
    <WelcomeCard
      title={WELCOME_CARD_DEMO_INPUT.title}
      message={WELCOME_CARD_DEMO_INPUT.message}
      theme="dark"
    />
  );
}
