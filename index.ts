import { TpaServer, TpaSession } from '@augmentos/sdk';

import * as fs from 'fs';
import * as path from 'path';

class ExampleAugmentOSApp extends TpaServer {
  private imageBase64: string;
  private image_index: number;
  private bitmapInterval: NodeJS.Timeout;

  constructor(config: any) {
    super(config);
    this.image_index = 0;
    // start off with image 0
  }

  private setBitmap(index: number, session: TpaSession): void {
    try {
      if (index > 62) { // megalovania specific
        index = 0;
      }
      const imagePath = path.join(__dirname, `megalovania/final-dilate4/${index}.bmp`);
      const imageBuffer = fs.readFileSync(imagePath);
      this.imageBase64 = imageBuffer.toString('base64');
      session.layouts.showBitmapView(this.imageBase64);
      // start new interval
      if (this.bitmapInterval) {
        clearInterval(this.bitmapInterval);
      }
      this.bitmapInterval = setInterval(() => {
        session.layouts.showBitmapView(this.imageBase64);
      }, 10000);
      console.log(`Set bitmap image to bitmap ${this.image_index}`);
    } catch (error) {
      console.error(`Error reading or encoding image ${index}:`, error);
      this.imageBase64 = '';
    }
  }

  private setupInputListener(session: TpaSession): void {
    // Set raw mode to get input without waiting for Enter key
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('data', (key: Buffer) => {
      const keyPress = key.toString();
      
      // Log raw key presses for debugging
      console.log(`Key pressed: ${JSON.stringify(keyPress)}`);
      
      // Check for navigation inputs: "]" character from footswitch, right arrow, or left arrow

      if (keyPress.startsWith(']') || keyPress.startsWith('['))  {
        
        // Determine direction - forward for "]" and right arrow, backward for left arrow
        const isForward = keyPress.startsWith(']');
        
        if (isForward) {
          console.log('Advancing forward');
          this.image_index++;
          this.setBitmap(this.image_index, session);
        } else {
          console.log('Going backward');
          if (this.image_index > 0) {
            this.image_index--;
            this.setBitmap(this.image_index, session);
          }
        }
      }
      
      // Allow Ctrl+C to exit
      if (keyPress === '\u0003') {
        process.exit();
      }
    });

    console.log('Input listener set up. Press "]", Right arrow to advance, Left arrow to go back, or Ctrl+C to exit.');
  }

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Augmented Chords Ready\nUse keyboard arrows to navigate");
    
    // Set up keyboard input listener
    this.setupInputListener(session);
    this.setBitmap(0, session);

    // Handle real-time transcription
    const cleanup = [
      session.events.onButtonPress((data) => {}), 
      session.events.onAudioChunk((data) => {}),
      
      session.events.onTranscription((data) => {}),

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
  packageName: 'org.kese.augmentedchords2', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, can be anything
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://staging.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);