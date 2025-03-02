import os
import sys
from pathlib import Path
import music21
import matplotlib.pyplot as plt
from typing import Optional, Union, Tuple, Dict, Any
from music21 import layout

def configure_score_layout(
    score: music21.stream.Score, 
    staff_size: float = 20,
    page_height: float = None,
    system_distance: float = 110,
    staff_distance: float = 65,
):
    """
    Configure the layout settings for a score to control vertical spacing.
    
    Parameters:
    - score: The music21 Score object to configure
    - staff_size: Size of staff lines (smaller = more compact vertically)
    - page_height: Height of the page
    - system_distance: Distance between systems (smaller = more compact vertically)
    - staff_distance: Distance between staves in a system (smaller = more compact vertically)
    
    Returns:
    - The modified score
    """
    # Create or modify layout settings
    layout_obj = layout.LayoutBase()
    layout_obj.staffSize = staff_size
    
    if page_height is not None:
        layout_obj.pageHeight = page_height
    
    # Set staff spacing parameters
    layout_obj.systemDistance = system_distance
    layout_obj.staffDistance = staff_distance
    
    # Insert layout at the beginning of the score
    if score.flatten().getElementsByClass(layout.LayoutBase):
        for old_layout in score.flatten().getElementsByClass(layout.LayoutBase):
            old_layout.staffSize = staff_size
            if page_height is not None:
                old_layout.pageHeight = page_height
            old_layout.systemDistance = system_distance
            old_layout.staffDistance = staff_distance
    else:
        score.insert(0, layout_obj)
    
    return score

def render_musicxml_to_png(
    xml_file: Union[str, Path], 
    output_path: Optional[Union[str, Path]] = None, 
    dpi: int = 300, 
    figsize: Tuple[int, int] = (14, 10),
    vertical_compression: float = 1.0,
    **layout_kwargs
) -> Optional[str]:
    """
    Render a MusicXML file to a high-resolution PNG image with vertical compression.
    
    Parameters:
    - xml_file: Path to the MusicXML file (.xml, .mxl)
    - output_path: Path to save the output image
    - dpi: Resolution of the image (dots per inch)
    - figsize: Size of the figure (width, height) in inches
    - vertical_compression: Factor to reduce vertical spacing (1.0 = no change, 0.5 = half height)
    - layout_kwargs: Additional layout parameters to pass to configure_score_layout
    
    Returns:
    - Path to the saved PNG file
    """
    print(f"Parsing MusicXML file: {xml_file}")
    
    # Parse the MusicXML file
    try:
        score = music21.converter.parse(xml_file)
    except Exception as e:
        print(f"Error parsing MusicXML file: {e}")
        return None
    
    # Set default output path if not provided
    if not output_path:
        output_path = os.path.splitext(xml_file)[0] + ".png"
    
    # Apply layout configurations for vertical compression
    if vertical_compression != 1.0:
        # Calculate layout values based on vertical_compression
        staff_size = max(10, 20 * vertical_compression)  # Don't go too small
        staff_distance = 65 * vertical_compression
        system_distance = 110 * vertical_compression
        
        # Apply layout configurations
        configure_score_layout(
            score,
            staff_size=staff_size,
            staff_distance=staff_distance,
            system_distance=system_distance,
            **layout_kwargs
        )
    
    # Configure figure for high resolution
    plt.rcParams['font.family'] = 'serif'
    plt.rcParams['figure.dpi'] = dpi
    plt.rcParams['savefig.dpi'] = dpi
    
    # Create figure with specified size
    fig = plt.figure(figsize=figsize, constrained_layout=True)
    
    try:
        # Use music21's built-in plotting
        music21.graph.plotStream(score, doneAction=None, figureType='matplotlib')
        
        # Save the figure with high resolution
        plt.savefig(output_path, format='png', dpi=dpi, bbox_inches='tight', 
                   pad_inches=0.5, facecolor='white')
        plt.close()
        
        print(f"Successfully saved high-resolution PNG to: {output_path}")
        return output_path
    except Exception as e:
        print(f"Error rendering music: {e}")
        # Try alternative approach using stream.show()
        try:
            print("Trying alternative rendering approach...")
            score_plot = score.plot()
            if hasattr(score_plot, 'figure'):
                score_plot.figure.savefig(output_path, format='png', dpi=dpi, 
                                         bbox_inches='tight', facecolor='white')
                plt.close(score_plot.figure)
                print(f"Successfully saved using alternative method to: {output_path}")
                return output_path
        except Exception as e2:
            print(f"Alternative rendering also failed: {e2}")
            return None

def render_measure(
    score: music21.stream.Score,
    measure_number: int,
    output_path: Optional[Union[str, Path]] = None,
    vertical_compression: float = 0.7,
    **kwargs
) -> Optional[str]:
    """
    Render a specific measure from a score to PNG
    
    Parameters:
    - score: The music21 Score object
    - measure_number: The measure number to render
    - output_path: Path to save the output image
    - vertical_compression: Factor to reduce vertical spacing
    - kwargs: Additional parameters to pass to render_musicxml_to_png
    
    Returns:
    - Path to the saved PNG file
    """
    # Extract the measure
    try:
        measure_stream = score.measure(measure_number)
    except Exception as e:
        print(f"Error extracting measure {measure_number}: {e}")
        return None
    
    # Create a stream for the extracted measure
    stream_container = music21.stream.Stream()
    for part_measure in measure_stream:
        stream_container.append(part_measure)
    
    # Set default output path if not provided
    if output_path is None:
        output_path = f"measure_{measure_number}.png"
    
    # Create a temporary MusicXML file
    temp_xml = Path("temp_measure.xml")
    stream_container.write('musicxml', fp=temp_xml)
    
    # Render the temporary file with vertical compression
    result = render_musicxml_to_png(
        temp_xml, 
        output_path=output_path,
        vertical_compression=vertical_compression,
        **kwargs
    )
    
    # Clean up the temporary file
    if temp_xml.exists():
        temp_xml.unlink()
    
    return result

def main():
    if len(sys.argv) < 2:
        print("Usage: python musicxml_renderer.py <musicxml_file_path> [output_png_path] [vertical_compression]")
        sys.exit(1)
    
    xml_file = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    vertical_compression = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    
    render_musicxml_to_png(xml_file, output_path, vertical_compression=vertical_compression)

if __name__ == "__main__":
    main()
