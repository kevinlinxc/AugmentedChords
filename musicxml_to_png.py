import os
import sys
import music21
import matplotlib.pyplot as plt

def render_musicxml_to_png(xml_file, output_path=None, dpi=300, figsize=(14, 10)):
    """
    Render a MusicXML file to a high-resolution PNG image.
    
    Parameters:
    - xml_file: Path to the MusicXML file (.xml, .mxl)
    - output_path: Path to save the output image
    - dpi: Resolution of the image (dots per inch)
    - figsize: Size of the figure (width, height) in inches
    
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

def main():
    if len(sys.argv) < 2:
        print("Usage: python musicxml_to_png.py <musicxml_file_path> [output_png_path]")
        sys.exit(1)
    
    xml_file = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    render_musicxml_to_png(xml_file, output_path)

if __name__ == "__main__":
    main()
