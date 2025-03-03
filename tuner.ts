/**
 * Tuner Feature - Core functionality for pitch detection and tuner mode
 * This module handles the audio processing, note detection, and display formatting
 * for the AugmentedChords guitar tuner feature.
 */

import { TpaSession } from '@augmentos/sdk';

// Configurable volume threshold - adjust this value to change sensitivity
// Lower values (e.g. 0.01) = more sensitive, higher values (e.g. 0.1) = less sensitive
export const VOLUME_THRESHOLD = 0.03; // Default threshold value

// Number of recent detections to track for finding highest amplitude note
export const DETECTION_HISTORY_SIZE = 10;

// Standard note frequencies (A4 = 440Hz standard tuning)
const NOTE_FREQUENCIES: Record<string, number> = {
    'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
    'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91,
    'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83,
    'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65,
    'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30,
    'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61,
    'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22,
    'A6': 1760.00, 'A#6': 1864.66, 'B6': 1975.53,
    'C7': 2093.00, 'C#7': 2217.46, 'D7': 2349.32, 'D#7': 2489.02, 'E7': 2637.02, 'F7': 2793.83, 'F#7': 2959.96, 'G7': 3135.96, 'G#7': 3322.44,
    'A7': 3520.00, 'A#7': 3729.31, 'B7': 3951.07,
    'C8': 4186.01
};

// All note names in chromatic order
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Audio processing constants
const SAMPLE_RATE = 16000; // Fixed sample rate for AugmentOS audio
const MIN_FREQUENCY = 70;  // Below E2 (lowest guitar string)
const MAX_FREQUENCY = 350; // Above E4 (highest guitar string)

// Interface for a single detection result
interface DetectionResult {
  note: string | null;
  frequency: number | null;
  deviation: number | null;
  signalStrength: number;
  timestamp: number;
}

// Interface for tuner state
export interface TunerState {
  isActive: boolean;
  targetNote: string;
  detectedNote: string | null;
  detectedFrequency: number | null;
  deviation: number | null; // in cents
  signalStrength: number | null; // Added to track current signal strength
  recentDetections: DetectionResult[]; // History of recent detections
  highestAmplitudeDetection: DetectionResult | null; // The detection with highest amplitude in history
}

/**
 * Initialize the tuner state with default values
 */
export function initTunerState(): TunerState {
  return {
    isActive: true,
    targetNote: 'E',
    detectedNote: null,
    detectedFrequency: null,
    deviation: null,
    signalStrength: null,
    recentDetections: [],
    highestAmplitudeDetection: null
  };
}

/**
 * Process audio data to detect pitch using FFT (Fast Fourier Transform)
 * @param audioData PCM audio data
 * @param sampleRate The actual sample rate of the audio data
 * @returns The detected frequency or null if no clear pitch is detected
 */
export function detectPitch(audioData: Float32Array, sampleRate: number): number | null {
  // Check if there's enough signal to analyze
  const signalStrength = calculateSignalStrength(audioData);
  
  if (signalStrength < VOLUME_THRESHOLD) {
    // Too quiet, no pitch detected
    console.log(`[PITCH DETECTION] Signal strength too low: ${signalStrength.toFixed(4)}, threshold: ${VOLUME_THRESHOLD}`);
    return null;
  }
  
  console.log(`[PITCH DETECTION] Signal strength: ${signalStrength.toFixed(4)}, Sample rate: ${sampleRate}Hz`);
  
  // Apply a window function to reduce spectral leakage
  const windowedData = applyHammingWindow(audioData);
  
  // Pad the data to a power of 2 for more efficient FFT
  const paddedSize = nextPowerOf2(windowedData.length);
  const paddedData = padArray(windowedData, paddedSize);
  
  // Perform the FFT
  const fftResult = performFFT(paddedData);
  
  // Convert FFT result to magnitude spectrum
  const magnitudeSpectrum = calculateMagnitudeSpectrum(fftResult);
  
  // Find the peak frequency in the spectrum within guitar frequency range
  const peakFrequency = findPeakFrequency(magnitudeSpectrum, sampleRate, paddedSize);
  
  if (peakFrequency === null) {
    console.log(`[PITCH DETECTION] No clear frequency peak found`);
    return null;
  }
  
  // Improve resolution using quadratic interpolation
  const refinedFrequency = refineFrequencyEstimate(magnitudeSpectrum, peakFrequency.index, sampleRate, paddedSize);
  
  console.log(`[PITCH DETECTION] Peak frequency: ${refinedFrequency.toFixed(2)} Hz`);
  
  // Only return frequency if it's in a reasonable range for guitar
  if (refinedFrequency >= MIN_FREQUENCY && refinedFrequency <= MAX_FREQUENCY) {
    return refinedFrequency;
  }
  
  console.log(`[PITCH DETECTION] Frequency out of range: ${refinedFrequency.toFixed(2)} Hz (min: ${MIN_FREQUENCY}, max: ${MAX_FREQUENCY})`);
  return null;
}

