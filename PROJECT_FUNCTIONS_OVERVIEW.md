# StyleSync (Antigravity Flight) - Complete Functions Overview

## 📋 Project Summary

**StyleSync** (formerly Aura AI Fashion Stylist) is a comprehensive AI-powered wardrobe management and personal styling application. It combines computer vision, generative AI, and intelligent recommendation systems to help users manage their clothing, create outfits, and make better fashion decisions.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Local AI Server**: Node.js + Express (port 3011)
- **AI Services**: Google Gemini 2.0 Flash, FAL.ai (virtual try-on)
- **Image Processing**: rembg (Python background removal)

---

## 🏗️ Architecture Overview

### Three-Tier Architecture:

1. **Frontend (React SPA)** - User interface and client-side logic
2. **Supabase Backend** - Database, authentication, and serverless edge functions
3. **Local AI Server** - Python-based image processing (background removal)

---

## 📂 Core Modules & Functions

### 1. **Backend Server** (`/server`)

#### **Main Server** (`server.ts`)
- **Port**: 3011
- **Purpose**: Local Node.js/Express server for AI image processing
- **Features**:
  - CORS enabled for cross-origin requests
  - Request logging middleware
  - Uploads directory management
  - Routes mounted at `/api`

#### **Image Service** (`services/imageService.ts`)

**Function: `removeBackgroundService(filePath, mimeType)`**
- **Purpose**: Remove background from clothing/person images using Python rembg
- **Process**:
  1. Locates Python virtual environment (`.venv`)
  2. Spawns Python subprocess running `process_image.py`
  3. Passes input image path and output path
  4. Captures Python stdout/stderr
  5. Reads processed image and converts to base64
  6. Returns base64-encoded PNG
- **Error Handling**: Comprehensive error logging and cleanup
- **Platform Support**: Windows and Unix-like systems

#### **AI Routes** (`routes/aiRoute.ts`)

**Endpoint: `POST /api/remove-background`**
- **Middleware**: Multer file upload (single file)
- **Input**: Multipart form data with image file
- **Output**: JSON with base64 result
- **Error Codes**: 400 (no file), 500 (processing error)

---

### 2. **Frontend Services** (`/src/services`)

#### **AI Service** (`ai-service.ts`)

**Function: `removeBackground(file, type)`**
- **Purpose**: Client-side wrapper for background removal API
- **Parameters**:
  - `file`: File object from user upload
  - `type`: 'CLOTHING' | 'PERSON'
- **Process**:
  1. Creates FormData with file and type
  2. Sends POST to `http://localhost:3011/api/remove-background`
  3. Parses JSON response
  4. Returns base64 image string
- **Error Handling**: Throws descriptive errors for debugging

---

### 3. **Supabase Edge Functions** (`/supabase/functions`)

All edge functions use **Deno runtime** and **Google Gemini 2.0 Flash API**.

#### **A. Clothing Analysis** (`analyze-clothing/index.ts`)

**Function: `POST /analyze-clothing`**
- **Purpose**: Extract metadata from clothing images using AI vision
- **Input**: `{ imageUrl: string }`
- **AI Prompt**: Analyzes image and extracts:
  - `name`: Descriptive item name (e.g., "Black Diesel Hoodie")
  - `category`: tops | bottoms | dresses | outerwear | shoes | accessories
  - `color`: Primary color
  - `brand`: Brand name if visible
- **Output**: JSON object with extracted metadata
- **Model**: Gemini 2.0 Flash with vision capabilities
- **Temperature**: 0.1 (low for consistent extraction)

**Helper: `fetchImageAsBase64(url)`**
- Converts image URL to base64 for Gemini API

---

#### **B. Outfit Generation** (`generate-outfits/index.ts`)

**Function: `POST /generate-outfits`**
- **Purpose**: Generate 3 AI-curated outfit combinations for specific occasions
- **Input**:
  ```typescript
  {
    occasion: string,
    wardrobeItems: ClothingItem[],
    recentOutfits?: Outfit[],
    userFeedback?: {
      lovedItemIds: string[],
      hatedItemIds: string[],
      prefersWarmer: boolean,
      prefersCooler: boolean,
      prefersMoreFormal: boolean,
      prefersMoreCasual: boolean,
      totalFeedbackCount: number
    }
  }
  ```
