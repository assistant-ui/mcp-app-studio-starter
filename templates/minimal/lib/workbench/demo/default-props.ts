"use client";

export interface WelcomeCardDemoInput extends Record<string, unknown> {
  title: string;
  message: string;
}

export const WELCOME_CARD_DEMO_INPUT: WelcomeCardDemoInput = {
  title: "Welcome!",
  message:
    "This is your MCP App. Edit this component to build something amazing.",
};