/**
 * Calculate the next power of 2 greater than or equal to the input number
 * @param n Input number
 * @returns Next power of 2
 */
function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Pad array to specified length with zeros
 * @param array Input array
 * @param targetLength Desired length
 * @returns Padded array
 */
function padArray(array: Float32Array, targetLength: number): Float32Array {
  const result = new Float32Array(targetLength);
  result.set(array);
  return result;
}

/**
 * Perform a Fast Fourier Transform on input data
 * @param inputData Real-valued input data (time domain)
 * @returns Complex-valued output data (frequency domain) as array of [real, imag] pairs
 */
function performFFT(inputData: Float32Array): Array<[number, number]> {
  const n = inputData.length;
  
  // Base case for recursion
  if (n === 1) {
    return [[inputData[0], 0]]; // Return as [real, imaginary]
  }
  
  // Split into even and odd indices
  const evenData = new Float32Array(n / 2);
  const oddData = new Float32Array(n / 2);
  
  for (let i = 0; i < n / 2; i++) {
    evenData[i] = inputData[2 * i];
    oddData[i] = inputData[2 * i + 1];
  }
  
  // Recursively compute FFT for even and odd subproblems
  const evenFFT = performFFT(evenData);
  const oddFFT = performFFT(oddData);
  
  // Combine results
  const result: Array<[number, number]> = new Array(n);
  
  for (let k = 0; k < n / 2; k++) {
    // Complex multiplication by twiddle factor W_n^k
    const angle = -2 * Math.PI * k / n;
    const twiddle: [number, number] = [Math.cos(angle), Math.sin(angle)];
    
    // Complex multiplication: oddFFT[k] * twiddle
    const odd_real = oddFFT[k][0] * twiddle[0] - oddFFT[k][1] * twiddle[1];
    const odd_imag = oddFFT[k][0] * twiddle[1] + oddFFT[k][1] * twiddle[0];
    
    // Combine the transformed parts
    result[k] = [
      evenFFT[k][0] + odd_real,
      evenFFT[k][1] + odd_imag
    ];
    
    result[k + n / 2] = [
      evenFFT[k][0] - odd_real,
      evenFFT[k][1] - odd_imag
    ];
  }
  
  return result;
}

/**
 * Calculate the magnitude spectrum from FFT result
 * @param fftResult Complex-valued FFT result
 * @returns Magnitude spectrum (absolute values)
 */
function calculateMagnitudeSpectrum(fftResult: Array<[number, number]>): Float32Array {
  const n = fftResult.length;
  const magnitudes = new Float32Array(n / 2); // We only need the first half (Nyquist limit)
  
  for (let i = 0; i < n / 2; i++) {
    const real = fftResult[i][0];
    const imag = fftResult[i][1];
    magnitudes[i] = Math.sqrt(real * real + imag * imag);
  }
  
  return magnitudes;
}

/**
 * Find the peak frequency in the magnitude spectrum
 * @param magnitudeSpectrum Magnitude spectrum from FFT
 * @param sampleRate Audio sample rate
 * @param fftSize Size of the FFT
 * @returns The peak frequency and its index, or null if no clear peak
 */
function findPeakFrequency(magnitudeSpectrum: Float32Array, sampleRate: number, fftSize: number): { frequency: number, index: number } | null {
  const minIndex = Math.floor(MIN_FREQUENCY * fftSize / sampleRate);
  const maxIndex = Math.ceil(MAX_FREQUENCY * fftSize / sampleRate);
  
  let peakValue = 0;
  let peakIndex = -1;
  
  // First, find the maximum value in the spectrum to set a threshold
  for (let i = minIndex; i <= maxIndex; i++) {
    if (magnitudeSpectrum[i] > peakValue) {
      peakValue = magnitudeSpectrum[i];
      peakIndex = i;
    }
  }
  
  // If no significant peak was found
  if (peakValue < 0.01 || peakIndex === -1) {
    return null;
  }
  
  // Calculate frequency from bin index
  const frequency = (peakIndex * sampleRate) / fftSize;
  
  return { frequency, index: peakIndex };
}

