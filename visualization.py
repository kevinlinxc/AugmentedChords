import os
import music21
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

def render_high_resolution_png(xml_file, output_path=None, dpi=300, figsize=(14, 10)):
    """
    Renders a MusicXML file to a high-resolution PNG
    """
    from musicxml_to_png import render_musicxml_to_png
    return render_musicxml_to_png(xml_file, output_path, dpi, figsize)

def render_piano_roll(xml_file, output_path=None, time_step=0.25):
    """
    Renders a MusicXML file as a piano roll visualization
    """
    from mxl_to_bitmap import mxl_to_bitmap
    return mxl_to_bitmap(xml_file, output_path, time_step=time_step)

def compare_visualizations(xml_file):
    """
    Shows both standard notation and piano roll visualization side by side
    """
    base_name = os.path.splitext(xml_file)[0]
    
    # Generate both visualizations
    png_path = render_high_resolution_png(xml_file, f"{base_name}_sheet.png")
    bitmap_img = render_piano_roll(xml_file, f"{base_name}_piano_roll.png")
    
    # Load and display both
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 14))
    
    # Display sheet music
    sheet_img = Image.open(png_path)
    ax1.imshow(np.array(sheet_img))
    ax1.set_title("Standard Notation")
    ax1.axis('off')
    
    # Display piano roll
    ax2.imshow(np.array(bitmap_img))
    ax2.set_title("Piano Roll Representation")
    ax2.axis('off')
    
    plt.tight_layout()
    plt.savefig(f"{base_name}_comparison.png", dpi=300)
    plt.show()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python visualization.py <musicxml_file_path>")
        sys.exit(1)
    
    xml_file = sys.argv[1]
    compare_visualizations(xml_file)
