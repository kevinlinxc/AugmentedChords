import os
import numpy as np
from music21 import converter, note, chord
from PIL import Image
import matplotlib.pyplot as plt

def mxl_to_bitmap(mxl_file_path, output_path=None, piano_roll_height=128, time_step=0.25):
    """
    Convert MXL file to a bitmap image.
    
    Parameters:
    - mxl_file_path: Path to the MXL file
    - output_path: Path to save the output image
    - piano_roll_height: Height of the piano roll (default=128 MIDI notes)
    - time_step: Resolution of time steps (in quarter notes)
    
    Returns:
    - Image object
    """
    # Parse the MXL file
    print(f"Parsing MXL file: {mxl_file_path}")
    score = converter.parse(mxl_file_path)
    
    # Get the parts from the score
    parts = score.parts if hasattr(score, 'parts') else [score]
    
    # Calculate the total duration in time steps
    max_duration = 0
    for part in parts:
        part_duration = part.highestTime
        if part_duration > max_duration:
            max_duration = part_duration
    
    time_steps = int(max_duration / time_step) + 1
    
    # Create an empty piano roll
    piano_roll = np.zeros((piano_roll_height, time_steps), dtype=np.uint8)
    
    # Fill the piano roll with notes
    for part_idx, part in enumerate(parts):
        for element in part.flatten().notesAndRests:
            if isinstance(element, (note.Note, chord.Chord)):
                start_step = int(element.offset / time_step)
                end_step = int((element.offset + element.quarterLength) / time_step)
                
                # Process notes
                if isinstance(element, note.Note):
                    note_pitch = element.pitch.midi
                    piano_roll[note_pitch, start_step:end_step] = 255
                # Process chords
                elif isinstance(element, chord.Chord):
                    for pitch in element.pitches:
                        piano_roll[pitch.midi, start_step:end_step] = 255
    
    # Create an RGB bitmap
    bitmap = np.zeros((piano_roll_height, time_steps, 3), dtype=np.uint8)
    
    # Assign a distinct color based on part index (we'll use grayscale for simplicity)
    for part_idx, part in enumerate(parts):
        for element in part.flatten().notesAndRests:
            if isinstance(element, (note.Note, chord.Chord)):
                start_step = int(element.offset / time_step)
                end_step = int((element.offset + element.quarterLength) / time_step)
                color = min(255, 100 + 50 * part_idx)  # Different gray level for each part
                
                if isinstance(element, note.Note):
                    note_pitch = element.pitch.midi
                    bitmap[piano_roll_height - note_pitch - 1, start_step:end_step] = [color, color, color]
                elif isinstance(element, chord.Chord):
                    for pitch in element.pitches:
                        bitmap[piano_roll_height - pitch.midi - 1, start_step:end_step] = [color, color, color]
    
    # Crop the bitmap to only include the range of notes used
    used_notes = np.any(bitmap > 0, axis=(1, 2))
    first_note = np.argmax(used_notes)
    last_note = piano_roll_height - np.argmax(used_notes[::-1])
    
    # Add padding
    padding = 4
    first_note = max(0, first_note - padding)
    last_note = min(piano_roll_height, last_note + padding)
    
    # Crop bitmap
    bitmap = bitmap[first_note:last_note]
    
    # Create PIL image
    img = Image.fromarray(bitmap)
    
    # Save image if output path is provided
    if output_path:
        img.save(output_path)
        print(f"Bitmap saved to: {output_path}")
    
    return img

def display_bitmap(img):
    """Display bitmap using matplotlib"""
    plt.figure(figsize=(12, 6))
    plt.imshow(np.array(img))
    plt.axis('off')
    plt.tight_layout()
    plt.show()
    
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python mxl_to_bitmap.py <mxl_file_path> [output_path]")
        sys.exit(1)
        
    mxl_file_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not output_path:
        # Use same location as input but with .png extension
        output_path = os.path.splitext(mxl_file_path)[0] + ".png"
    
    img = mxl_to_bitmap(mxl_file_path, output_path)
    display_bitmap(img)
