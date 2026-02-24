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

app = FastAPI(title="Falcon Vision Service")

# Load FashionCLIP Model
logger.info("Loading FashionCLIP model...")
MODEL_ID = "patrickjohncyh/fashion-clip"
device = "cuda" if torch.cuda.is_available() else "cpu"
model = CLIPModel.from_pretrained(MODEL_ID).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_ID)
logger.info(f"Model loaded on {device}")

CATEGORIES = ["Shoes", "Tops", "Bottoms", "Outerwear", "Accessories", "Dresses"]
TYPES = [
    "sneakers", "boots", "sandals", "heels", "loafers", 
    "hoodie", "t-shirt", "shirt", "blouse", "sweater", 
    "jeans", "trousers", "shorts", "skirt", 
    "blazer", "jacket", "coat", 
    "hat", "bag", "belt", "dress"
]
COLORS = [
    "white", "black", "blue", "red", "green", "yellow", 
    "orange", "purple", "pink", "brown", "gray", "beige", "navy", "khaki"
]

def classify_zero_shot(image: Image.Image, labels: list):
    inputs = processor(
        text=[f"a photo of {label} clothing" for label in labels],
        images=image,
        return_tensors="pt",
        padding=True
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)
        
        conf, index = torch.max(probs, dim=1)
        return labels[index.item()], conf.item()

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # 1. Read Image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Preserve original for classification (rembg might help but raw is good for CLIP too)
        # However, user requested rembg first
        
        # 2. Fix Orientation
        image = ImageOps.exif_transpose(image)
        
        # 3. Remove Background
        logger.info("Removing background...")
        image_no_bg = remove(image)
        # Convert back to RGB for CLIP (remove alpha)
        if image_no_bg.mode == 'RGBA':
            # Create white background
            white_bg = Image.new("RGB", image_no_bg.size, (255, 255, 255))
            white_bg.paste(image_no_bg, mask=image_no_bg.split()[3])
            image_for_clip = white_bg
        else:
            image_for_clip = image_no_bg.convert("RGB")

        # 4. Classify
        logger.info("Classifying...")
        category, cat_conf = classify_zero_shot(image_for_clip, CATEGORIES)
        item_type, type_conf = classify_zero_shot(image_for_clip, TYPES)
        color, color_conf = classify_zero_shot(image_for_clip, COLORS)

        # 5. Construct Name
        name = f"{color.capitalize()} {item_type.replace('_', ' ').capitalize()}"
        
        confidence = (cat_conf + type_conf + color_conf) / 3

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
