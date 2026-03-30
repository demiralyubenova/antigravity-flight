import io
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
from rembg import remove, new_session

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Falcon Vision Service")

# Load lightweight u2netp session once at startup
rembg_session = new_session("u2netp")
logger.info("Loaded rembg u2netp session")

# Add CORS support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """Remove the background from an uploaded image and return the result as PNG bytes."""
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGBA")
        image = ImageOps.exif_transpose(image)

        logger.info(f"Removing background for: {file.filename}, size: {image.size}")
        result = remove(image, session=rembg_session)

        output = io.BytesIO()
        result.save(output, format="PNG")
        output.seek(0)

        from fastapi.responses import Response
        return Response(content=output.read(), media_type="image/png")

    except Exception as e:
        logger.error(f"Error removing background: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
