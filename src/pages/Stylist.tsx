import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, User, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClothingItems } from '@/hooks/useClothingItems';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface RecentOutfit {
  name: string;
  occasion: string | null;
  worn_at: string;
  items: { name: string; category: string }[];
}

export default function Stylist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: wardrobeItems } = useClothingItems('all');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Aura, your personal style advisor. I can see your wardrobe and know what you've worn recently, so I'll suggest fresh outfit combinations you haven't tried lately. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentOutfits, setRecentOutfits] = useState<RecentOutfit[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Suggest a new outfit',
    'What should I wear today?',
    'Office appropriate looks',
    'Date night ideas',
  ];

  // Load recent outfits for context
  useEffect(() => {
    if (!user) return;

    const loadRecentOutfits = async () => {
      const { data: outfits } = await supabase
        .from('outfits')
        .select('name, occasion, worn_at, item_ids')
        .eq('user_id', user.id)
        .not('worn_at', 'is', null)
        .order('worn_at', { ascending: false })
        .limit(10);

      if (outfits && outfits.length > 0) {
        // Get clothing items for each outfit
        const outfitsWithItems = outfits.map(outfit => {
          const items = outfit.item_ids
            .map((id: string) => wardrobeItems.find(item => item.id === id))
            .filter(Boolean)
            .map((item: any) => ({ name: item.name, category: item.category }));

          return {
            name: outfit.name,
            occasion: outfit.occasion,
            worn_at: outfit.worn_at!,
            items,
          };
        });

        setRecentOutfits(outfitsWithItems);
      }
    };

    if (wardrobeItems.length > 0) {
      loadRecentOutfits();
    }
  }, [user, wardrobeItems]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('stylist-chat', {
        body: {
          message: text,
          wardrobeItems: wardrobeItems.map(item => ({
            name: item.name,
            category: item.category,
            color: item.color,
            brand: item.brand,
          })),
          recentOutfits,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error calling stylist:', error);
      
      let errorMessage = "I'm having trouble thinking right now. Please try again in a moment.";
      if (error.message?.includes('Rate limit')) {
        errorMessage = "I'm a bit overwhelmed with requests. Please wait a moment and try again.";
      } else if (error.message?.includes('credits')) {
        errorMessage = "It seems we've run out of AI credits. Please check your account.";
      }

      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Aura Stylist" subtitle="Your AI fashion advisor">
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 animate-fade-in',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-accent-foreground'
                )}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 max-w-[80%]',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Aura anything..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