- **AI Logic**:
  - Enforces strict dress codes per occasion (business, casual, formal, etc.)
  - Avoids recently worn combinations
  - Incorporates user feedback preferences
  - Uses exact item IDs from wardrobe
  - Detects wardrobe gaps (insufficient items)
- **Output**:
  ```typescript
  {
    insufficient: boolean,
    missingItems: string[],
    outfits: [
      {
        name: string,
        description: string,
        itemIds: string[]
      }
    ]
  }
  ```
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 2000

**Dress Code Rules**:
- **Business/Interview**: Blazers, dress shirts, slacks, NO hoodies/sneakers
- **Date Night**: Elegant dresses, stylish tops, heels
- **Casual Weekend**: Jeans, t-shirts, sneakers
- **Gym**: Athletic wear only
- **Wedding**: Formal attire
- **Formal Event**: Evening gowns, suits

---

#### **C. Virtual Try-On** (`virtual-tryon/index.ts`)

**Function: `POST /virtual-tryon`**
- **Purpose**: Generate realistic try-on images using FAL.ai's high-fidelity VTON model
- **Input**:
  ```typescript
  {
    personImageUrl: string,
    clothingItems: [
      {
        imageUrl: string,
        type?: string,
        name?: string,
        category?: string
      }
    ]
  }
  ```
- **Process**:
  1. Fetches person and clothing images as base64
  2. Constructs detailed prompt for each clothing item
  3. Calls FAL.ai VTON API (`fal-ai/idm-vton`)
  4. Processes Gemini response for multi-item try-ons
  5. Returns try-on result images
- **AI Model**: FAL.ai IDM-VTON (high-fidelity virtual try-on)
- **Fallback**: Uses Gemini for multi-item outfit visualization

**Helper: `fetchImageAsBase64WithMime(url)`**
- Returns `{ base64, mimeType }` for API compatibility

**Helper: `processGeminiResponse(data, corsHeaders)`**
- Extracts image URLs from Gemini's inline data responses

---

#### **D. Stylist Chat** (`stylist-chat/index.ts`)

**Function: `POST /stylist-chat`**
- **Purpose**: Conversational AI fashion advisor
- **Input**:
  ```typescript
  {
    message: string,
    wardrobeItems?: ClothingItem[],
    recentOutfits?: Outfit[]
  }
  ```
- **AI Personality**: "Aura" - sophisticated, warm, encouraging style advisor
- **Context Awareness**:
  - Full wardrobe inventory
  - Recent outfit history (to suggest variety)
  - User's style preferences
- **Capabilities**:
  - Outfit combination suggestions
  - Shopping recommendations
  - Styling tips
  - Occasion-specific advice
- **Output**: `{ reply: string }`
- **Temperature**: 0.8 (conversational and creative)
- **Max Tokens**: 1000

---

#### **E. Weather-Based Outfits** (`weather-outfits/index.ts`)

**Function: `POST /weather-outfits`**
- **Purpose**: Generate weather-appropriate outfit suggestions
- **Input**:
  ```typescript
  {
    latitude: number,
    longitude: number,
    wardrobeItems: ClothingItem[],
    coldTolerance?: 'cold-blooded' | 'normal' | 'warm-blooded'
  }
  ```
- **Weather API**: Open-Meteo (free, no API key)
- **Weather Data**:
  - Temperature (°F)
  - Feels like temperature
  - Condition (clear, rain, snow, etc.)
  - Humidity
  - Wind speed
  - Precipitation
- **Cold Tolerance Adjustment**:
  - Cold-blooded: +5°F perceived temp
  - Warm-blooded: -5°F perceived temp
- **AI Logic**:
  - Suggests 2-3 complete outfits
  - Considers layering for variable conditions
  - Accounts for rain/snow protection
  - Uses only user's wardrobe items
- **Output**:
  ```typescript
  {
    weather: WeatherData,
    suggestions: string,
    perceivedTemperature: number
  }
  ```

**Weather Code Mapping**:
- 0: Clear sky
- 1-3: Partly cloudy
- 4-49: Foggy
- 50-59: Drizzle
- 60-69: Rain
- 70-79: Snow
- 80-99: Thunderstorm

---

#### **F. Shopping Finder** (`find-shopping/index.ts`)

