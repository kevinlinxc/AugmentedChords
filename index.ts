import { TpaServer, TpaSession } from '@augmentos/sdk';

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ExampleAugmentOSApp extends TpaServer {
  private imageBase64: string;
  private emptyImageBase64: string;
  private image_index: number;
  private showingSheet: boolean;
  private bitmapInterval: NodeJS.Timeout;
  private song: string;
  private song_options: string[];

  constructor(config: any) {
    super(config);
    this.showingSheet = false;
    const emptyImagePath = path.join(__dirname, 'empty.bmp');
    const emptyImageBuffer = fs.readFileSync(emptyImagePath);
    this.emptyImageBase64 = emptyImageBuffer.toString('base64');
    this.song = 'megalovania';
    this.image_index = 0;
    this.song_options = ['megalovania', "furelise"];
  }

  private clearBitmap(session: TpaSession): void {
    session.layouts.showBitmapView(this.emptyImageBase64);
    if (this.bitmapInterval) {
      clearInterval(this.bitmapInterval);
    }
  }

  private setBitmap(session: TpaSession): void {
    if (!this.showingSheet) {
      return;
    }
    let index = this.image_index;
    try {
      const imagePath = path.join(__dirname, `${this.song}/${index}.bmp`);
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
      if (!this.showingSheet) {
        return;
      }
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
          this.setBitmap(session);
        } else {
          console.log('Going backward');
          if (this.image_index > 0) {
            this.image_index--;
            this.setBitmap(session);
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
    session.layouts.showTextWall("Augmented Chords Ready\nUse [ and ] to navigate measures]");
    
    // Set up keyboard input listener
    // careful, if you connect twice this gets set up twice
    this.setupInputListener(session);
    setTimeout(() => {
      this.clearBitmap(session);
    }
    , 5000);


    // Handle real-time transcription
    const cleanup = [
      session.events.onButtonPress((data) => {}), 
      session.events.onAudioChunk((data) => {}),
      
      session.events.onTranscription((data) => {
        if (data.isFinal) {
          return; // skip, we already probably got it
        }
        let lowercase = data.text.toLowerCase();
        console.log('Transcription:', data.text);
        if (lowercase.includes("exit sheet")){
          this.showingSheet = false;
          this.clearBitmap(session);
        }
        else if (lowercase.includes("show sheet")){
          this.showingSheet = true;
          this.setBitmap(session);
        }
        if (!this.showingSheet) {
          session.layouts.showTextWall(data.text, {
            durationMs: data.isFinal ? 3000 : undefined
          });
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
  packageName: 'org.kese.augmentedchords2', // make sure this matches your app in dev console
  apiKey: process.env.API_KEY, // Use environment variable instead of hardcoded key
  port: 80, // The port you're hosting the server on
});

app.start().catch(console.error);