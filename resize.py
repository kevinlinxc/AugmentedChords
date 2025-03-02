from PIL import Image

# Open the image file
with Image.open('0.bmp') as img:
    # Define the crop box (left, upper, right, lower)
    crop_box = (0, 0, 576, 136)
    # Crop the image
    cropped_img = img.crop(crop_box)
    # Save the cropped image
    cropped_img.save('0-crop.bmp')