**Function: `POST /find-shopping`**
- **Purpose**: Find similar clothing items for purchase
- **Input**: Clothing item details and budget
- **Output**: Shopping recommendations with links

---

#### **G. Outfit Try-On** (`outfit-tryon/index.ts`)

**Function: `POST /outfit-tryon`**
- **Purpose**: Try on complete outfits (multiple items)
- **Similar to**: virtual-tryon but for full outfit combinations

---

#### **H. Background Removal** (`remove-background/index.ts`)

**Function: `POST /remove-background`**
- **Purpose**: Cloud-based background removal (alternative to local server)
- **Note**: May use external API or Supabase storage

---

### 4. **Frontend Pages** (`/src/pages`)

#### **A. Wardrobe Page** (`Wardrobe.tsx`)

**Key Functions**:
- Display clothing items in grid layout
- Category filtering (tops, bottoms, dresses, etc.)
- Subcategory filtering
- Add new items via dialog
- Delete items
- Search functionality

---

#### **B. Create (Outfit Generator)** (`Create.tsx`)

**Component: `Create()`**

**State Management**:
- `occasion`: Current occasion input
- `outfitSuggestions`: Array of generated outfits
- `isGenerating`: Loading state
- `avatarUrl`: User's body photo
- `recentOutfits`: Last 30 days of outfits
- `tryOnStates`: Try-on loading/error states per outfit

**Key Functions**:

**`loadAvatar()`**
- Fetches user's avatar from `avatars` table
- Sets `avatarUrl` state

**`loadRecentOutfits()`**
- Queries last 30 days of worn outfits
- Used to avoid repetition in suggestions

**`handleGenerateOutfits()`**
- **Process**:
  1. Validates occasion input
  2. Fetches all wardrobe items
  3. Loads user feedback preferences
  4. Calls `generate-outfits` edge function
  5. Enriches outfit data with item details
  6. Saves state to localStorage
  7. Auto-generates try-on images if avatar exists
- **Error Handling**: Wardrobe gap detection, API errors

**`generateTryOn(index, outfits)`**
- Calls `virtual-tryon` edge function
- Updates outfit with try-on image URL
- Handles errors gracefully

**`handleRetryTryOn(index)`**
- Retries failed try-on generation

**`handleWearToday(index)`**
- Saves outfit to database as worn today
- Navigates to History page

**`handleSaveOutfit(index)`**
- Saves outfit as planned (not worn yet)

**Persistence**:
- Uses localStorage key: `create_state_${userId}`
- Saves: occasion, suggestions, try-on images

---

#### **C. Try-On Page** (`TryOn.tsx`)

**Component: `TryOn()`**

**State Management**:
- `personImage`: User's uploaded photo (base64)
- `selectedItems`: Array of selected clothing items
- `tryOnResult`: Generated try-on image
- `savedResults`: Historical try-on results
- `selectedCategory`: Filter category
- `selectedSubcategory`: Filter subcategory
- `searchQuery`: Search input

**Key Functions**:

**`loadData()`**
- Fetches wardrobe items
- Loads saved try-on results from database

**`handleFileChange(e)`**
- Reads uploaded image file
- Converts to base64 data URL
- Sets `personImage` state

**`saveAsAvatar()`**
- Uploads person image to Supabase storage
- Updates user's avatar in `avatars` table

**`saveTryOnResult(resultBase64)`**
- Uploads try-on result to storage
- Inserts record in `tryon_results` table
- Returns public URL

**`handleTryOn()`**
- **Process**:
  1. Validates person image and selected items
  2. Uploads person image to storage
  3. Prepares clothing items array
  4. Calls `virtual-tryon` edge function
  5. Saves result to database
  6. Displays result
- **Multi-item Support**: Can try on multiple items at once

**`deleteSavedResult(resultId)`**
- Deletes from database
- Removes from storage bucket

**`viewSavedResult(result)`**
- Displays historical try-on result

**`toggleItemSelection(item)`**
- Adds/removes item from selection
- Limits to reasonable number for API

**`handleCategoryChange(category)`**
- Updates category filter
- Resets subcategory

**Filtering Logic**:
- Category-based filtering
- Subcategory-based filtering
- Search by item name
- Combines all filters with AND logic

