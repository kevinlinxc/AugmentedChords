import music21
import matplotlib.pyplot as plt

def render_musicxml_to_bitmap(xml_file, measures=4):
    # Parse the MusicXML file
    score = music21.converter.parse(xml_file)
    
    # Extract the first 'measures' measures
    measures = score.measures(1, measures)
    
    # Create a stream for the extracted measures
    stream = music21.stream.Stream()
    for measure in measures:
        stream.append(measure)
    
    # Draw the stream using music21's plot method
    fig = stream.plot('matplotlib', returnFigure=True)
    
    # Save the figure as a bitmap


def main():
    render_musicxml_to_bitmap('megalovania.mxl')

if __name__ == "__main__":
    main()