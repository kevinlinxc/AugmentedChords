from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import librosa
import numpy as np
from typing import List
import os

app = FastAPI()

class AudioPath(BaseModel):
    filepath: str
    chord: bool = False

def freq_to_note(frequency: float) -> str:
    """Convert frequency to musical note."""
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    # A4 = 440Hz
    if frequency <= 0:
        return None
    
    # Calculate note number relative to A4
    note_number = 12 * np.log2(frequency / 440) + 49
    note_number = round(note_number)
    
    # Get octave and note name
    octave = (note_number - 1) // 12
    note_index = (note_number - 1) % 12
    
    return f"{note_names[note_index]}{octave}"

def get_dominant_frequencies(audio_path: str, threshold_db: float = -20, chord: bool = False) -> List[float]:
    """Extract dominant frequencies from audio file."""
    try:
        # Load audio file
        y, sr = librosa.load(audio_path)
        
        # Compute magnitude spectrogram
        D = librosa.stft(y)
        mag_db = librosa.amplitude_to_db(np.abs(D), ref=np.max)
        
        # Get frequency bins
        frequencies = librosa.fft_frequencies(sr=sr)
        print(f"Found {len(frequencies)} frequency bins")
        
        # Find maximum amplitude for each frequency across all time frames
        max_amplitudes = np.max(mag_db, axis=1)
        
        # Create frequency-amplitude pairs and filter by threshold
        freq_amp_pairs = [(freq, amp) for freq, amp in zip(frequencies, max_amplitudes) 
                         if amp > threshold_db]
        
        # Sort by amplitude (descending)
        freq_amp_pairs.sort(key=lambda x: x[1], reverse=True)
        
        # Take top N frequencies based on chord parameter
        num_frequencies = 3 if chord else 1
        top_frequencies = [round(freq, 1) for freq, _ in freq_amp_pairs[:num_frequencies]]
        
        return top_frequencies

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

@app.post("/audio")
async def analyze_audio(audio_path: AudioPath):
    if not os.path.exists(audio_path.filepath):
        raise HTTPException(status_code=404, detail=f"Audio file not found: {audio_path.filepath}")
        
    if not audio_path.filepath.endswith('.wav'):
        raise HTTPException(status_code=400, detail="Only WAV files are supported")
    
    # Get dominant frequencies with chord parameter
    frequencies = get_dominant_frequencies(audio_path.filepath, chord=audio_path.chord)
    
    # Convert frequencies to notes
    notes = [freq_to_note(f) for f in frequencies]
    notes = [note for note in notes if note is not None]
    
    return {
        "status": "success",
        "detected_frequencies": frequencies,
        "detected_notes": notes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
