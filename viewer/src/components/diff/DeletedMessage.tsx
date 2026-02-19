import type { Message } from '../../types';
import { MessageCard } from '../detail/MessageCard';

interface DeletedMessageProps {
  message: Message;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function DeletedMessage({ message, isExpanded, onToggleExpand }: DeletedMessageProps) {
  return (
    <div className="relative pl-6 opacity-60">
      {/* Red left border indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-full" />

      {/* Minus icon */}
      <div className="absolute left-2 top-3 w-4 h-4 flex items-center justify-center text-red-500 font-bold text-sm">
        -
      </div>

      <MessageCard
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
}
