import fs from 'fs';
import express from 'express';
import MidiConvert from 'MidiConvert';

import TextToTone from '../shared/utils/TextToTone';
import marioText from '../shared/midi_mario.txt';

import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';

let app = express();

let root = protobuf.parse(proto);

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  let notes = TextToTone(marioText);
  res.json(notes);
});

app.get('/api/proto', function (req, res) {
  let notes = TextToTone(marioText);

  let payload = {
    perplexity: 0.4,
    epoch: 1,
    notes: notes
  };


  // res.writeHead(200, {
  //     'Content-Type': mimetype,
  //     'Content-Length': data.length
  // });
  // res.end(new Buffer(data, 'binary'));

  var SamplesMessage = root.root.lookupType("nm.Sample");
  var message = SamplesMessage.fromObject(payload);
  var buffer = SamplesMessage.encode(message).finish();

  res.set('Content-Type', 'application/protobuf');
  res.header("Content-Length", buffer.length);

  res.end(buffer);
});

app.listen(4000, function () {
  console.log('Web server listening on port 4000');
});

// let midi = MidiConvert.create();
// let track = midi.track().patch(2);
//
// let notes = TextToTone(marioText);
// for(let i = 0; i < notes.length; ++i){
//   let note = notes[i];
//   track.note(note.pitch, note.time, note.duration, 1);
// }
//
// fs.writeFileSync(`./generated_data/test.mid`, midi.encode(), 'binary');
