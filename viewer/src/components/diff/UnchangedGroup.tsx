import { useState } from 'react';
import type { Message } from '../../types';
import { MessageCard } from '../detail/MessageCard';

interface UnchangedGroupProps {
  messages: Message[];
  expandedMessageId?: string | null;
  onToggleExpand?: (id: string) => void;
}

export function UnchangedGroup({ messages, expandedMessageId, onToggleExpand }: UnchangedGroupProps) {
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);

  const label = messages.length === 1 ? '1 unchanged message' : `${messages.length} unchanged messages`;

  // Collapsed view (default)
  if (!isGroupExpanded) {
    return (
      <button
        onClick={() => setIsGroupExpanded(true)}
        className="w-full py-3 px-4 text-sm text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg border border-dashed border-border-muted transition-colors"
      >
        <span className="font-mono">···</span>
        <span className="ml-2">{label}</span>
      </button>
    );
  }

  // Expanded view
  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsGroupExpanded(false)}
        className="w-full py-2 px-4 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Collapse {label}
      </button>

      {messages.map((message) => (
        <div key={message.id} className="opacity-70">
          <MessageCard
            message={message}
            isExpanded={expandedMessageId === message.id}
            onToggleExpand={() => onToggleExpand?.(message.id)}
          />
        </div>
      ))}

      <button
        onClick={() => setIsGroupExpanded(false)}
        className="w-full py-2 px-4 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Collapse
      </button>
    </div>
  );
}
