import { ChatWindow } from "@/components/chat/chat-window";

export default function Home() {
  return (
     // Use background color, full height flex container with padding
     <main className="flex flex-col items-center justify-center h-full p-4 bg-background">
      <ChatWindow />
    </main>
  );
}
