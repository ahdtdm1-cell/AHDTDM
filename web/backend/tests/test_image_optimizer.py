import os
import io
import pytest
from PIL import Image
from fastapi import HTTPException
from app.services.image_optimizer import process_and_save_image, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, MAX_AVATAR_WIDTH, MAX_AVATAR_HEIGHT

def create_sample_image_bytes(format="JPEG", size=(2500, 2000), color=(255, 0, 0)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color)
    img.save(buf, format=format)
    return buf.getvalue()

def test_image_optimizer_resizes_large_image(tmp_path):
    dest_dir = str(tmp_path / "uploads")
    data = create_sample_image_bytes("JPEG", size=(3000, 2000))
    
    filename = process_and_save_image(data, dest_dir, prefix="test_post", is_avatar=False)
    filepath = os.path.join(dest_dir, filename)
    
    assert os.path.exists(filepath)
    assert filename.endswith(".webp")
    
    with Image.open(filepath) as saved_img:
        assert saved_img.width <= MAX_IMAGE_WIDTH
        assert saved_img.height <= MAX_IMAGE_HEIGHT
        assert saved_img.format == "WEBP"

def test_image_optimizer_avatar_dimensions(tmp_path):
    dest_dir = str(tmp_path / "avatars")
    data = create_sample_image_bytes("PNG", size=(1000, 1000), color=(0, 255, 0))
    
    filename = process_and_save_image(data, dest_dir, prefix="avatar", is_avatar=True)
    filepath = os.path.join(dest_dir, filename)
    
    assert os.path.exists(filepath)
    with Image.open(filepath) as saved_img:
        assert saved_img.width <= MAX_AVATAR_WIDTH
        assert saved_img.height <= MAX_AVATAR_HEIGHT

def test_image_optimizer_animated_gif_preservation(tmp_path):
    dest_dir = str(tmp_path / "gifs")
    buf = io.BytesIO()
    img1 = Image.new("RGB", (100, 100), "red")
    img2 = Image.new("RGB", (100, 100), "blue")
    img1.save(buf, format="GIF", save_all=True, append_images=[img2], duration=100, loop=0)
    data = buf.getvalue()
    
    filename = process_and_save_image(data, dest_dir, prefix="gif_test")
    assert filename.endswith(".gif")
    assert os.path.exists(os.path.join(dest_dir, filename))

def test_image_optimizer_rejects_corrupt_data(tmp_path):
    dest_dir = str(tmp_path / "corrupt")
    corrupt_data = b"<html><script>alert(1)</script></html>"
    
    with pytest.raises(HTTPException) as exc_info:
        process_and_save_image(corrupt_data, dest_dir, prefix="corrupt")
    assert exc_info.value.status_code == 400
    assert not os.path.exists(os.path.join(dest_dir, "corrupt"))
