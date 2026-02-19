import type { Message } from '../../types';
import { MessageCard } from '../detail/MessageCard';

interface AddedMessageProps {
  message: Message;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function AddedMessage({ message, isExpanded, onToggleExpand }: AddedMessageProps) {
  return (
    <div className="relative pl-6">
      {/* Green left border indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-full" />

      {/* Plus icon */}
      <div className="absolute left-2 top-3 w-4 h-4 flex items-center justify-center text-green-500 font-bold text-sm">
        +
      </div>

      <MessageCard
        message={message}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
}