/**
 * Refine frequency estimate using quadratic interpolation between FFT bins
 * @param magnitudeSpectrum Magnitude spectrum from FFT
 * @param peakIndex Index of the detected peak
 * @param sampleRate Audio sample rate
 * @param fftSize Size of the FFT
 * @returns Refined frequency estimate
 */
function refineFrequencyEstimate(magnitudeSpectrum: Float32Array, peakIndex: number, sampleRate: number, fftSize: number): number {
  // Ensure we have valid indices for interpolation
  if (peakIndex <= 0 || peakIndex >= magnitudeSpectrum.length - 1) {
    return (peakIndex * sampleRate) / fftSize;
  }
  
  // Get magnitudes of the peak and adjacent bins
  const alpha = magnitudeSpectrum[peakIndex - 1];
  const beta = magnitudeSpectrum[peakIndex];
  const gamma = magnitudeSpectrum[peakIndex + 1];
  
  // Quadratic interpolation formula to find the peak location
  const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
  
  // Calculate the interpolated bin index
  const interpolatedIndex = peakIndex + p;
  
  // Convert to frequency
  const refinedFrequency = (interpolatedIndex * sampleRate) / fftSize;
  
  return refinedFrequency;
}

/**
 * Apply a Hamming window to the audio data to reduce spectral leakage
 * @param audioData The raw audio data
 * @returns Windowed audio data
 */
function applyHammingWindow(audioData: Float32Array): Float32Array {
  const windowedData = new Float32Array(audioData.length);
  
  for (let i = 0; i < audioData.length; i++) {
    // Hamming window formula: 0.54 - 0.46 * cos(2π * i / (N-1))
    const windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (audioData.length - 1));
    windowedData[i] = audioData[i] * windowValue;
  }
  
  return windowedData;
}

/**
 * Calculate the signal strength from audio data
 * @param audioData PCM audio data
 * @returns Signal strength value between 0 and 1
 */
function calculateSignalStrength(audioData: Float32Array): number {
  // Calculate RMS (Root Mean Square) amplitude
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);
  
  // Normalize to a 0-1 scale with some reasonable thresholds
  // These values might need adjustment based on actual audio input levels
  return Math.min(1, Math.max(0, rms / 0.1));
}

/**
 * Convert a frequency to the nearest musical note
 * @param frequency The frequency in Hz
 * @returns The musical note name
 */
export function frequencyToNote(frequency: number): string {
  // A4 = 440Hz is our reference
  const A4 = 440.0;
  
  // Calculate how many half steps away from A4 this frequency is
  const halfStepFromA4 = Math.round(12 * Math.log2(frequency / A4));
  
  // Calculate the octave (A4 is in octave 4)
  const octave = 4 + Math.floor((halfStepFromA4 + 9) / 12);
  
  // Get the note name (0 = C, 1 = C#, etc.)
  const noteIndex = (halfStepFromA4 + 9) % 12;
  if (noteIndex < 0) {
    const noteName = NOTE_NAMES[noteIndex + 12] + octave;
    console.log(`[NOTE DETECTION] Frequency: ${frequency.toFixed(2)} Hz maps to ${noteName} (${halfStepFromA4} half steps from A4)`);
    return noteName;
  }
  const noteName = NOTE_NAMES[noteIndex] + octave;
  console.log(`[NOTE DETECTION] Frequency: ${frequency.toFixed(2)} Hz maps to ${noteName} (${halfStepFromA4} half steps from A4)`);
  return noteName;
}

/**
 * Calculate cents deviation from target frequency
 * @param detectedFreq The detected frequency
 * @param targetFreq The target frequency
 * @returns Deviation in cents (100 cents = 1 semitone)
 */
export function calculateCentsDeviation(detectedFreq: number, targetFreq: number): number {
  return Math.round(1200 * Math.log2(detectedFreq / targetFreq));
}

/**
 * Find the closest guitar note to the given frequency
 * @param frequency The frequency to match to a guitar note
 * @returns The closest guitar note with octave (e.g., 'E2', 'A3')
 */
