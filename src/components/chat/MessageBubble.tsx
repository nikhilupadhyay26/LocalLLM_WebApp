import type { ChatMessage } from '@/types';
import { renderModelOutput } from '@/lib/markdown';

const STATUS_LABEL: Partial<Record<NonNullable<ChatMessage['status']>, string>> = {
  retrieving: 'Searching your documents…',
  summarizing: 'Condensing earlier messages…',
};

function ThinkingIndicator({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted" aria-label={label ?? 'Generating response'}>
      {label && <span className="text-sm">{label}</span>}
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-400" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-400 [animation-delay:300ms]" />
      </span>
    </span>
  );
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'note') {
    return <p className="mono-tag py-1 text-center text-muted">{message.content}</p>;
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75ch] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-signal/15 text-primary' : 'card text-primary'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <div
            className="[&_p]:mb-2 last:[&_p]:mb-0 [&_code]:rounded [&_code]:bg-ink-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: renderModelOutput(message.content) }}
          />
        ) : (
          <ThinkingIndicator label={message.status ? STATUS_LABEL[message.status] : undefined} />
        )}
        {message.citedChunkIds && message.citedChunkIds.length > 0 && (
          <p className="mono-tag mt-2 text-muted">
            Grounded in {message.citedChunkIds.length} passage{message.citedChunkIds.length === 1 ? '' : 's'} from
            your documents
          </p>
        )}
      </div>
    </div>
  );
}
