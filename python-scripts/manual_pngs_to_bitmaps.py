import cv2
import os
import shutil
import glob
from pathlib import Path
from tqdm import tqdm
import argparse
import numpy as np

def convert_pngs_to_bitmaps(input_folder, output_folder, kernel_dims=(3, 5), threshold_value=127, save_intermediate=True):
    """
    Convert PNG images to bitmap format, optimized for display on AugmentOS devices.
    
    Args:
        input_folder (str): Path to folder containing PNG images
        output_folder (str): Path to save the resulting bitmap images
        kernel_dims (tuple): Kernel dimensions for dilation (default: (1, 1))
        threshold_value (int): Threshold value for binary conversion (0-255)
        save_intermediate (bool): Whether to save intermediate files for debugging
    """
    # Create output folder if it doesn't exist
    final_folder = Path(output_folder)
    if not final_folder.exists():
        final_folder.mkdir(parents=True, exist_ok=True)
    
    # Create temp bitmap folder
    bitmap_folder = Path(output_folder) / "temp" / "bitmap"
    if bitmap_folder.exists():
        shutil.rmtree(bitmap_folder)
    bitmap_folder.mkdir(parents=True, exist_ok=True)
    
    # Create debug folder if save_intermediate is True
    debug_folder = None
    if save_intermediate:
        debug_folder = Path(output_folder) / "debug"
        if debug_folder.exists():
            shutil.rmtree(debug_folder)
        debug_folder.mkdir(parents=True, exist_ok=True)
    
    # Get list of PNG files in input folder and sort them alphanumerically
    png_files = glob.glob(os.path.join(input_folder, "*.png"))
    png_files.sort(key=lambda x: int(Path(x).stem) if Path(x).stem.isdigit() else Path(x).stem)
    
    print(f"Found {len(png_files)} PNG files in {input_folder}")
    
    # Process each PNG file
    for i, png_path in enumerate(tqdm(png_files)):
        # Read the image
        img = cv2.imread(png_path, cv2.IMREAD_UNCHANGED)
        
        # Save original image for debugging
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_1_original.png"), img)
        
            
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_2_grayscale.png"), gray)
        
        # Threshold to create a binary image
        _, binary = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_3_binary.png"), binary)
        
        
        # Dilate with a horizontal kernel so that note stems are more visible
        invert = cv2.bitwise_not(binary)  # Invert grayscale for dilation
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_4_inverted.png"), invert)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1)) # horizontal kernel for note stems
        dilated = cv2.dilate(invert, kernel, iterations=1)
        kernel2 = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 4)) # vertical kernel for staff lines
        dilated = cv2.dilate(dilated, kernel2, iterations=1)
        
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_5_dilated.png"), dilated)
        
        # Add measure number text
        text = f"Page {i}"
        dilated_with_text = cv2.putText(dilated.copy(), text, (0, 0), 
                                          cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255) , 2, cv2.LINE_AA)
        
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_6_with_text.png"), dilated_with_text)
        
        # Apply binary threshold to make pure black and white
        # This converts all pixels < threshold_value to 0 (black) and >= threshold_value to 255 (white)
        ret, binary_img = cv2.threshold(dilated_with_text, threshold_value, 255, cv2.THRESH_BINARY)
        
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_7_binary.png"), binary_img)

        
        # Downscale to max size
        resized_img = cv2.resize(binary_img, (576, 116))  # 576, 136 is max but sometimes it's cut off, also faster if smaller
        
        if save_intermediate:
            cv2.imwrite(str(debug_folder / f"{i}_8_resized.png"), resized_img)
        # threshold again to ensure no gray pixels
        ret, resized_img = cv2.threshold(resized_img, 5, 255, cv2.THRESH_BINARY)
        # Save as bitmap to temp folder
        temp_bitmap_path = str(bitmap_folder / f"{i}.bmp")
        cv2.imwrite(temp_bitmap_path, resized_img)
        
        # imagemagick's -monochrome does another thresholding using Floyd-Steinberg dithering
        # -type bilevel ensures that the output bitmap is truly 1-bit (not grayscale)
        # This convert command ensures the final bitmap is truly black and white with no gray
        final_bitmap_path = str(final_folder / f"{i}.bmp")
        convert_str = f"magick {temp_bitmap_path} -monochrome -type bilevel {final_bitmap_path}"
        print(f"Running command: {convert_str}")
        os.system(convert_str)
        
        if save_intermediate:
            # Copy final bitmap back to debug folder to see what ImageMagick produced
            os.system(f"cp {final_bitmap_path} {str(debug_folder / f'{i}_9_final.bmp')}")
    
    print(f"Converted {len(png_files)} PNG files to bitmaps in {output_folder}")

if __name__ == "__main__":

    convert_pngs_to_bitmaps(
        Path(__file__).parent / "fullsong" / "pngs", 
        Path(__file__).parent / "fullsong" / "bitmaps", 
        kernel_dims=(3, 1))
    
    print("Conversion complete!")
