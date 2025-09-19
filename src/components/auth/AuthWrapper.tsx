"use client";

import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface AuthWrapperProps {
  children: ReactNode;
}

/**
 * Authentication wrapper component
 * Handles user authentication state and provides sign-in/sign-out functionality
 * Shows loading state while authentication is being verified
 */
export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isLoaded, isSignedIn } = useUser();

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-white/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show sign-in interface if user is not authenticated
  if (!isSignedIn) {
    return (
      <div className="h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-[#1E1F20] border-white/10">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Welcome to ChatGPT Clone</h1>
              <p className="text-white/60 text-sm">
                Sign in to start chatting with AI
              </p>
            </div>
            
            <div className="space-y-4">
              <SignInButton mode="modal">
                <Button className="w-full bg-white text-black hover:bg-white/90">
                  Sign In
                </Button>
              </SignInButton>
              
              <p className="text-xs text-white/40">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show authenticated interface - just pass through children
  return <>{children}</>;
}
