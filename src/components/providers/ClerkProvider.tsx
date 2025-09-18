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
          colorPrimary: "#10a37f",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#000000",
          colorText: "#000000",
          colorTextSecondary: "#6b7280",
          colorDanger: "#ef4444",
          borderRadius: "8px",
        },
        elements: {
          formButtonPrimary: "bg-[#10a37f] hover:bg-[#0d8f6f] text-white font-medium",
          card: "bg-white border border-gray-200 shadow-lg",
          headerTitle: "text-gray-900 font-semibold",
          headerSubtitle: "text-gray-600",
          socialButtonsBlockButton: "bg-white hover:bg-gray-50 text-gray-700 border-gray-300",
          formFieldInput: "bg-white border-gray-300 text-gray-900 focus:border-[#10a37f] focus:ring-[#10a37f]",
          footerActionLink: "text-[#10a37f] hover:text-[#0d8f6f]",
          formFieldLabel: "text-gray-700",
          identityPreviewText: "text-gray-900",
          formFieldSuccessText: "text-green-600",
          formFieldErrorText: "text-red-600",
          formFieldWarningText: "text-yellow-600",
          dividerLine: "bg-gray-200",
          dividerText: "text-gray-500",
          formResendCodeLink: "text-[#10a37f] hover:text-[#0d8f6f]",
          otpCodeFieldInput: "bg-white border-gray-300 text-gray-900 focus:border-[#10a37f] focus:ring-[#10a37f]",
          userButtonPopoverCard: "bg-white border-gray-200 shadow-lg",
          userButtonPopoverActionButton: "text-gray-700 hover:bg-gray-100",
          userButtonPopoverActionButtonText: "text-gray-700",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      {children}
    </ClerkProviderBase>
  );
}