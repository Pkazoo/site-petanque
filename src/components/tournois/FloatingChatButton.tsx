import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FloatingChatButtonProps {
  matchId: string;
  show: boolean;
  unreadCount?: number;
}

export function FloatingChatButton({ matchId, show, unreadCount = 0 }: FloatingChatButtonProps) {
  if (!show) return null;

  return (
    <Link
      href={`/messages?matchId=${matchId}`}
      className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50"
    >
      <Button
        size="lg"
        className="h-14 w-14 md:h-12 md:w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
