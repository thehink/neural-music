import cluster from 'cluster';
import fs from 'fs';
import express from 'express';
import MidiConvert from 'midiconvert';

import TextToTone from '../shared/utils/TextToTone';
import marioText from '../shared/midi_mario.txt';

import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';

import settings from '../shared/settings';

import Trainer from './Trainer';
import SynapticTrainer from './SynapticTrainer';

if (cluster.isMaster) {
  let app = express();

  let root = protobuf.parse(proto);

  let currentId = 0;
  let currentBatch = {};
  let firstBatch = {};
  let prevNotes = [];

  // respond with "hello world" when a GET request is made to the homepage
  app.get('/', function (req, res) {
    let notes = TextToTone(marioText);
    res.json(notes);
  });

  app.get('/api/batch', (req, res) => {
    if(!req.query.current){
      res.set('Content-Type', 'application/protobuf');
      res.header("Content-Length", firstBatch.length);
      res.end(firstBatch);
      return;
    }
    res.set('Content-Type', 'application/protobuf');
    res.header("Content-Length", currentBatch.length);
    res.end(currentBatch);
  });

  app.listen(4000, function () {
    console.log('Web server listening on port 4000');
  });

  cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', batch => {
      let notes = TextToTone(batch.text);

      currentId = batch.id;

      let payload = {
        perplexity: batch.perplexity,
        epoch: batch.epoch,
        id: batch.id,
        notes: notes
      };

      var SamplesMessage = root.root.lookupType("nm.Sample");
      var message = SamplesMessage.fromObject(payload);
      var buffer = SamplesMessage.encode(message).finish();

      currentBatch = buffer;

      payload.notes = prevNotes.concat(notes);
      var message = SamplesMessage.fromObject(payload);
      var buffer = SamplesMessage.encode(message).finish();
      firstBatch = buffer;
      prevNotes = notes;
    });
  }
}else{

  let trainer = new Trainer({
    batch_size: settings.batch_size,
    refresh_batch: settings.refresh_batch
  });
  console.log('worker');
  trainer.train(batch => {
    process.send(batch);
  });

/*
 let trainer2 = new SynapticTrainer();
 trainer2.train(batch => {
   process.send(batch);
 });*/
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
