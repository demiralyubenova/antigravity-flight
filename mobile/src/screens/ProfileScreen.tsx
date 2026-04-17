/**
 * Profile Screen - ported from web's pages/Profile.tsx
 * Avatar display, display name edit, account info, sign out
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    } else if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    }
  }, [profile, user]);

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({ display_name: displayName || null });
      if (error) throw error;
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Avatar Section */}
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
        <View style={styles.avatarSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>
                {getInitials()}
              </Text>
            </View>
          )}
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {profile?.display_name || 'Set your name'}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>
      </View>

      {/* Profile Details */}
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>👤 Profile Details</Text>
          <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
            Update your personal information
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: colors.foreground }]}>Display Name</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isEditing ? (
            <View style={[styles.readonlyField, { backgroundColor: colors.secondary + '50', borderColor: colors.border + '80' }]}>
              <Text style={[styles.readonlyText, { color: colors.foreground }]}>
                {displayName || user?.email?.split('@')[0] || 'User'}
              </Text>
            </View>
          ) : (
            <View style={styles.editSection}>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.input,
                  color: colors.foreground,
                  borderColor: colors.border,
                }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.mutedForeground}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.secondary }]}
                  onPress={() => {
                    setIsEditing(false);
                    setDisplayName(profile?.display_name || user?.email?.split('@')[0] || '');
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.secondaryForeground }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Account Info */}
      <View style={[styles.card, { backgroundColor: colors.card }, Shadows.elegant]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>✉️ Account Information</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>📅 Member since</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{memberSince}</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <View style={[styles.card, { backgroundColor: colors.destructive + '08' }, Shadows.elegant]}>
        <View style={styles.signOutSection}>
          <Text style={[styles.signOutLabel, { color: colors.mutedForeground }]}>
            Finished for today?
          </Text>
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.destructive }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={[styles.signOutText, { color: colors.destructiveForeground }]}>
              🚪 Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      overflow: 'hidden',
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.base,
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      marginBottom: Spacing.base,
    },
    avatarFallback: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.base,
    },
    avatarInitials: {
      fontSize: 36,
      fontWeight: Typography.fontWeight.semibold,
    },
    displayName: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      letterSpacing: Typography.letterSpacing.tight,
    },
    email: {
      fontSize: Typography.fontSize.sm,
      marginTop: Spacing.xs,
    },
    cardHeader: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
    },
    cardTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
    },
    cardDescription: {
      fontSize: Typography.fontSize.sm,
      marginTop: Spacing.xs,
    },
    cardBody: {
      padding: Spacing.lg,
    },
    fieldHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    label: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    editLink: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    readonlyField: {
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
    },
    readonlyText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    editSection: {
      gap: Spacing.md,
    },
    input: {
      height: 48,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.base,
      fontSize: Typography.fontSize.base,
      borderWidth: 1,
    },
    editButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    button: {
      flex: 1,
      height: 44,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
    },
    infoLabel: {
      fontSize: Typography.fontSize.sm,
    },
    infoValue: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    signOutSection: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.base,
      gap: Spacing.md,
    },
    signOutLabel: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    signOutButton: {
      width: '100%',
      height: 48,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
    },
  });