export function findClosestGuitarNote(frequency: number): string {
  
  // Search through our predefined frequencies
  let closestNote = "";
  let smallestDifference = Infinity;
  let smallestDifferenceInCents = Infinity;
  
  // Store the closest matches for logging
  const matches: {note: string, freq: number, diff: number, cents: number}[] = [];
  
  // When detecting guitar notes, we want to prioritize the frequencies in the guitar range
  // Standard guitar open strings: E2(82.41Hz), A2(110Hz), D3(146.83Hz), G3(196Hz), B3(246.94Hz), E4(329.63Hz)
  const guitarOpenStrings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
  
  // Find the closest note frequency
  for (const [note, noteFreq] of Object.entries(NOTE_FREQUENCIES)) {
    // Calculate the difference in Hz
    const difference = Math.abs(frequency - noteFreq);
    
    // Also calculate difference in cents to get a better measurement
    const centsDeviation = Math.abs(calculateCentsDeviation(frequency, noteFreq));
    
    // Store this match for potential logging
    matches.push({note, freq: noteFreq, diff: difference, cents: centsDeviation});
    
    // Improved scoring system:
    // 1. Use cents deviation as primary measure (more accurate across octaves)
    // 2. Give preference to common guitar notes
    
    let score = centsDeviation;
    
    // Give preference to common guitar notes (open strings)
    if (guitarOpenStrings.includes(note)) {
      score -= 5; // Slight boost for guitar open strings
    }
    
    // Update closest note if this is the best match so far
    if (score < smallestDifferenceInCents) {
      smallestDifference = difference;
      smallestDifferenceInCents = centsDeviation;
      closestNote = note; // Store the full note with octave
    }
  }
  return closestNote;
}

/**
 * Get the target frequency for a given note
 * @param note The target note name
 * @returns The frequency in Hz
 */
export function getTargetFrequency(note: string): number {
  // Find the matching note in our predefined frequencies
  for (const [fullNote, freq] of Object.entries(NOTE_FREQUENCIES)) {
    if (fullNote.startsWith(note)) {
      return freq;
    }
  }
  
  // Default to E if not found
  return NOTE_FREQUENCIES['E2'];
}

/**
 * Format the tuner display output
 * @param tunerState Current state of the tuner
 * @returns Formatted string ready for display
 */
export function formatTunerDisplay(tunerState: TunerState): string {
  const { highestAmplitudeDetection, signalStrength } = tunerState;
  let display = "";
  
  // Check if the signal strength is too low
  if (signalStrength !== null && signalStrength < VOLUME_THRESHOLD) {
    display += `\n\nVolume too low. Play louder.\nThreshold: ${(VOLUME_THRESHOLD * 100).toFixed(1)}%`;
    return display;
  }
  
  // No pitch detected (for other reasons)
  if (!highestAmplitudeDetection || !highestAmplitudeDetection.note) {
    display += `\n\nNo pitch detected. Play a note.`;
    return display;
  }
  
  if (highestAmplitudeDetection.frequency) {
    display += "Frequency: " + highestAmplitudeDetection.frequency.toFixed(1) + " Hz";
    display += "\nStrength: " + (highestAmplitudeDetection.signalStrength * 100).toFixed(1) + "%";
  }
  
  if (highestAmplitudeDetection.note) {
    display += "\n\nClosest note: " + highestAmplitudeDetection.note;
  }
  
  // Add information about when this detection was captured
  const timeSinceDetection = Math.floor((Date.now() - highestAmplitudeDetection.timestamp) / 1000);
  display += `\n\nDetected ${timeSinceDetection} second${timeSinceDetection !== 1 ? 's' : ''} ago`;
  
  return display;
}

/**
 * Handle voice command for tuner mode
 * @param command The processed voice command
 * @param tunerState Current tuner state
 * @returns Updated tuner state
 */
