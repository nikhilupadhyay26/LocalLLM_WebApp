import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import MessageBubble from './MessageBubble';
import Composer from './Composer';

interface ChatPanelProps {
  selectedDocumentIds: string[];
}

export default function ChatPanel({ selectedDocumentIds }: ChatPanelProps) {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const chatSessions = useAppStore((s) => s.chatSessions);
  const startChatSession = useAppStore((s) => s.startChatSession);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const generatingSessionIds = useAppStore((s) => s.generatingSessionIds);
  const isGenerating = activeChatId != null && generatingSessionIds.includes(activeChatId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = chatSessions.find((c) => c.id === activeChatId);
  const lastMessage = session?.messages[session.messages.length - 1];
  const messageCount = session?.messages.length ?? 0;
  const lastMessageContent = lastMessage?.content;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messageCount, lastMessageContent]);

  const handleSend = async (text: string) => {
    if (!activeChatId || !session) {
      await startChatSession(selectedDocumentIds);
    }
    await sendMessage(text);
  };

  // Chat works with zero documents uploaded: no selection just means
  // general-assistant answers instead of document-grounded ones (store
  // skips retrieval entirely in that case). Selecting/uploading documents
  // is an enhancement, never a gate.
  const hasSelection = selectedDocumentIds.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {(!session || session.messages.length === 0) && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-muted">
            <p className="text-sm">
              {hasSelection
                ? `Ask anything about the selected document${selectedDocumentIds.length > 1 ? 's' : ''}.`
                : 'Ask anything.'}
            </p>
            {!hasSelection && (
              <p className="text-xs text-muted">Upload a document from the sidebar to ground answers in it.</p>
            )}
          </div>
        )}
        {session?.messages.map((m, i) => <MessageBubble key={i} message={m} />)}
      </div>
      <Composer
        onSend={(text) => void handleSend(text)}
        disabled={isGenerating}
        placeholder={hasSelection ? 'Ask about the selected documents…' : 'Ask anything…'}
      />
    </div>
  );
}