---

#### **D. History Page** (`History.tsx`)

**Component: `History()`**

**State Management**:
- `selectedDate`: Calendar selection
- `outfits`: All user outfits
- `trips`: All user trips
- `selectedItems`: Items for new outfit
- `occasion`: Occasion input
- `eventName`: Event name input
- `isAddingOutfit`: Dialog state

**Key Functions**:

**`loadOutfits()`**
- Fetches all outfits (worn and planned)
- Includes item details via join

**`loadTrips()`**
- Fetches all trips with date ranges

**`getOutfitsForDate(date)`**
- Filters outfits for specific date
- Returns both worn and planned outfits

**`getTripForDate(date)`**
- Finds trip that includes the date
- Uses `isWithinInterval` from date-fns

**`toggleItem(itemId)`**
- Adds/removes item from new outfit selection

**`saveOutfit()`**
- **Process**:
  1. Validates item selection
  2. Inserts outfit record
  3. Sets `worn_at` to selected date
  4. Reloads outfits
  5. Closes dialog

**`markAsWorn(outfitId)`**
- Updates planned outfit to worn
- Sets `worn_at` to selected date

**`deleteOutfit(outfitId)`**
- Deletes outfit from database

**`getClothingItem(itemId)`**
- Looks up item from wardrobe by ID

**Calendar Features**:
- Highlights dates with outfits
- Shows trip date ranges
- Interactive date selection
- Visual indicators for worn vs. planned

---

#### **E. Insights Page** (`Insights.tsx`)

**Component: `Insights()`**

**State Management**:
- `outfits`: All worn outfits
- `itemStats`: Calculated statistics per item
- `varietyScore`: 0-100 diversity score
- `colorPalette`: Color distribution
- `brandDistribution`: Brand breakdown
- `categoryBreakdown`: Category distribution

**Key Functions**:

**`loadOutfits()`**
- Fetches all worn outfits with item details

**Computed Metrics** (useMemo):

**Total Items**
- Count of all wardrobe items

**Total Wears**
- Count of all worn outfits

**Wardrobe Value**
- Sum of all item prices

**Never Worn Items**
- Items not in any worn outfit

**Item Statistics** (`itemStats`)
- **Per Item**:
  - Wear count
  - Cost per wear (price / wear count)
  - Last worn date
- **Sorted by**: Wear count (descending)

**Most Worn Items**
- Top 5 by wear count

**Least Worn Items**
- Bottom 5 by wear count (excluding never worn)

**Best Value Items**
- Lowest cost-per-wear
- Filters out items without price

**Average Cost Per Wear**
- Mean CPW across all items with price

**Color Palette**
- Groups items by color
- Counts items per color
- Calculates percentages

**Brand Distribution**
- Groups items by brand
- Counts items per brand
- Filters out empty brands

**Category Breakdown**
- Groups items by category
- Counts items per category
- Calculates percentages

**Variety Score** (0-100)
- **Factors**:
  - Outfit diversity (unique combinations)
  - Item rotation (even distribution of wear)
  - Color variety
  - Silhouette diversity
- **Algorithm**:
  - Detects similar outfits (overlapping items/colors)
  - Penalizes repetition
  - Rewards balanced usage

**Neglected Items**
- Items not worn in 30+ days
- Sorted by days since last wear

**Wardrobe Gaps**
- Analyzes category distribution
- Suggests missing categories
- Provides reasons (e.g., "Only 1 pair of shoes")

**`addGapToWishlist(gap)`**
- Creates wishlist item from gap suggestion
- Navigates to Wishlist page

**`getColorStyle(color)`**
- Returns CSS background color for color chips
- Handles common color names

**Visual Components**:
- Stat cards with icons
- Bar charts (Recharts)
- Pie charts
- Color palette chips
- Brand/category distributions
- Variety score gauge

---

#### **F. Stylist Page** (`Stylist.tsx`)

**Component: `Stylist()`**

**State Management**:
- `messages`: Chat history
- `input`: Current message input
- `isLoading`: AI response loading

**Key Functions**:

**`sendMessage()`**
- **Process**:
  1. Adds user message to chat
  2. Fetches wardrobe items
  3. Fetches recent outfits
  4. Calls `stylist-chat` edge function
  5. Adds AI reply to chat
  6. Scrolls to bottom

