import ChatUI from "@/components/ChatUI";
import { AuthWrapper } from "@/components/auth/AuthWrapper";

/**
 * Home page component
 * Wraps the chat UI with authentication requirements
 */
export default function Home() {
  return (
    <AuthWrapper>
      <ChatUI />
    </AuthWrapper>
  );
}
