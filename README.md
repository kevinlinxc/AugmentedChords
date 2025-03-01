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

Install lilypond


python -m music21.configure