**Chat Features**:
- Persistent chat history (localStorage)
- Wardrobe-aware responses
- Variety-focused suggestions
- Conversational interface
- Auto-scroll to latest message

---

#### **G. Travel Page** (`Travel.tsx`)

**Component: `Travel()`**

**State Management**:
- `trips`: All user trips
- `selectedTrip`: Currently viewing trip
- `dailyOutfits`: Outfit assignments per day
- `packingList`: Auto-generated packing list

**Key Functions**:

**`createTrip(name, destination, startDate, endDate)`**
- Inserts trip record
- Reloads trips

**`assignOutfit(tripId, date, outfitId)`**
- Links outfit to specific trip day

**`generatePackingList(tripId)`**
- **Process**:
  1. Fetches all outfits for trip
  2. Extracts unique items
  3. Groups by category
  4. Counts quantities
  5. Displays organized list

**`deleteTrip(tripId)`**
- Deletes trip and outfit assignments

**Calendar Integration**:
- Shows trip date ranges on History calendar

---

#### **H. Wishlist Page** (`Wishlist.tsx`)

**Component: `Wishlist()`**

**State Management**:
- `wishlistItems`: All wishlist items
- `priority`: Filter by priority
- `category`: Filter by category

**Key Functions**:

**`addItem(name, category, targetPrice, priority)`**
- Inserts wishlist item

**`markAsPurchased(itemId)`**
- Updates item as purchased
- Optionally adds to wardrobe

**`deleteItem(itemId)`**
- Removes from wishlist

**`findSimilar(item)`**
- Calls `find-shopping` edge function
- Shows shopping recommendations

**Priority Levels**:
- High (red badge)
- Medium (yellow badge)
- Low (gray badge)

---

#### **I. Profile Page** (`Profile.tsx`)

**Component: `Profile()`**

**State Management**:
- `profile`: User profile data
- `avatarUrl`: Profile photo URL

**Key Functions**:

**`updateProfile(displayName, avatarFile)`**
- Updates user metadata
- Uploads new avatar if provided

**`signOut()`**
- Calls Supabase auth signOut
- Redirects to login

**Data Export**:
- Export wardrobe as JSON
- Export outfits as JSON
- Export insights as CSV

---

### 5. **Wardrobe Components** (`/src/components/wardrobe`)

#### **AddItemDialog.tsx**

**Component: `AddItemDialog({ open, onOpenChange, onAdd })`**

**State Management**:
- `name`, `category`, `subcategory`, `color`, `brand`, `price`
- `imageFile`: Selected file
- `imagePreview`: Base64 preview
- `processedImageUrl`: After background removal
- `isProcessing`: Background removal loading
- `isAnalyzing`: AI analysis loading

**Key Functions**:

**`removeBackground(file)`**
- **Process**:
  1. Calls `removeBackground` from ai-service
  2. Converts base64 to Blob
  3. Creates new File object
  4. Returns processed URL and file
- **Error Handling**: Toast notifications

**`analyzeClothing(base64Image)`**
- **Process**:
  1. Calls `analyze-clothing` edge function
  2. Extracts name, category, color, brand
  3. Auto-fills form fields
- **Error Handling**: Logs errors, continues

**`normalizeImageOrientation(file)`**
- **Purpose**: Fix EXIF orientation issues
- **Process**:
  1. Reads image with FileReader
  2. Loads into Image element
  3. Draws to canvas (normalized)
  4. Returns base64 data URL

**`handleFileChange(e)`**
- **Process**:
  1. Validates file type (image only)
  2. Normalizes orientation
  3. Sets preview
  4. Auto-triggers background removal
  5. Auto-triggers AI analysis (if successful)
- **Chaining**: Background removal → AI analysis

**`handleSubmit(e)`**
- **Process**:
  1. Validates required fields
  2. Uploads image to Supabase storage
  3. Gets public URL
  4. Calls `onAdd` callback with item data
  5. Resets form
- **Validation**: Name, category, image required

**`clearImage()`**
- Resets image-related state

**UI Features**:
- Drag-and-drop upload
- Image preview
- Background removal toggle
- AI analysis with sparkle icon
- Category/subcategory selects
- Optional fields (color, brand, price)

---

