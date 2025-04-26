# AugmentedChords
Music-related augmented reality apps for smart glasses using [AugmentOS](https://augmentos.dev/)

This repo looks like a tornado blew through it because it was a hackathon project, here's the important files:

`index.ts` - main file for the sheet music app, its Typescript, uses AugmentOS's SDK to communicate with Mentra servers
which talk to the mobile app which talks to your (Even Realities G1) glasses. 
`index.ts` is basically just a bit of UI/UX sugar to interact with the glasses, and then it serves the sheet music bitmaps generated 
with the below scripts.

`python-scripts/musicxml_to_bitmaps.py` - converts musicxml files to optimized bitmaps through a series of steps. These bitmaps
are made to be shown in the glasses with index.ts.
The steps:
- render musicxml to png using Music21/MuseScore
- crop the png to remove whitespace
- dilate with certain kernels to avoid losing stems or staff lines in the final image
- resize to be much smaller to be able to send to the glasses
- optimize with imagemagick to be 1-bit bitmaps

`python-scripts/manual_pngs_to_bitmaps.py` - for Sparkle, I didn't have a musicxml file, so I took screenshots of the sheet music,
and this script converts them to the same kind of bitmaps as above.

`tuner.ts` - main file for the separate pitch detection app, I never got the algorithm to be very good but it's a start

## Brain dump to remind myself how to run this:

`bun install`

Pitch Perfect:
`bun run index-pp.ts` to run pitch detection. It's flaky, sometimes randomly stops. Pitch code is in `tuner.ts`.


Sheet music:
Run `python python-scripts/musicxml_to_bitmaps.py` to convert any mxl file into bitmaps. 

-`bun run index.ts` to run sheet music.
- The help menu will show you the available commands, "show help" to see it again
- "Show catalog" to show songs, "next", "previous" and "select" to navigate
- In a song, `;` switches between manual and automatic mode
- In manual mode, `[` and `]` to scroll left and right
- In automatic mode, `[` and `]` pause a bit or speed up a bit in the automatic scrolling
- "Exit" to exit anytime
- "Reset" goes back to measure 0

AugmentOS app instructions:
- Set up `ngrok` so that my localhost is mirrored at a public URL. 
- Set that public url for my app on the [AugmentOS dashboard](https://augmentos.dev/). 
- Run AugmentOS app on Android, connected to the smart glasses.
- Run `bun run index.ts` to start the backend of the app.
- Select the app on AugmentOS, the glasses should now be streaming data.


## Hackathon notes:

Idea: play sheet music in Augmented Reality. 

This allows the pianist to not have to turn pages, and more importantly,
allows them to see the music and their hands at the same time, which is an unavoidable problem with traditional sheet music.

Data flow:
Sensors from glasses -> AugmentOS app -> Mentra servers -> my ngrok/bun backend.
Bun backend -> Mentra servers -> AugmentOS app -> glasses display.

## Breaking down the problem

- Acquire MusicXML files (done) https://drive.google.com/drive/u/0/folders/1N3EFjHxVN6YJOWStqVwjW4yXXgBsdoNi
- Learn to display a single note in AR
- Learn to display a measure in AR
- Learn to translate a measure in AR for scrolling mode (keeps scrolling right to left while playing)
- Alternatively, we display one line at a time and it fades into the next, or we show two at a time and it translates
up when the first line is done.

- Detect when to scroll by listening to audio and detecting where the user is (this might be hard)
- Detect a different way, e.g. foot pedals. 

## Logbook
https://stackoverflow.com/questions/49939275/python-music21-library-create-png-from-stream

Install lilypond - ignore, using musescore to convert to png instead because lilypond had errors


python -m music21.configure


Final pipeline from musicxml to bitmaps:
`python-scripts/musicxml_to_bitmaps.py`
musicxml -> muse21 to output png -> crop big gaps, resize and invert using opencv -> convert to bitmap
-> use imagemagick via os.system to convert to 1-bit bitmap/make it smaller -> read with readFileSync in js
