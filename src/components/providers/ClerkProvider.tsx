"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { ReactNode } from "react";

interface ClerkProviderProps {
  children: ReactNode;
}

/**
 * ClerkProvider wrapper component for authentication
 * Provides authentication context to the entire application
 */
export function ClerkProvider({ children }: ClerkProviderProps) {
  return (
    <ClerkProviderBase
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#000000",
          colorBackground: "#0F0F0F",
          colorInputBackground: "#1E1F20",
          colorInputText: "#FFFFFF",
        },
        elements: {
          formButtonPrimary: "bg-black hover:bg-gray-800 text-white",
          card: "bg-[#0F0F0F] border border-white/10",
          headerTitle: "text-white",
          headerSubtitle: "text-white/60",
          socialButtonsBlockButton: "bg-white/10 hover:bg-white/20 text-white border-white/10",
          formFieldInput: "bg-[#1E1F20] border-white/10 text-white",
          footerActionLink: "text-white hover:text-white/80",
        },
      }}
    >
      {children}
    </ClerkProviderBase>
  );
}
