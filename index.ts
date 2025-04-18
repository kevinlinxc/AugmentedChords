import { TpaServer, TpaSession } from '@augmentos/sdk';

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Application states
enum AppState {
  IDLE,
  CATALOG_VIEW,
  PLAYING_SHEET
}

// App mode types
enum AppMode {
  AUTO,
  MANUAL
}

// Song configuration with intervals
interface SongConfig {
  name: string;
  displayName: string;
  intervalMs: number;
}

class ExampleAugmentOSApp extends TpaServer {
  private imageBase64: string;
  private emptyImageBase64: string;
  private image_index: number;
  private showingSheet: boolean;
  private sheetInterval: NodeJS.Timeout | null;
  private bitmapInterval: NodeJS.Timeout | null;
  private currentState: AppState;
  private selectedSongIndex: number;
  private isPaused: boolean;
  private songs: SongConfig[];
  private appMode: AppMode;
  
  constructor(config: any) {
    super(config);
    this.showingSheet = false;
    this.currentState = AppState.IDLE;
    this.selectedSongIndex = 0;
    this.isPaused = false;
    this.sheetInterval = null;
    this.bitmapInterval = null;
    this.image_index = 0;
    this.appMode = AppMode.MANUAL;
    
    // Configure songs with their interval times
    this.songs = [
      { name: 'furelise', displayName: 'Fur Elise', intervalMs: 3000 },
      { name: "sparkle", displayName: "Sparkle", intervalMs: 3500 },
      { name: 'megalovania', displayName: 'Megalovania', intervalMs: 3000 },
      { name: 'clairedelune', displayName: 'Claire de Lune', intervalMs: 3000 },
      { name: 'gymnopedie', displayName: 'Gymnopedie', intervalMs: 3000 },
    ];
    
    // Load empty bitmap for clearing display
    const emptyImagePath = path.join(__dirname, 'empty.bmp');
    const emptyImageBuffer = fs.readFileSync(emptyImagePath);
    this.emptyImageBase64 = emptyImageBuffer.toString('base64');
  }

  private clearBitmap(session: TpaSession): void {
    console.log("Clearing bitmap");
    session.layouts.showBitmapView(this.emptyImageBase64);
    this.clearIntervals();
  }
  
  private clearIntervals(): void {
    // Clear any existing intervals
    console.log("Clearing intervals");
    if (this.bitmapInterval) {
      clearInterval(this.bitmapInterval);
      this.bitmapInterval = null;
    }
    if (this.sheetInterval) {
      clearInterval(this.sheetInterval);
      this.sheetInterval = null;
    }
  }

  private getCurrentSong(): SongConfig {
    return this.songs[this.selectedSongIndex];
  }

  private showInstructions(session: TpaSession): void {
    session.layouts.showTextWall(
      "Say 'show help' to view these instructions.\n" +
      "Say 'show catalog' to see available music.\n" +
      "Navigate with 'next', 'previous' and 'select.\n" +
      "Control with 'pause/stop', 'start' 'reset', or 'exit'.\n", { durationMs: 3000 }
    );
  }

  private showCatalog(session: TpaSession): void {
    this.currentState = AppState.CATALOG_VIEW;
    
    let catalogText = "";
    
    // Display 4 songs per page with modulus to loop over the index
    for (let i = 0; i < 4; i++) {
      const index = (this.selectedSongIndex + i) % this.songs.length;
      const prefix = index === this.selectedSongIndex ? ">" : " ";
      catalogText += `${prefix}${this.songs[index].displayName}\n`;
    }
    
    session.layouts.showTextWall(catalogText);

  }

  private nextCatalogItem(session: TpaSession): void {
    if (this.currentState === AppState.CATALOG_VIEW) {
      this.selectedSongIndex = (this.selectedSongIndex + 1) % this.songs.length;
      console.log("Selected song index:", this.selectedSongIndex);
      this.showCatalog(session);
    }
  }

  private previousCatalogItem(session: TpaSession): void {
    if (this.currentState === AppState.CATALOG_VIEW) {
      this.selectedSongIndex = (this.selectedSongIndex - 1) % this.songs.length;
      this.showCatalog(session);
    }
  }

  private selectSong(session: TpaSession): void {
    if (this.currentState === AppState.CATALOG_VIEW) {
      // session.layouts.showTextWall(`Loading ${this.getCurrentSong().displayName}...
      // Commands are "start", "pause", "resume", "reset" and "exit"`);
      this.currentState = AppState.PLAYING_SHEET;
      this.showingSheet = true;
      this.isPaused = false;
      this.image_index = 0;
      
      // Display first sheet and start intervals
      this.loadAndDisplaySheet(session);
    }
  }

  private loadAndDisplaySheet(session: TpaSession): void {
    try {
      const currentSong = this.getCurrentSong();
      const imagePath = path.join(__dirname, `${currentSong.name}/${this.image_index}.bmp`);
      const imageBuffer = fs.readFileSync(imagePath);
      this.imageBase64 = imageBuffer.toString('base64');
      session.layouts.showBitmapView(this.imageBase64);
      
      // Ensure bitmap stays visible with a keepalive interval
      if (this.bitmapInterval) {
        clearInterval(this.bitmapInterval);
      }
      this.bitmapInterval = setInterval(() => {
        session.layouts.showBitmapView(this.imageBase64);
      }, 10000);
      
      console.log(`Showing ${currentSong.name} sheet ${this.image_index}`);
    } catch (error) {
      console.error(`Error loading image ${this.image_index}:`, error);
      // If we can't load the image, we may have reached the end
      this.currentState = AppState.IDLE;
      this.showingSheet = false;
      this.clearIntervals();
      this.showInstructions(session);
    }
  }

