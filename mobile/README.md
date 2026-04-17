# WearWise Mobile

React Native mobile companion app for the WearWise AI Wardrobe platform, built with Expo and TypeScript.

## Prerequisites

- Node.js 18+
- Expo CLI (bundled via npx)
- iOS Simulator (Xcode) or Android Emulator, or Expo Go on a physical device

## Quick Start

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start the development server
npx expo start
```

## Environment Variables

The app reads from `mobile/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | _(required)_ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | _(required)_ |
| `EXPO_PUBLIC_API_URL` | Backend server URL | `http://localhost:3011` |
| `EXPO_PUBLIC_ENVIRONMENT` | Environment label | `development` |

These match the web app's `.env` values (`VITE_SUPABASE_URL` → `EXPO_PUBLIC_SUPABASE_URL`, etc.).

## Connecting to Backend

The mobile app connects directly to **Supabase** for:
- Authentication (email/password)
- Database queries (clothing_items, outfits, profiles, wishlist_items)
- Storage (clothing images, avatars)
- Edge Functions (stylist-chat, generate-outfits, find-shopping, etc.)

The Express backend server (`server/`) is only used for background removal, which is currently web-only.

## Running on Device

### iOS Simulator
```bash
npx expo start --ios
```

### Android Emulator
```bash
npx expo start --android
```

### Physical Device
1. Install "Expo Go" from the App Store / Google Play
2. Run `npx expo start`
3. Scan the QR code with your camera (iOS) or Expo Go (Android)

> **Note:** When testing on a physical device, ensure the Supabase URL is accessible (it's a cloud service, so this should work automatically).

## Project Structure

```
mobile/
├── App.tsx                    # Entry point
├── index.ts                   # Expo registration
├── app.json                   # Expo configuration
├── .env                       # Environment variables
└── src/
    ├── theme/
    │   ├── index.ts           # Colors, typography, spacing, shadows
    │   └── useTheme.ts        # Theme hook (light/dark mode)
    ├── types/
    │   └── index.ts           # Shared type definitions (from web)
    ├── services/
    │   └── supabase.ts        # Supabase client (AsyncStorage)
    ├── constants/
    │   └── index.ts           # App constants (occasions, categories)
    ├── hooks/
    │   ├── useAuth.tsx         # Auth context + provider
    │   ├── useClothingItems.ts # Wardrobe data hook
    │   ├── useProfile.ts      # Profile data hook
    │   └── useWishlist.ts     # Wishlist data hook
    ├── navigation/
    │   └── AppNavigation.tsx   # Tab + stack navigation
    └── screens/
        ├── AuthScreen.tsx      # Login / Sign up
        ├── WardrobeScreen.tsx  # Clothing grid with categories
        ├── CreateScreen.tsx    # AI outfit generator
        ├── StylistScreen.tsx   # AI chat assistant
        ├── InsightsScreen.tsx  # Wardrobe analytics
        ├── ProfileScreen.tsx   # Account management
        ├── WishlistScreen.tsx  # Shopping wishlist
        ├── HistoryScreen.tsx   # Outfit history calendar
        ├── TryOnScreen.tsx     # Stub (coming soon)
        └── TravelScreen.tsx   # Stub (coming soon)
```

## What's Ported

| Feature | Web | Mobile | Notes |
|---------|-----|--------|-------|
| Auth (login/signup) | ✅ | ✅ | Same Supabase auth |
| Wardrobe browsing | ✅ | ✅ | Category tabs + grid |
| AI Outfit Creator | ✅ | ✅ | Occasion-based generation |
| AI Stylist Chat | ✅ | ✅ | Same edge function |
| Wardrobe Insights | ✅ | ✅ | Stats, categories, colors |
| Wishlist | ✅ | ✅ | Add/delete/purchase |
| Outfit History | ✅ | ✅ | Month navigation |
| Profile management | ✅ | ✅ | Name, avatar, sign out |
| Virtual Try-On | ✅ | 🔜 | Requires Gemini integration |
| Travel planning | ✅ | 🔜 | Complex calendar UI |
| Weather outfits | ✅ | 🔜 | Needs expo-location |
| Add clothing items | ✅ | 🔜 | Needs camera/image picker |
| Background removal | ✅ | ❌ | Browser WASM only |
| Data export | ✅ | ❌ | Web-only feature |
