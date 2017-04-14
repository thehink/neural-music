import cluster from 'cluster';
import fs from 'fs';
import express from 'express';
import MidiConvert from 'midiconvert';

import TextToTone from '../shared/utils/TextToTone';
import marioText from '../shared/midi_mario.txt';

import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';

import Trainer from './Trainer';

if (cluster.isMaster) {
  let app = express();

  let root = protobuf.parse(proto);

  let currentBatch = {};

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
      id: '',
      notes: notes
    };

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

  cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', batch => {
      currentBatch = batch;
    });
  }
}else{
  let trainer = new Trainer({
    batch_size: 10,
  });
  console.log('worker');
  trainer.train(batch => {
    process.send({ batch });
  });
}


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
