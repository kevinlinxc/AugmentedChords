# AugmentedChords

Idea: play sheet music in Augmented Reality. 

This allows the pianist to not have to turn pages, and more importantly,
allows them to see the music and their hands at the same time, which is an unavoidable problem with traditional sheet music.

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


https://stackoverflow.com/questions/51399121/how-to-save-int16array-buffer-to-wav-file-node-js

## Final brain dump:

`bun install`

Pitch Perfect:
`bun run index-pp.ts` to run pitch detection. It's flaky, sometimes randomly stops. Pitch code is in `tuner.ts`.


Sheet music:
Run `python python-scripts/musicxml_to_bitmaps.py` to convert megalovania.mxl into bitmaps. 

This can be swapped for any other musicxml file, you just have to change the folder in `index.ts`, but you might need to adjust parameters
so that the width is good.

`bun run index.ts` to run sheet music. Sending `[` and `]` to the terminal, with enter (which can be done with foot pedals) will 
scroll through the measures. 

Full setup instructions so I don't forget:
- Set up `ngrok` so that my localhost is mirrored at a public URL. 
- Set that public url with `/webhook` appended on [AugmentOS dashboard](https://augmentos.dev/). 
- Run AugmentOS app on Android, connected to the smart glasses.
- Run `bun run index.ts` to start the backend of the app.
- Select the app on AugmentOS, the glasses should now be streaming data.

Data flow (I think):
Sensors from glasses -> AugmentOS app -> Mentra servers -> my ngrok/bun backend.
Bun backend -> Mentra servers -> AugmentOS app -> glasses display.

