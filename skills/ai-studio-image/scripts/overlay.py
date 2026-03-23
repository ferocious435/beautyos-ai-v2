import sys
import os
import json
from PIL import Image, ImageDraw, ImageFont

def add_text_to_image(image_path, text_top, text_bottom, output_path):
    try:
        # 1. Load Image
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            draw = ImageDraw.Draw(img)
            width, height = img.size

            # 2. Setup Fonts (Windows Arial)
            # Use smaller font size relative to image height
            font_size = int(height * 0.04)
            try:
                # Arial supports Hebrew
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", font_size)
            except:
                font = ImageFont.load_default()

            # 3. Draw Top Text (Studio Name) - Hebrew is RTL
            # Note: Pillow 10+ has some support, but for simple corner text it's okay
            # We'll just put it in a corner
            margin = int(width * 0.05)
            
            # Simple rectangle background for readability
            left, top, right, bottom = draw.textbbox((margin, margin), text_top, font=font)
            draw.rectangle((left-10, top-5, right+10, bottom+5), fill=(0, 0, 0, 160))
            draw.text((margin, margin), text_top, font=font, fill=(255, 255, 255))

            # 4. Draw Bottom Text (Address/CTA)
            if text_bottom:
                l, t, r, b = draw.textbbox((0, 0), text_bottom, font=font)
                text_w = r - l
                text_h = b - t
                bottom_x = width - text_w - margin
                bottom_y = height - text_h - margin
                
                draw.rectangle((bottom_x-10, bottom_y-5, bottom_x+text_w+10, bottom_y+text_h+5), fill=(0, 0, 0, 160))
                draw.text((bottom_x, bottom_y), text_bottom, font=font, fill=(255, 255, 255))

            # 5. Save
            img.save(output_path, "JPEG", quality=95)
            return True
    except Exception as e:
        print(f"Overlay Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python overlay.py <img_path> <top_text> <bottom_text> <out_path>")
        sys.exit(1)
    
    success = add_text_to_image(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    if success:
        print("SUCCESS")
    else:
        sys.exit(1)
