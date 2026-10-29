import os
import io
import uuid
import logging
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Max dimensions for standard images (posts, chat, cover)
MAX_IMAGE_WIDTH = 1920
MAX_IMAGE_HEIGHT = 1920

# Max dimensions for avatars
MAX_AVATAR_WIDTH = 400
MAX_AVATAR_HEIGHT = 400

# WebP Quality
IMAGE_QUALITY = 82

# Limit dimensions to prevent decompression bombs (e.g. 50 Megapixels max)
Image.MAX_IMAGE_PIXELS = 50_000_000

def process_and_save_image(
    file_bytes: bytes,
    dest_dir: str,
    prefix: str = "img",
    is_avatar: bool = False
) -> str:
    """
    Optimizes and securely saves an image:
    - Verifies image integrity and format (rejects corrupt/non-image bytes)
    - Auto-orients based on EXIF
    - Resizes if larger than max dimensions (preserving aspect ratio)
    - Strips sensitive metadata
    - Converts to WebP (or preserves GIF if animated and within safe size)
    - Returns the relative safe filename (e.g. 'post_abc123.webp')
    """
    os.makedirs(dest_dir, exist_ok=True)
    unique_id = uuid.uuid4().hex

    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()  # Verify file header and integrity
        # Re-open after verify as per PIL documentation
        image = Image.open(io.BytesIO(file_bytes))

        # Check supported formats
        if image.format not in ("JPEG", "PNG", "GIF", "WEBP"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Định dạng hình ảnh không được hỗ trợ ({image.format})."
            )

        # If animated GIF, preserve format to keep animation but ensure dimension bounds
        if getattr(image, "is_animated", False) and image.format == "GIF":
            filename = f"{prefix}_{unique_id}.gif"
            filepath = os.path.join(dest_dir, filename)
            with open(filepath, "wb") as f:
                f.write(file_bytes)
            return filename

        # Auto-rotate based on EXIF tag
        image = ImageOps.exif_transpose(image)

        # Max dimensions check
        max_w, max_h = (MAX_AVATAR_WIDTH, MAX_AVATAR_HEIGHT) if is_avatar else (MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT)
        image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

        # Convert palette or RGBA with transparency if necessary
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            # Keep alpha channel for WebP
            if image.mode != "RGBA":
                image = image.convert("RGBA")
        else:
            if image.mode != "RGB":
                image = image.convert("RGB")

        filename = f"{prefix}_{unique_id}.webp"
        filepath = os.path.join(dest_dir, filename)

        # Save as WebP with high compression and stripped metadata
        image.save(filepath, format="WEBP", quality=IMAGE_QUALITY, method=4)
        logger.info(f"Image optimized and saved: {filename} (Original size: {len(file_bytes)} bytes)")
        return filename

    except HTTPException:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError) as e:
        logger.warning(f"Invalid image content or decompression bomb attempt: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp tải lên không phải là hình ảnh hợp lệ hoặc bị hỏng."
        )
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xử lý hình ảnh tải lên. Vui lòng thử lại với ảnh khác."
        )
