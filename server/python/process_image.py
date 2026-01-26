
import sys
import os
from rembg import remove
from PIL import Image, ImageOps

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

def process_image(input_path, output_path):
    try:
        # Check if input exists
        if not os.path.exists(input_path):
            print(f"Error: Input file not found {input_path}")
            sys.exit(1)

        # Open image
        input_image = Image.open(input_path)
        
        # Fix orientation from EXIF
        input_image = ImageOps.exif_transpose(input_image)

        # Remove background
        output_image = remove(input_image)

        # Save result
        output_image.save(output_path)
        print("Success")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_image.py <input_path> <output_path>")
        sys.exit(1)
    
    input_p = sys.argv[1]
    output_p = sys.argv[2]
    
    process_image(input_p, output_p)
