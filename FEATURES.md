# StyleSync - Feature Documentation

A personal AI-powered wardrobe management and styling application.

---

## 🗂️ Wardrobe Management

### Digital Wardrobe
- **Upload Clothing Items**: Add photos of your clothes with automatic background removal
- **AI Analysis**: Automatic detection of clothing category, color, and brand using AI
- **Category Organization**: Filter items by category (tops, bottoms, dresses, shoes, accessories, outerwear)
- **Item Management**: View, organize, and delete items from your wardrobe

### Supported Categories
- Tops (shirts, blouses, t-shirts)
- Bottoms (pants, skirts, shorts)
- Dresses
- Shoes
- Accessories
- Outerwear (jackets, coats)

---

## 👗 AI Outfit Creator

### Smart Outfit Generation
- **Occasion-Based Suggestions**: Enter an occasion (business meeting, date night, casual weekend, etc.) and receive 3 AI-curated outfit combinations
- **Wardrobe-Aware**: Only suggests outfits using items you actually own
- **Dress Code Compliance**: AI follows appropriate dress codes for each occasion type
- **Variety Tracking**: Avoids suggesting recently worn combinations

### Supported Occasions
- Business Meeting
- Date Night
- Casual Weekend
- Wedding Guest
- Job Interview
- Beach Day
- Gym Session
- Night Out

### Wardrobe Gap Detection
- Alerts when you lack appropriate items for an occasion
- Provides specific recommendations for missing items

---

## 🪞 Virtual Try-On

### AI-Powered Try-On
- **Upload Your Photo**: Add a full-body photo as your avatar
- **Single Item Try-On**: See how individual clothing items look on you
- **Outfit Try-On**: Preview complete outfit combinations on your photo
- **Persistent Results**: Try-on results are saved for future reference

---

## 📅 Outfit History & Calendar

### Outfit Tracking
- **Visual Calendar**: Interactive calendar showing which outfits you wore on each date
- **Automatic Logging**: "Wear Today" button on outfit suggestions instantly logs to history
- **Manual Logging**: Add past outfits by selecting items for any date
- **Occasion Tags**: Track the occasion for each outfit worn

### History Features
- View all outfits worn on a specific date
- See thumbnail previews of items in each outfit
- Delete outfit entries
- Calendar highlights days with logged outfits

---

## 💬 AI Stylist Chat

### Personal Styling Assistant
- **Conversational Interface**: Chat naturally with your AI stylist
- **Wardrobe Context**: Stylist knows your entire wardrobe and recent outfits
- **Style Advice**: Get personalized recommendations and tips
- **Outfit Suggestions**: Request outfit ideas through conversation
- **Variety Awareness**: Stylist avoids suggesting recently worn combinations

---

## ✈️ Travel & Packing

### Trip Planning
- **Create Trips**: Plan trips with destination and date ranges
- **Daily Outfit Planning**: Assign outfits to each day of your trip
- **Auto Packing List**: Automatically generated from planned outfits
- **Category Grouping**: Packing list organized by clothing category
- **Calendar Integration**: Trips appear on History calendar

---

## 📊 Wardrobe Insights

### Stats Dashboard
- **Total Items**: Count of all wardrobe pieces
- **Total Wears**: How many times you've worn outfits
- **Wardrobe Value**: Sum of all item prices
- **Never Worn**: Items that haven't been used yet

### Cost-Per-Wear
- **Track Item Prices**: Add purchase price when adding items
- **Calculate CPW**: Automatic cost-per-wear calculation
- **Best Value Items**: Ranked list of lowest cost-per-wear items
- **Average CPW**: Overall wardrobe cost efficiency

### Wardrobe Analysis
- **Most Worn Items**: Top 5 most frequently used pieces
- **Least Worn Items**: Identify underutilized items
- **Color Palette**: Visual breakdown of wardrobe colors
- **Brand Distribution**: See which brands dominate your closet
- **Category Breakdown**: Balance across tops, bottoms, etc.

### Outfit Variety Tracking
- **Variety Score**: 0-100 score measuring outfit diversity
- **Similarity Detection**: Identifies outfits with overlapping items or colors
- **Neglected Items**: Highlights pieces not worn in 30+ days
- **Wear Count Tracking**: Tracks how often each item is worn
- **Silhouette Analysis**: Categorizes outfits by shape (balanced, top-heavy, etc.)

---

## 🌤️ Weather-Based Suggestions

### Smart Weather Integration
- **Location-Based**: Uses your current location for weather data
- **Real-Time Weather**: Fetches current temperature, conditions, humidity, and wind
- **Cold Tolerance Setting**: Personalize suggestions based on how you handle cold
- **Weather-Aware Outfits**: AI suggests appropriate clothing for current conditions

---

## 🛒 Wishlist & Shopping

### Wishlist Management
- **Add Items**: Track clothing pieces you want to buy
- **Priority Levels**: Set high, medium, or low priority
- **Target Prices**: Set budget goals for each item
- **Category Organization**: Organize by clothing category
- **Purchase Tracking**: Mark items as purchased when bought

### AI Shopping Suggestions
- **Find Similar Items**: Get AI-powered shopping recommendations
- **Style Matching**: Suggestions based on your wardrobe style
- **Budget Awareness**: Recommendations within your price range

---

## 👤 User Profile

### Account Management
- **Profile Photo**: Upload and manage your avatar
- **Display Name**: Customize your profile name
- **Authentication**: Secure email/password authentication
- **Session Management**: Sign out functionality

---

## 🔐 Security & Privacy

### Data Protection
- **Row-Level Security**: All data is protected per-user
- **Authenticated Access**: Only view and manage your own items
- **Secure Storage**: Images stored in protected cloud buckets

---

## 🛠️ Technical Features

### Backend (Lovable Cloud)
- **Database**: PostgreSQL with automatic schema management
- **Edge Functions**: Serverless AI processing for:
  - Clothing analysis
  - Outfit generation
  - Virtual try-on
  - Background removal
  - Stylist chat
- **File Storage**: Secure buckets for clothing images, avatars, and try-on results

### Frontend
- **React + TypeScript**: Modern, type-safe codebase
- **Responsive Design**: Mobile-first, works on all devices
- **Real-time Updates**: Instant UI feedback for all actions

---

## 📱 Navigation

- **Home**: Dashboard and overview
- **Wardrobe**: Manage your clothing items
- **Create**: Generate AI outfit suggestions
- **Try On**: Virtual try-on experience
- **History**: Calendar-based outfit tracking
- **Stylist**: AI chat assistant
- **Profile**: Account settings

---

*Built with Lovable*
