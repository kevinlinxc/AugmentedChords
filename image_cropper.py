import cv2
import numpy as np
import os

def crop_white_margins(
    image_path, 
    output_path=None, 
    threshold=240, 
    padding=5,
    horizontal_crop=False
):
    """
    Crop white margins from PNG image, keeping only the content area.
    
    Parameters:
    - image_path: Path to the input image file
    - output_path: Path to save the cropped image (if None, will add '_cropped' to the original filename)
    - threshold: Pixel brightness threshold (0-255) to consider as non-white (default: 240)
    - padding: Number of pixels to keep as padding around the content (default: 5)
    - horizontal_crop: Whether to also crop horizontally (default: False)
    
    Returns:
    - Path to the saved cropped image
    """
    # Set default output path if not provided
    if output_path is None:
        file_name, file_ext = os.path.splitext(image_path)
        output_path = f"{file_name}_cropped{file_ext}"
    
    # Read the image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")
    
    # Convert to grayscale if it's not already
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    
    # Find rows with content (any pixel below threshold is considered content)
    non_empty_rows = np.where(np.min(gray, axis=1) < threshold)[0]
    
    if len(non_empty_rows) == 0:
        print("No content found in image!")
        return image_path
    
    # Find first and last rows with content
    first_row = max(0, non_empty_rows[0] - padding)
    last_row = min(img.shape[0], non_empty_rows[-1] + padding + 1)
    
    # Crop vertically
    cropped_img = img[first_row:last_row, :]
    
    # Optional horizontal cropping
    if horizontal_crop:
        non_empty_cols = np.where(np.min(gray, axis=0) < threshold)[0]
        if len(non_empty_cols) > 0:
            first_col = max(0, non_empty_cols[0] - padding)
            last_col = min(img.shape[1], non_empty_cols[-1] + padding + 1)
            cropped_img = cropped_img[:, first_col:last_col]
    
    # Save the cropped image
    cv2.imwrite(output_path, cropped_img)
    
    print(f"Cropped image saved to {output_path}")
    print(f"Removed {first_row} pixels from top and {img.shape[0] - last_row} pixels from bottom")
    
    if horizontal_crop:
        print(f"Removed {first_col} pixels from left and {img.shape[1] - last_col} pixels from right")
    
    return output_path


def batch_crop_images(directory_path, output_directory=None, file_pattern="*.png", **kwargs):
    """
    Process all PNG files in a directory, cropping white margins.
    
    Parameters:
    - directory_path: Path to directory containing PNG files
    - output_directory: Directory to save cropped images (if None, will save in the same directory)
    - file_pattern: Pattern for files to process (default: "*.png")
    - **kwargs: Additional arguments to pass to crop_white_margins
    
    Returns:
    - List of paths to the saved cropped images
    """
    import glob
    
    # Create output directory if it doesn't exist
    if output_directory is not None:
        os.makedirs(output_directory, exist_ok=True)
    
    # Get all PNG files in the directory
    image_files = glob.glob(os.path.join(directory_path, file_pattern))
    
    output_paths = []
    for image_path in image_files:
        file_name = os.path.basename(image_path)
        
        if output_directory is not None:
            output_path = os.path.join(output_directory, file_name)
        else:
            file_base, file_ext = os.path.splitext(image_path)
            output_path = f"{file_base}_cropped{file_ext}"
        
        try:
            cropped_path = crop_white_margins(image_path, output_path, **kwargs)
            output_paths.append(cropped_path)
        except Exception as e:
            print(f"Error processing {image_path}: {e}")
    
    return output_paths


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python image_cropper.py <image_path_or_directory> [output_path] [--batch] [--horizontal]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    batch_mode = "--batch" in sys.argv
    horizontal_crop = "--horizontal" in sys.argv
    
    if batch_mode and os.path.isdir(input_path):
        batch_crop_images(input_path, output_path, horizontal_crop=horizontal_crop)
    elif os.path.isfile(input_path):
        crop_white_margins(input_path, output_path, horizontal_crop=horizontal_crop)
    else:
        print(f"Error: {input_path} is not a valid file or directory")
