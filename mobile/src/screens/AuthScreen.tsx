/**
 * Auth Screen - ported from web's AuthForm component
 * Email/password login and signup with the same Supabase auth
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Branding */}
        <View style={styles.brandSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.logoEmoji]}>👗</Text>
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>WearWise</Text>
          <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
            Your AI-powered wardrobe
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, { backgroundColor: colors.card }, Shadows.elegant]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
            {isLogin
              ? 'Sign in to your AI-powered wardrobe'
              : 'Start curating your perfect wardrobe'}
          </Text>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderColor: colors.border,
                }]}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              }]}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setIsLogin(!isLogin); setError(''); }}
            style={styles.toggleButton}
          >
            <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>
              {isLogin
                ? "Don't have an account? "
                : 'Already have an account? '}
              <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing['3xl'],
    },
    brandSection: {
      alignItems: 'center',
      marginBottom: Spacing['2xl'],
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.base,
    },
    logoEmoji: {
      fontSize: 36,
    },
    brandName: {
      fontSize: Typography.fontSize['3xl'],
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: Typography.letterSpacing.tight,
    },
    brandTagline: {
      fontSize: Typography.fontSize.sm,
      marginTop: Spacing.xs,
    },
    formCard: {
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
    },
    formTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      letterSpacing: Typography.letterSpacing.tight,
      marginBottom: Spacing.xs,
    },
    formSubtitle: {
      fontSize: Typography.fontSize.sm,
      marginBottom: Spacing.xl,
    },
    inputGroup: {
      marginBottom: Spacing.base,
    },
    label: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      marginBottom: Spacing.sm,
    },
    input: {
      height: 48,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.base,
      fontSize: Typography.fontSize.base,
      borderWidth: 1,
    },
    errorBox: {
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.base,
    },
    errorText: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
    },
    submitButton: {
      height: 48,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.sm,
    },
    submitText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
    toggleButton: {
      marginTop: Spacing.lg,
      alignItems: 'center',
    },
    toggleText: {
      fontSize: Typography.fontSize.sm,
    },
  });
