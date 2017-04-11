import fs from 'fs';
import express from 'express';
import MidiConvert from 'MidiConvert';

import TextToTone from '../shared/utils/TextToTone';
import marioText from '../shared/midi_mario.txt';

let app = express();

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('hello world!!!')
});

app.listen(4000, function () {
  console.log('Web server listening on port 4000');
});

let midi = MidiConvert.create();
let track = midi.track().patch(2);

let notes = TextToTone(marioText);
for(let i = 0; i < notes.length; ++i){
  let note = notes[i];
  track.note(note.pitch, note.time, note.duration, 1);
}

fs.writeFileSync(`./generated_data/test.mid`, midi.encode(), 'binary');
