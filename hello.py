import os
import music21
import matplotlib.pyplot as plt
from musicxml_to_png import render_musicxml_to_png
from image_cropper import crop_white_margins

def render_musicxml_to_bitmap(xml_file, measures=4):
    # Parse the MusicXML file
    score = music21.converter.parse(xml_file)
    
    # Extract the first 'measures' measures
    measures_stream = score.measures(1, measures)
    
    # Create a stream for the extracted measures
    stream = music21.stream.Stream()
    for measure in measures_stream:
        stream.append(measure)
    
    # Save to a temporary file
    temp_file = 'temp_excerpt.xml'
    stream.write('musicxml', fp=temp_file)
    
    # Use the high-resolution renderer
    output_path = os.path.splitext(xml_file)[0] + '_excerpt.png'
    render_musicxml_to_png(temp_file, output_path)
    
    # Crop the white margins from the image
    cropped_path = crop_white_margins(output_path)
    
    # Clean up temporary file
    if os.path.exists(temp_file):
        os.remove(temp_file)
    
    print(f"Rendered and cropped excerpt saved to {cropped_path}")


def main():
    render_musicxml_to_bitmap('megalovania.mxl')

if __name__ == "__main__":
    main()