#### **CategoryTabs.tsx**

**Component: `CategoryTabs({ value, onValueChange })`**

**Purpose**: Horizontal scrollable category filter
**Categories**: All, Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories

---

#### **SubcategoryTabs.tsx**

**Component: `SubcategoryTabs({ category, value, onValueChange })`**

**Purpose**: Dynamic subcategory filter based on selected category
**Examples**:
- Tops: T-shirts, Shirts, Blouses, Sweaters, Hoodies
- Bottoms: Jeans, Pants, Skirts, Shorts, Leggings

---

#### **ClothingCard.tsx**

**Component: `ClothingCard({ item, onDelete })`**

**Features**:
- Item image
- Item name
- Category badge
- Color indicator
- Delete button
- Hover effects

---

#### **ClothingGrid.tsx**

**Component: `ClothingGrid({ items, onDelete })`**

**Features**:
- Responsive grid layout
- Empty state message
- Maps items to ClothingCard components

---

### 6. **Hooks** (`/src/hooks`)

#### **useAuth.ts**

**Hook: `useAuth()`**

**Returns**:
- `user`: Current user object
- `session`: Current session
- `loading`: Auth loading state
- `signOut`: Sign out function

**Features**:
- Listens to auth state changes
- Auto-redirects on sign out

---

#### **useOutfitFeedback.ts**

**Hook: `useOutfitFeedback()`**

**Purpose**: Manage user feedback on outfit suggestions

**Functions**:

**`submitFeedback(outfitId, feedback)`**
- **Feedback Types**:
  - Rating: love | meh | hate
  - Temperature: too-warm | just-right | too-cold
  - Formality: too-formal | just-right | too-casual
  - More like this: boolean
- **Process**:
  1. Inserts feedback record
  2. Updates item-level feedback (loved/hated items)
  3. Aggregates preferences

**`getUserFeedbackSummary()`**
- **Returns**:
  ```typescript
  {
    lovedItemIds: string[],
    hatedItemIds: string[],
    prefersWarmer: boolean,
    prefersCooler: boolean,
    prefersMoreFormal: boolean,
    prefersMoreCasual: boolean,
    totalFeedbackCount: number
  }
  ```
- **Logic**:
  - Loved items: 2+ love ratings
  - Hated items: 2+ hate ratings
  - Temperature preference: Majority vote
  - Formality preference: Majority vote

---

### 7. **Database Schema** (Supabase)

#### **Tables**:

**`clothing_items`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `name` (text)
- `category` (text)
- `subcategory` (text, nullable)
- `color` (text, nullable)
- `brand` (text, nullable)
- `price` (numeric, nullable)
- `image_url` (text)
- `tags` (text[], nullable)
- `created_at` (timestamp)

**`outfits`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `name` (text)
- `item_ids` (uuid[])
- `occasion` (text, nullable)
- `event_name` (text, nullable)
- `is_planned` (boolean, default false)
- `worn_at` (timestamp, nullable)
- `created_at` (timestamp)

**`tryon_results`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `result_image_url` (text)
- `clothing_item_id` (uuid, nullable, foreign key)
- `created_at` (timestamp)

**`avatars`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key, unique)
- `image_url` (text)
- `created_at` (timestamp)

**`outfit_feedback`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `outfit_id` (uuid, foreign key)
- `rating` (text: love | meh | hate)
- `temperature_feedback` (text, nullable)
- `formality_feedback` (text, nullable)
- `more_like_this` (boolean)
- `created_at` (timestamp)

**`trips`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `name` (text)
- `destination` (text, nullable)
- `start_date` (date)
- `end_date` (date)
- `created_at` (timestamp)

**`wishlist_items`**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `name` (text)
- `category` (text)
- `target_price` (numeric, nullable)
- `priority` (text: high | medium | low)
- `is_purchased` (boolean, default false)
- `created_at` (timestamp)

#### **Storage Buckets**:

**`clothing-images`**
- Public bucket
- Stores clothing item photos
- Path: `{userId}/{itemId}.{ext}`

**`avatars`**
- Public bucket
- Stores user body photos
- Path: `{userId}/avatar.{ext}`

**`tryon-results`**
- Public bucket
- Stores virtual try-on results
- Path: `{userId}/{resultId}.png`

#### **Row-Level Security (RLS)**:

