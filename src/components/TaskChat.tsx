import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTaskMessages, MessageWithProfile } from '@/hooks/useTaskMessages';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TaskChatProps {
  taskId: string;
  creatorId: string;
}

export function TaskChat({ taskId, creatorId }: TaskChatProps) {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useTaskMessages(taskId);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const message = inputValue;
    setInputValue('');
    
    const { error } = await sendMessage(message);
    
    if (error) {
      // Restore input if failed
      setInputValue(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[300px]">
      {/* Messages area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-3 py-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwn={message.user_id === user?.id}
                  isCreator={message.user_id === creatorId}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="pt-3 border-t mt-2">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            size="icon"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: MessageWithProfile;
  isOwn: boolean;
  isCreator: boolean;
}

function ChatMessage({ message, isOwn, isCreator }: ChatMessageProps) {
  const displayName = message.profile?.full_name || 'Anonymous';
  const avatarUrl = message.profile?.avatar_url;
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "flex gap-2",
        isOwn && "flex-row-reverse"
      )}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className={cn(
          "text-xs",
          isCreator && "bg-primary text-primary-foreground"
        )}>
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col max-w-[75%]",
        isOwn && "items-end"
      )}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium">
            {isOwn ? 'You' : displayName}
          </span>
          {isCreator && !isOwn && (
            <span className="text-xs text-primary font-medium">Creator</span>
          )}
        </div>

        <div className={cn(
          "px-3 py-2 rounded-lg text-sm",
          isOwn 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-muted rounded-tl-none"
        )}>
          {message.message}
        </div>

        <span className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
}
