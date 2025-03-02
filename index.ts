import { TpaServer, TpaSession } from '@augmentos/sdk';

import * as fs from 'fs';
import * as path from 'path';

class ExampleAugmentOSApp extends TpaServer {
  private imageBase64: string;

  constructor(config: any) {
    super(config);
    // start off with image 0
    try {
      const imagePath = path.join(__dirname, '0.bmp');
      const imageBuffer = fs.readFileSync(imagePath);
      this.imageBase64 = imageBuffer.toString('base64');
      console.log('Image encoded successfully');
      // You can access this.imageBase64 anywhere in your class now
    } catch (error) {
      console.error('Error reading or encoding image:', error);
      this.imageBase64 = '';
    }
  }
  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    setInterval(() => {
      // Initial display of chords
      this.sendBitmap(session);
    }, 2000); 

    // Handle real-time transcription
    const cleanup = [
      
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

  private sendBitmap(session: TpaSession) {
    session.layouts.showBitmapView(this.imageBase64);
  }
}


// Start the server
// DEV CONSOLE URL: https://augmentos.dev/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleAugmentOSApp({
  packageName: 'org.kese.augmentedchords2', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, can be anything
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://dev.augmentos.org/tpa-ws' //AugmentOS url
});



app.start().catch(console.error);