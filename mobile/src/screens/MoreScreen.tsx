/**
 * More Screen - Hub for secondary features
 * Links to: Profile, Insights, Wishlist, History, Travel
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

const MENU_ITEMS = [
  { screen: 'Profile', emoji: '👤', title: 'Profile', subtitle: 'Account & settings' },
  { screen: 'Insights', emoji: '📊', title: 'Wardrobe Insights', subtitle: 'Analytics & statistics' },
  { screen: 'History', emoji: '📅', title: 'Outfit History', subtitle: 'What you\'ve worn' },
  { screen: 'Wishlist', emoji: '🛍️', title: 'Wishlist', subtitle: 'Shopping wish list' },
  { screen: 'Travel', emoji: '✈️', title: 'Travel & Packing', subtitle: 'Trip planning' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();

  const getInitials = () => {
    if (profile?.display_name) return profile.display_name.charAt(0).toUpperCase();
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* User Card */}
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card }, Shadows.elegant]}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.7}
      >
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarInitials, { color: colors.primary }]}>{getInitials()}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {profile?.display_name || 'Set your name'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.mutedForeground }]}>›</Text>
      </TouchableOpacity>

      {/* Menu Items */}
      <View style={[styles.menuCard, { backgroundColor: colors.card }, Shadows.elegant]}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.screen}
            style={[
              styles.menuItem,
              index < MENU_ITEMS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
            ]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.6}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.secondary }]}>
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.mutedForeground }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          WearWise Mobile v1.0.0
        </Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground + '80' }]}>
          Your AI-powered wardrobe assistant
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarFallback: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 22,
      fontWeight: Typography.fontWeight.semibold,
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.semibold,
    },
    userEmail: {
      fontSize: Typography.fontSize.sm,
      marginTop: 2,
    },
    chevron: {
      fontSize: 24,
      fontWeight: Typography.fontWeight.light,
    },
    menuCard: {
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.base,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.base,
      gap: Spacing.md,
    },
    menuIcon: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuTextGroup: { flex: 1 },
    menuTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
    },
    menuSubtitle: {
      fontSize: Typography.fontSize.sm,
      marginTop: 2,
    },
    footer: {
      alignItems: 'center',
      marginTop: Spacing['2xl'],
      gap: Spacing.xs,
    },
    footerText: {
      fontSize: Typography.fontSize.xs,
    },
  });
