/**
 * Stylist Screen - ported from web's pages/Stylist.tsx
 * AI chat interface with quick prompts, same Supabase edge function calls
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useClothingItems } from '../hooks/useClothingItems';
import { supabase } from '../services/supabase';
import { QUICK_PROMPTS } from '../constants';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function StylistScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { items: wardrobeItems } = useClothingItems('all');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm Aura, your personal style advisor. I can see your wardrobe and know what you've worn recently, so I'll suggest fresh outfit combinations you haven't tried lately. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
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
          recentOutfits: [], // simplified for mobile
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error calling stylist:', error);
      const errorMessage =
        "I'm having trouble thinking right now. Please try again in a moment.";
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

  const styles = createStyles(colors);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: isUser ? colors.primary : colors.accent },
          ]}
        >
          <Text style={styles.avatarEmoji}>{isUser ? '👤' : '✨'}</Text>
        </View>
        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? colors.primary : colors.muted,
              maxWidth: '78%',
            },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? colors.primaryForeground : colors.foreground },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={[styles.messageRow]}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarEmoji}>✨</Text>
              </View>
              <View style={[styles.bubble, { backgroundColor: colors.muted }]}>
                <View style={styles.typingDots}>
                  {[0, 1, 2].map(i => (
                    <View
                      key={i}
                      style={[styles.dot, { backgroundColor: colors.mutedForeground + '80' }]}
                    />
                  ))}
                </View>
              </View>
            </View>
          ) : null
        }
      />

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <View style={styles.quickPromptsContainer}>
          <ScrollablePrompts colors={colors} onSelect={handleSend} />
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.input,
              color: colors.foreground,
              borderColor: colors.border,
            },
          ]}
          placeholder="Ask Aura anything..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          editable={!loading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: input.trim() && !loading ? colors.primary : colors.muted,
            },
          ]}
          onPress={() => handleSend()}
          disabled={!input.trim() || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.sendIcon, { color: input.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
              ➤
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function ScrollablePrompts({ colors, onSelect }: { colors: any; onSelect: (text: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
      {QUICK_PROMPTS.map(prompt => (
        <TouchableOpacity
          key={prompt}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.secondary,
          }}
          onPress={() => onSelect(prompt)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: Typography.fontSize.sm, color: colors.secondaryForeground }}>
            {prompt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    messagesList: {
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.base,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: Spacing.base,
      gap: Spacing.sm,
    },
    messageRowUser: {
      flexDirection: 'row-reverse',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 14,
    },
    bubble: {
      borderRadius: BorderRadius.xl,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
    },
    bubbleText: {
      fontSize: Typography.fontSize.sm,
      lineHeight: 20,
    },
    typingDots: {
      flexDirection: 'row',
      gap: 4,
      paddingVertical: 4,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    quickPromptsContainer: {
      paddingBottom: Spacing.md,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderTopWidth: 1,
      gap: Spacing.sm,
    },
    textInput: {
      flex: 1,
      height: 44,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.base,
      fontSize: Typography.fontSize.base,
      borderWidth: 1,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendIcon: {
      fontSize: 18,
    },
  });
