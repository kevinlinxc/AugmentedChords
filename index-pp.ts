import { TpaServer, TpaSession } from '@augmentos/sdk';

import * as fs from 'fs';
import * as path from 'path';

import {
    TunerState,
    initTunerState,
    processTunerAudioChunk,
    handleTunerCommand,
    updateTunerDisplay,
    getTargetFrequency,
    formatTunerDisplay
  } from './tuner';

class ExampleAugmentOSApp extends TpaServer {
    private imageBase64: string;
    private emptyImageBase64: string;
    private image_index: number;
    private bitmapInterval: NodeJS.Timeout;
    private tunerState: TunerState; // Add tuner state
    private lastTunerUpdateTime = 0; 

constructor(config: any) {
    super(config);
    this.image_index = 0;
    this.tunerState = initTunerState()
    let emptyImagePath = path.join(__dirname, 'empty.bmp');
    let emptyImageBuffer = fs.readFileSync(emptyImagePath);
    this.emptyImageBase64 = emptyImageBuffer.toString('base64');
    // start off with image 0
    }
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Pitch Perfect loaded!");

    // Send blank bitmap at the start
    setInterval(() => {
        session.layouts.showBitmapView(this.emptyImageBase64);
    }, 10000);

    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {
        console.log('Transcription:', data.text);
        let lowercase = data.text.toLowerCase();
        if (lowercase.includes("pitch off")) {
            this.tunerState.isActive = false;
        }
        if (lowercase.includes("pitch on")) {
            this.tunerState.isActive = true;
        }
      }),
      session.events.onAudioChunk((data) => {
        // Process audio for tuner
        if (this.tunerState.isActive) {
          // Use fixed sample rate as specified by AugmentOS team
          const actualSampleRate = 16000; // Fixed at 16kHz
          
          // Only log sample rate occasionally to avoid spam
          let now = Date.now();
          if (now - this.lastTunerUpdateTime > 2000) {
            console.log(`[AUDIO DEBUG] Using fixed sample rate: ${actualSampleRate}Hz`);
            
            // Calculate buffer details for debugging
            const bufferSize = data.arrayBuffer.byteLength;
            const bytesPerSample = 2; // Assuming 16-bit PCM
            const numSamples = bufferSize / bytesPerSample;
            const durationMs = (numSamples / actualSampleRate) * 1000;
            
            console.log(`[AUDIO DEBUG] Buffer size: ${bufferSize} bytes, 
              Format: 16-bit PCM, ${actualSampleRate}Hz, 
              Samples: ${numSamples}, 
              Duration: ${durationMs.toFixed(2)}ms`);
          }

          // Create a DataView to read the PCM data
          const dataView = new DataView(data.arrayBuffer);
          
          // Convert to float array for processing
          // Assuming 16-bit signed integer PCM data
          const floatArray = new Float32Array(dataView.byteLength / 2);
          for (let i = 0; i < floatArray.length; i++) {
            // Convert 16-bit PCM to float in range [-1, 1]
            floatArray[i] = dataView.getInt16(i * 2, true) / 32768.0;
          }
          
          // Process the audio with the tuner algorithm using the actual sample rate
          const updatedState = processTunerAudioChunk(floatArray, this.tunerState, actualSampleRate);
          
          // Update the tuner state with the processing results
          this.tunerState = updatedState;
          
          // Throttled display update to reduce traffic
          now = Date.now();
          if (this.tunerState.detectedFrequency !== null) {
            if (now - this.lastTunerUpdateTime > 500) {
              this.lastTunerUpdateTime = now;
              
              console.log(`[TUNER] Detected frequency: ${this.tunerState.detectedFrequency?.toFixed(2)} Hz, 
                Target: ${getTargetFrequency(this.tunerState.targetNote).toFixed(2)} Hz`);
              
              // Update the display with tuner information
              updateTunerDisplay(session, this.tunerState);
            }
          } else if (now - this.lastTunerUpdateTime > 1000) {
            // No frequency detected for over a second
            this.lastTunerUpdateTime = now;
            console.log("[TUNER] No pitch detected");
            
            // Update the display with tuner information
            updateTunerDisplay(session, this.tunerState);
          }
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