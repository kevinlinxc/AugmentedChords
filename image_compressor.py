import cv2
import numpy as np
from pathlib import Path
import os
from typing import Optional, Union, Tuple

def compress_image_vertically(
    image_path: Union[str, Path], 
    output_path: Optional[Union[str, Path]] = None, 
    vertical_scale: float = 0.5
) -> str:
    """
    Compresses an image vertically while maintaining horizontal dimensions.
    
    Parameters:
    - image_path: Path to the input image
    - output_path: Path to save the compressed image (if None, will modify original filename)
    - vertical_scale: Scale factor for vertical compression (0.5 = half height)
    
    Returns:
    - Path to the saved compressed image
    """
    image_path = Path(image_path)
    
    # Set default output path if not provided
    if output_path is None:
        filename = image_path.stem
        output_path = image_path.parent / f"{filename}_compressed{image_path.suffix}"
    
    # Read the image
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
    
    # Get original dimensions
    height, width = img.shape[:2]
    
    # Calculate new dimensions
    new_height = int(height * vertical_scale)
    
    # Resize the image
    resized_img = cv2.resize(img, (width, new_height), interpolation=cv2.INTER_AREA)
    
    # Save the resized image
    cv2.imwrite(str(output_path), resized_img)
    
    return str(output_path)

def batch_compress_images(
    input_directory: Union[str, Path],
    output_directory: Optional[Union[str, Path]] = None,
    vertical_scale: float = 0.5,
    file_pattern: str = "*.png"
) -> list[str]:
    """
    Compresses all images in a directory vertically.
    
    Parameters:
    - input_directory: Directory containing images to compress
    - output_directory: Directory to save compressed images (if None, uses input_directory)
    - vertical_scale: Scale factor for vertical compression
    - file_pattern: Glob pattern to match files
    
    Returns:
    - List of paths to the saved compressed images
    """
    import glob
    
    input_directory = Path(input_directory)
    
    # Create output directory if it doesn't exist
    if output_directory is None:
        output_directory = input_directory
    else:
        output_directory = Path(output_directory)
        output_directory.mkdir(parents=True, exist_ok=True)
    
    # Find all matching files
    file_paths = glob.glob(str(input_directory / file_pattern))
    output_paths = []
    
    for file_path in file_paths:
        file_path = Path(file_path)
        output_path = output_directory / file_path.name
        
        try:
            compressed_path = compress_image_vertically(
                file_path, 
                output_path, 
                vertical_scale
            )
            output_paths.append(compressed_path)
            print(f"Compressed {file_path.name} -> {output_path}")
        except Exception as e:
            print(f"Error processing {file_path.name}: {e}")
    
    return output_paths

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python image_compressor.py <image_path> [vertical_scale] [output_path]")
        print("   or: python image_compressor.py --batch <directory> [vertical_scale] [output_directory]")
        sys.exit(1)
    
    batch_mode = sys.argv[1] == "--batch"
    
    if batch_mode:
        if len(sys.argv) < 3:
            print("Error: Directory path required for batch mode")
            sys.exit(1)
        
        directory = sys.argv[2]
        vertical_scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
        output_directory = sys.argv[4] if len(sys.argv) > 4 else None
        
        batch_compress_images(directory, output_directory, vertical_scale)
    else:
        image_path = sys.argv[1]
        vertical_scale = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
        output_path = sys.argv[3] if len(sys.argv) > 3 else None
        
        result_path = compress_image_vertically(image_path, output_path, vertical_scale)
        print(f"Saved compressed image to: {result_path}")