export function handleTunerCommand(command: string, tunerState: TunerState): TunerState {
  const updatedState = { ...tunerState };
  
  // Command to set target note, e.g., "tune to A"
  const tuneToMatch = command.match(/tune\s+to\s+([A-G](?:#|b)?)/i);
  if (tuneToMatch) {
    const newTargetNote = tuneToMatch[1].toUpperCase();
    updatedState.targetNote = newTargetNote;
    return updatedState;
  }
  
  // Command to exit tuner mode
  if (command.includes('exit tuner') || command.includes('chord mode')) {
    updatedState.isActive = false;
    return updatedState;
  }
  
  // Command to enter tuner mode
  if (command.includes('tuner mode') || command.includes('tune guitar')) {
    updatedState.isActive = true;
    return updatedState;
  }
  
  // No relevant command found, return state unchanged
  return updatedState;
}

/**
 * Process audio chunk for tuner
 * @param audioData Audio data from onAudioChunk event
 * @param tunerState Current tuner state
 * @param sampleRate The actual sample rate of the audio data
 * @returns Updated tuner state with detection results
 */
export function processTunerAudioChunk(audioData: Float32Array, tunerState: TunerState, sampleRate: number): TunerState {
  if (!tunerState.isActive) {
    // Not in tuner mode, don't process
    return tunerState;
  }
  
  // Create a copy of the current state
  const updatedState = { ...tunerState };
  
  // Calculate and store the current signal strength
  const signalStrength = calculateSignalStrength(audioData);
  updatedState.signalStrength = signalStrength;
  
  // Current timestamp for this detection
  const currentTimestamp = Date.now();
  
  // Prepare the current detection result
  const currentDetection: DetectionResult = {
    note: null,
    frequency: null,
    deviation: null,
    signalStrength,
    timestamp: currentTimestamp
  };
  
  // Process the audio if signal is strong enough
  if (signalStrength >= VOLUME_THRESHOLD) {
    // Detect pitch from audio data
    const detectedFrequency = detectPitch(audioData, sampleRate);
    
    if (detectedFrequency !== null) {
      // Smooth the frequency if we have a previous detection
      let smoothedFrequency = detectedFrequency;
      
      if (updatedState.detectedFrequency !== null) {
        // Calculate percentage difference between new and previous frequency
        const percentDiff = Math.abs((detectedFrequency - updatedState.detectedFrequency) / updatedState.detectedFrequency) * 100;
        
        // If new frequency is very close to previous, use a weighted average
        if (percentDiff < 3) {
          smoothedFrequency = detectedFrequency * 0.7 + updatedState.detectedFrequency * 0.3;
        } else {
          // If it's a significant change, still apply some smoothing
          smoothedFrequency = detectedFrequency * 0.9 + updatedState.detectedFrequency * 0.1;
        }
      }
      
      // Find the corresponding note
      const detectedNote = findClosestGuitarNote(smoothedFrequency);
      
      // Calculate deviation from target note
      const targetFrequency = getTargetFrequency(tunerState.targetNote);
      const deviation = calculateCentsDeviation(smoothedFrequency, targetFrequency);
      
      // Update current detection details
      currentDetection.note = detectedNote;
      currentDetection.frequency = smoothedFrequency;
      currentDetection.deviation = deviation;
      
      // Update the current state values
      updatedState.detectedNote = detectedNote;
      updatedState.detectedFrequency = smoothedFrequency;
      updatedState.deviation = deviation;
    }
  }
  
  // Add the current detection to the history
  const updatedDetections = [...tunerState.recentDetections, currentDetection];
  
  // Keep only the most recent detections (maintaining DETECTION_HISTORY_SIZE)
  if (updatedDetections.length > DETECTION_HISTORY_SIZE) {
    updatedDetections.shift(); // Remove oldest detection
  }
  
  updatedState.recentDetections = updatedDetections;
  
  // Find the detection with the highest amplitude in our history
  let highestAmplitude = -1;
  let highestAmplitudeDetection: DetectionResult | null = null;
  
  // Filter to only include detections with actual notes (not null)
  const validDetections = updatedDetections.filter(
    detection => detection.note !== null && detection.frequency !== null
  );
  
  for (const detection of validDetections) {
    if (detection.signalStrength > highestAmplitude) {
      highestAmplitude = detection.signalStrength;
      highestAmplitudeDetection = detection;
    }
  }
  
  // If we found a valid highest amplitude detection, update the state
  if (highestAmplitudeDetection) {
    updatedState.highestAmplitudeDetection = highestAmplitudeDetection;
    
    // Log when we find a new highest amplitude note
    if (!tunerState.highestAmplitudeDetection || 
        tunerState.highestAmplitudeDetection.note !== highestAmplitudeDetection.note ||
        tunerState.highestAmplitudeDetection.timestamp !== highestAmplitudeDetection.timestamp) {
      console.log(`[TUNER] New highest amplitude note: ${highestAmplitudeDetection.note} at ${highestAmplitudeDetection.frequency?.toFixed(1)} Hz (strength: ${(highestAmplitudeDetection.signalStrength * 100).toFixed(1)}%)`);
    }
  }
  
  // Clean up old detections after a certain time (e.g., 30 seconds)
  // This prevents the system from showing very old highest amplitude notes
  if (highestAmplitudeDetection && 
      (currentTimestamp - highestAmplitudeDetection.timestamp) > 30000) {
    console.log(`[TUNER] Clearing old highest amplitude detection (${(currentTimestamp - highestAmplitudeDetection.timestamp) / 1000}s old)`);
    updatedState.highestAmplitudeDetection = null;
  }
  
  return updatedState;
}

/**
 * Update the tuner display on AugmentOS glasses
 * @param session TpaSession for display updates
 * @param tunerState Current tuner state
 */
export function updateTunerDisplay(session: TpaSession, tunerState: TunerState): void {
  // Format tuner state into compact display text
  const displayText = formatTunerDisplay(tunerState);
  
  // Show on the glasses
  session.layouts.showTextWall(displayText);
}