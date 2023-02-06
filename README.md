MIDI-driven audio-visual piece.
Complex moire patterns emerge from interaction of multiple concentric circles, one for each played note.

# How to run

0. Install `pnpm` package manager.

1. Run the MIDI server:

```
cd server/
npm run
```

A new virtual MIDI device "Virtual MIDI In VISUAL" will be created.
You'll want to send your MIDI notes to it, e.g. from your DAW, or with MIDI Pipe or similar software.

2. Run the web page:

```
npm run dev
```
