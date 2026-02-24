import io
import os
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image, ImageOps
from rembg import remove
from transformers import CLIPProcessor, CLIPModel
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Falcon Vision Service")

# Add CORS support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load FashionCLIP Model
logger.info("Loading FashionCLIP model...")
MODEL_ID = "patrickjohncyh/fashion-clip"
device = "cuda" if torch.cuda.is_available() else "cpu"
model = CLIPModel.from_pretrained(MODEL_ID).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_ID)
logger.info(f"Model loaded on {device}")

CATEGORIES = ["shoes", "tops", "bottoms", "outerwear", "accessories", "dresses"]
TYPES = [
    # Tops
    "t-shirt", "oversized t-shirt", "graphic t-shirt", "plain t-shirt",
    "long sleeve t-shirt", "crop top", "tank top",
    "shirt", "button-up shirt", "flannel shirt",
    "blouse", "satin blouse",
    "hoodie", "zip hoodie", "oversized hoodie",
    "sweater", "knit sweater", "cardigan", "turtleneck",
    "polo shirt", "vest", "waistcoat",

    # Bottoms
    "jeans", "skinny jeans", "wide-leg jeans", "straight jeans",
    "baggy jeans", "cargo pants", "trousers", "chinos",
    "linen trousers", "shorts", "denim shorts",
    "skirt", "mini skirt", "midi skirt", "maxi skirt",
    "leggings", "joggers", "sweatpants",

    # Outerwear
    "blazer", "oversized blazer",
    "jacket", "leather jacket", "denim jacket",
    "bomber jacket", "puffer jacket",
    "coat", "trench coat", "wool coat", "parka",

    # Dresses
    "dress", "mini dress", "midi dress", "maxi dress",
    "bodycon dress", "wrap dress", "evening dress",

    # Shoes
    "sneakers", "chunky sneakers", "running shoes",
    "boots", "ankle boots", "knee-high boots",
    "combat boots", "chelsea boots",
    "sandals", "slides", "heels", "pumps",
    "loafers", "ballet flats",

    # Accessories
    "bag", "handbag", "crossbody bag", "backpack",
    "belt", "hat", "cap", "beanie",
    "scarf", "sunglasses", "watch"
]

COLORS = [
    # Neutrals
    "black", "white", "off-white", "cream",
    "gray", "light gray", "dark gray", "charcoal",
    "beige", "tan", "camel", "khaki",
    "brown", "dark brown", "chocolate",
    "navy", "midnight blue",

    # Blues
    "blue", "sky blue", "baby blue",
    "royal blue", "denim blue",

    # Reds
    "red", "burgundy", "wine",

    # Greens
    "green", "olive", "mint", "forest green",

    # Yellows / Oranges
    "yellow", "mustard",
    "orange", "burnt orange",

    # Pink / Purple
    "pink", "hot pink", "dusty pink",
    "purple", "lavender",

    # Special
    "multicolor"
]

def classify_multi_groups(image: Image.Image, groups: dict):
    # Flatten all labels for a single model pass
    all_labels = []
    group_indices = {}
    current_idx = 0
    
    for group_name, labels in groups.items():
        all_labels.extend([f"a photo of {label} clothing" for label in labels])
        group_indices[group_name] = (current_idx, current_idx + len(labels))
        current_idx += len(labels)

    inputs = processor(
        text=all_labels,
        images=image,
        return_tensors="pt",
        padding=True
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)[0]
        
        results = {}
        for group_name, (start, end) in group_indices.items():
            group_probs = probs[start:end]
            # Re-normalize group probs
            group_probs = group_probs / group_probs.sum()
            conf, index = torch.max(group_probs, dim=0)
            results[group_name] = (groups[group_name][index.item()], conf.item())
        
        return results

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # 1. Read Image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        logger.info(f"Received image: {file.filename}")
        
        # 2. Fix Orientation
        image = ImageOps.exif_transpose(image)
        
        # 3. Remove Background
        logger.info("Removing background...")
        image_no_bg = remove(image)
        if image_no_bg.mode == 'RGBA':
            white_bg = Image.new("RGB", image_no_bg.size, (255, 255, 255))
            white_bg.paste(image_no_bg, mask=image_no_bg.split()[3])
            image_for_clip = white_bg
        else:
            image_for_clip = image_no_bg.convert("RGB")

        # 4. Classify in a single pass
        logger.info("Classifying in single pass...")
        groups = {
            "category": CATEGORIES,
            "type": TYPES,
            "color": COLORS
        }
        predictions = classify_multi_groups(image_for_clip, groups)
        
        category, cat_conf = predictions["category"]
        item_type, type_conf = predictions["type"]
        color, color_conf = predictions["color"]

        # Color confidence check
        if color_conf < 0.6:
            color = "unknown"

        # 5. Construct Name
        name = f"{color.title()} {item_type.title()}"
        
        confidence = (cat_conf + type_conf + color_conf) / 3
        logger.info(f"Analysis complete: {name} ({confidence:.2f})")

        return {
            "name": name,
            "category": category,
            "type": item_type,
            "color": color,
            "confidence": round(confidence, 2)
        }

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