  private setBitmap(session: TpaSession): void {
    try {
      const currentSong = this.getCurrentSong();
      const imagePath = path.join(__dirname, `${currentSong.name}/${this.image_index}.bmp`);
      const imageBuffer = fs.readFileSync(imagePath);
      this.imageBase64 = imageBuffer.toString('base64');
      session.layouts.showBitmapView(this.imageBase64);
      
      console.log(`Showing ${currentSong.name} sheet ${this.image_index}`);
    } catch (error) {
      console.error(`Error loading image ${this.image_index}:`, error);
      // If we've gone too far forward, go back one
      if (this.image_index > 0) {
        this.image_index--;
        console.log(`Reached end, reverting to image ${this.image_index}`);
      }
    }
  }

  private startSheetInterval(session: TpaSession): void {
    if (this.isPaused) return;
    
    this.clearIntervals();
    const currentSong = this.getCurrentSong();
    
    // Set up interval to advance sheet music
    this.sheetInterval = setInterval(() => {
      if (!this.isPaused && this.showingSheet) {
        this.image_index++;
        this.loadAndDisplaySheet(session);
      }
    }, currentSong.intervalMs);
  }

  private pauseSheet(session: TpaSession): void {
    if (this.currentState === AppState.PLAYING_SHEET && !this.isPaused) {
      this.isPaused = true;
      if (this.sheetInterval) {
        clearInterval(this.sheetInterval);
        this.sheetInterval = null;
      }
    }
  }

  private resumeSheet(session: TpaSession): void {
    if (this.currentState === AppState.PLAYING_SHEET && this.isPaused) {
      this.isPaused = false;
      this.startSheetInterval(session);
    }
  }

  private exitToMain(session: TpaSession): void {
    this.currentState = AppState.IDLE;
    this.showingSheet = false;
    this.clearBitmap(session);
    this.showInstructions(session);
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
      
      
      // Mode switching with semicolon (;)
      if (keyPress.startsWith(';')) {
        if (this.appMode === AppMode.AUTO) {
          this.appMode = AppMode.MANUAL;
          console.log('Switched to MANUAL mode');
          
          // In manual mode, clear the interval
          this.clearIntervals();
        } else {
          this.appMode = AppMode.AUTO;
          console.log('Switched to AUTO mode');
          
          // In auto mode, restart the interval
          this.startSheetInterval(session);
        }
        return;
      }

      // Handle square bracket inputs
      if (keyPress.startsWith(']') || keyPress.startsWith('[')) {
        const isForward = keyPress.startsWith(']');
        
        if (this.appMode === AppMode.MANUAL) {
          // In manual mode: directly change image_index
          if (isForward) {
            console.log('Advancing forward (manual mode)');
            this.image_index++;
            this.setBitmap(session);
          } else {
            console.log('Going backward (manual mode)');
            if (this.image_index > 0) {
              this.image_index--;
              this.setBitmap(session);
            }
          }
        } else {
          // In auto mode: skip forward or pause temporarily
          if (isForward) {
            console.log('Skipping forward (auto mode)');
            this.image_index++;
          } else {
            console.log('Pausing briefly (auto mode)');
            // Temporarily pause for half the interval time
            if (this.sheetInterval) {
              clearInterval(this.sheetInterval);
              const pauseTime = this.getCurrentSong().intervalMs / 2;
              
              setTimeout(() => {
                if (this.appMode === AppMode.AUTO && this.showingSheet && !this.isPaused) {
                  this.startSheetInterval(session);
                }
              }, pauseTime);
            }
          }
        }
      }
      
      // Allow Ctrl+C to exit
      if (keyPress === '\u0003') {
        process.exit();
      }
    });

    console.log('Input listener set up. Press "]" to advance, "[" to go back, ";" to switch modes, or Ctrl+C to exit.');
  }

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Set up keyboard input listener
    this.setupInputListener(session);
    
    // Show welcome message on startup
    this.clearBitmap(session);
    setTimeout(() => {
      this.showInstructions(session);
      console.log("Showing instructions")
    }, 4000);
    
    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {
        if (data.isFinal) {
          // console.log('Final transcription:', data.text);
          return; // skip, we already processed it
        }
        
        let command = data.text.toLowerCase().trim();
        console.log('Transcription:', command);
        
        // Process voice commands
        if (command.includes("show help")) {
          console.log("Showing help");
          this.showInstructions(session);
        }
        if (command.includes("clear bitmap")) {
          console.log("Clearing bitmap");
          this.clearBitmap(session);
        }
        else if (command.includes("show catalog")) {
          console.log("Showing catalog");
          this.showCatalog(session);
        }
        else if (command.includes("next")) {
          this.nextCatalogItem(session);
        }
        else if (command.includes("previous")) {
          this.previousCatalogItem(session);
        }
        else if (command.includes("select")) {
          console.log("Selecting song");
          this.selectSong(session);
        }
        else if (command.includes("pause") || command.includes("stop")) {
          this.pauseSheet(session);
        }
        else if (command.includes("start") && !command.includes("restart")) { // don't trigger on restart
          this.isPaused = false;
          this.startSheetInterval(session);
        }
        else if (command.includes("reset")){
          this.isPaused = true;
          this.image_index = 0;
          this.loadAndDisplaySheet(session);
        }
        else if (command.includes("resume")) {
          this.resumeSheet(session);
        }
        else if (command.includes("exit")) {
          this.isPaused = true; // so that next time we start it starts paused
          this.exitToMain(session);
        }
        
        // // If we're in IDLE state, show transcription
        // if (this.currentState === AppState.IDLE && !this.showingSheet) {
        //   session.layouts.showTextWall(data.text, {
        //     durationMs: 1000
        //   });
        // }
      }),
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