All tables have RLS policies:
- Users can only read/write their own data
- Enforced via `user_id = auth.uid()`

---

## 🔄 Key User Flows

### **Flow 1: Add Clothing Item**

1. User clicks "Add Item" button
2. `AddItemDialog` opens
3. User uploads image
4. `normalizeImageOrientation()` fixes rotation
5. `removeBackground()` calls local server
6. Python `process_image.py` removes background
7. `analyzeClothing()` calls Gemini API
8. AI extracts name, category, color, brand
9. Form auto-fills
10. User reviews/edits
11. User submits
12. Image uploads to Supabase storage
13. Record inserts to `clothing_items` table
14. Item appears in wardrobe

### **Flow 2: Generate Outfit Suggestions**

1. User enters occasion (e.g., "Business Meeting")
2. Clicks "Generate Outfits"
3. `handleGenerateOutfits()` executes
4. Fetches all wardrobe items
5. Loads recent outfits (last 30 days)
6. Loads user feedback summary
7. Calls `generate-outfits` edge function
8. Gemini AI analyzes wardrobe
9. Checks dress code compliance
10. Generates 3 outfit combinations
11. Returns outfit data with item IDs
12. Frontend enriches with item details
13. If avatar exists, auto-generates try-on images
14. Displays outfits with try-on previews
15. User can rate, save, or wear today

### **Flow 3: Virtual Try-On**

1. User uploads body photo (or uses saved avatar)
2. Selects clothing items from wardrobe
3. Clicks "Try On"
4. `handleTryOn()` executes
5. Uploads person image to storage
6. Calls `virtual-tryon` edge function
7. Edge function fetches images as base64
8. Calls FAL.ai VTON API
9. API generates try-on image
10. Result uploads to storage
11. Record inserts to `tryon_results` table
12. Displays result to user
13. User can save as avatar or delete

### **Flow 4: Outfit History Tracking**

1. User generates outfit suggestions
2. Clicks "Wear Today" on preferred outfit
3. `handleWearToday()` executes
4. Inserts outfit record with `worn_at = today`
5. Navigates to History page
6. Calendar highlights today's date
7. User can view outfit details
8. Outfit counts toward wear statistics
9. Item wear counts increment
10. Cost-per-wear updates
11. Variety score recalculates

### **Flow 5: AI Stylist Chat**

1. User navigates to Stylist page
2. Types message (e.g., "What should I wear to a wedding?")
3. Clicks send
4. `sendMessage()` executes
5. Fetches wardrobe items
6. Fetches recent outfits
7. Calls `stylist-chat` edge function
8. Gemini AI generates response
9. Response considers user's wardrobe
10. Avoids recently worn combinations
11. AI reply appears in chat
12. User can continue conversation

---

## 🎨 AI Prompt Engineering

### **Outfit Generation Prompt Structure**:

```
System Prompt:
- Role: Professional fashion stylist AI
- Task: Generate outfit options for occasion
- Dress code rules (strict enforcement)
- Important rules (wardrobe-only, dress code, variety)
- Recent outfits context (avoid repetition)
- User feedback context (preferences)
- Wardrobe items list (with exact IDs)

Output Format:
- JSON schema with exact structure
- insufficient flag for wardrobe gaps
- missingItems array for recommendations
- outfits array with name, description, itemIds

User Prompt:
- "Create 3 outfit options for: {occasion}"
```

### **Stylist Chat Prompt Structure**:

```
System Prompt:
- Personality: Aura - sophisticated, warm, encouraging
- Role: Personal style advisor
- Capabilities: outfit combinations, shopping suggestions, styling tips
- Context: User's wardrobe items
- Context: Recent outfits (for variety)
- Important: Suggest DIFFERENT combinations

User Prompt:
- User's natural language message
```

### **Weather Outfit Prompt Structure**:

```
System Prompt:
- Role: Personal fashion stylist AI
- Task: Weather-appropriate outfit suggestions
- Weather data: temp, feels like, condition, humidity, wind, precipitation
- Cold tolerance adjustment
- Wardrobe items list
- Guidelines: layering, rain protection, formality, temperature preference

User Prompt:
- "Based on today's weather and my wardrobe, what should I wear?"
- "Give me 2-3 outfit options with brief explanations"
```

