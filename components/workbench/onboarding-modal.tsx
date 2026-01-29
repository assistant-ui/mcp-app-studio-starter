"use client";

import { Database, Layers, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDemoMode } from "@/hooks/use-demo-mode";

const ONBOARDING_KEY = "mcp-app-studio-workbench-onboarded";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <Layers className="size-5 text-blue-500" />,
    title: "Tool Input",
    description:
      "Data passed to your app via MCP tool calls. Edit these to test different inputs from the model.",
  },
  {
    icon: <Wand2 className="size-5 text-purple-500" />,
    title: "Response Scenarios",
    description:
      "Simulate different tool responses: success, error, slow network. Test edge cases without a live MCP server.",
  },
  {
    icon: <Database className="size-5 text-green-500" />,
    title: "App State",
    description:
      "Persistent state your app maintains across interactions. Visible to the model in follow-up turns.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const isDemoMode = useDemoMode();

  useEffect(() => {
    if (isDemoMode) return;
    const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
    if (!hasOnboarded) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isDemoMode]);

  const handleDismiss = (markComplete: boolean) => {
    if (markComplete) {
      localStorage.setItem(ONBOARDING_KEY, "true");
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && handleDismiss(false)}
    >
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Welcome to MCP App Studio
          </DialogTitle>
          <DialogDescription className="text-sm">
            Build and test MCP widgets locally before deploying to Claude
            Desktop, ChatGPT, or any MCP-compatible host.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {STEPS.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                {step.icon}
              </div>
              <div>
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleDismiss(true)}>
            Skip
          </Button>
          <Button size="sm" onClick={() => handleDismiss(true)}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
