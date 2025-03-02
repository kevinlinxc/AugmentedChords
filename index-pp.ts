import { TpaServer, TpaSession } from '@augmentos/sdk';

// Helper function to convert frequency to note
function getClosestNote(frequency: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const a4 = 440;
  const c0 = a4 * Math.pow(2, -4.75);
  
  if (frequency < 27.5) return 'Too low';
  if (frequency > 4186) return 'Too high';
  
  const h = Math.round(12 * Math.log2(frequency / c0));
  const octave = Math.floor(h / 12);
  const n = h % 12;
  return notes[n] + octave;
}

// Pitch detection using autocorrelation
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const correlations = new Float32Array(buffer.length);
  
  for (let lag = 0; lag < buffer.length; lag++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }
  
  let maxCorrelation = 0;
  let maxLag = -1;
  
  for (let lag = 40; lag < correlations.length; lag++) {
    if (correlations[lag] > maxCorrelation) {
      maxCorrelation = correlations[lag];
      maxLag = lag;
    }
  }
  
  return sampleRate / maxLag;
}

class ExampleAugmentOSApp extends TpaServer {
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Pitch Perfect loaded!");

    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {}),
      session.events.onAudioChunk((data) => {
        // console.log("Received audio chunk: ", data.arrayBuffer);
        const audioData = new Float32Array(data.arrayBuffer);
        if (audioData.length >= 100) {
          const frequency = detectPitch(audioData, 100);
          const note = getClosestNote(frequency);
          console.log(`Frequency: ${frequency.toFixed(2)}Hz, Closest note: ${note}`);
          session.layouts.showTextWall(`Frequency: ${frequency.toFixed(2)}Hz\nClosest note: ${note}`);
        }
      }),

      session.events.onPhoneNotifications((data) => {}),

      session.events.onGlassesBattery((data) => {}),

      session.events.onError((error) => {
        console.error('Error:', error);
      })
    ];

    // Add cleanup handlers
    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}

// Start the server
// DEV CONSOLE URL: https://augmentos.dev/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleAugmentOSApp({
  packageName: 'com.kevin.perfectpitch', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, can be anything
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://staging.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);