---

## 🔧 Configuration & Environment

### **Frontend Environment Variables** (`.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **Supabase Edge Functions Environment**:
```
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
FAL_KEY=your-fal-ai-key
```

### **Local Server**:
- No environment variables required
- Python dependencies: `rembg`, `Pillow`
- Virtual environment: `.venv` in project root or `server/python/.venv`

---

## 📊 Performance Optimizations

### **Frontend**:
- **React Query**: Caching for Supabase queries
- **useMemo**: Expensive calculations (insights, variety score)
- **localStorage**: Persist outfit suggestions, chat history
- **Lazy Loading**: Code splitting for routes
- **Image Optimization**: Base64 for small images, storage URLs for large

### **Backend**:
- **Edge Functions**: Serverless, auto-scaling
- **Gemini 2.0 Flash**: Fast, cost-effective model
- **Parallel Processing**: Try-on generation for multiple outfits
- **Caching**: Recent outfits, user feedback summaries

### **Database**:
- **Indexes**: On `user_id`, `worn_at`, `created_at`
- **RLS**: Efficient row-level security
- **Joins**: Optimized outfit-item queries

---

## 🐛 Error Handling

### **Frontend**:
- **Toast Notifications**: User-friendly error messages
- **Try-Catch Blocks**: All async operations
- **Fallbacks**: Default values, empty states
- **Retry Logic**: Try-on generation retry button

### **Backend**:
- **CORS Headers**: All edge functions
- **Detailed Logging**: `console.log` for debugging
- **Error Responses**: Structured JSON with error messages
- **Status Codes**: 400 (bad request), 500 (server error)

### **Local Server**:
- **Python Error Capture**: stderr logging
- **File Cleanup**: Removes temp files on error
- **Process Monitoring**: Checks Python exit codes

---

## 🚀 Deployment

### **Frontend**:
- **Platform**: Lovable.dev (auto-deploy on git push)
- **Build**: `npm run build`
- **Preview**: `npm run preview`

### **Backend**:
- **Supabase**: Auto-deploy edge functions
- **Database**: Managed PostgreSQL
- **Storage**: CDN-backed object storage

### **Local Server**:
- **Development**: `npm run dev` (tsx watch)
- **Production**: `npm start` (tsx)
- **Port**: 3011 (hardcoded)

---

## 📚 Key Dependencies

### **Frontend**:
- `react` 18.3.1
- `react-router-dom` 6.30.1
- `@supabase/supabase-js` 2.90.1
- `@tanstack/react-query` 5.83.0
- `@radix-ui/*` (UI primitives)
- `lucide-react` (icons)
- `date-fns` (date utilities)
- `recharts` (charts)
- `framer-motion` (animations)
- `zod` (validation)

### **Backend (Local Server)**:
- `express` 4.18.2
- `cors` 2.8.5
- `multer` 1.4.5 (file uploads)
- `tsx` 4.7.1 (TypeScript execution)

### **Python**:
- `rembg` (background removal)
- `Pillow` (image processing)

---

## 🎯 Future Enhancements

Based on the codebase structure, potential features:

1. **Social Features**: Share outfits, follow friends
2. **Outfit Challenges**: Daily/weekly styling challenges
3. **Sustainability Tracking**: CO2 footprint, ethical brands
4. **Capsule Wardrobe Builder**: Minimalist wardrobe planning
5. **Style Quiz**: Personalized style profile
6. **AR Try-On**: Real-time camera try-on
7. **Shopping Integration**: Direct purchase links
8. **Outfit Reminders**: "You haven't worn this in 60 days"
9. **Color Analysis**: Seasonal color palettes
10. **Trend Alerts**: Fashion trend notifications

---

## 📖 Documentation Links

- **Supabase Docs**: https://supabase.com/docs
- **Gemini API**: https://ai.google.dev/docs
- **FAL.ai**: https://fal.ai/models/fal-ai/idm-vton
- **shadcn/ui**: https://ui.shadcn.com
- **Radix UI**: https://www.radix-ui.com

---

## 🤝 Contributing

This is a personal project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make changes with clear commit messages
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

Private project - All rights reserved

---

**Last Updated**: January 29, 2026
**Version**: 1.0.0
**Maintainer**: StyleSync Development Team
