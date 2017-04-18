import express from 'express';
import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';
import TextToTone from '../shared/utils/TextToTone';

export default class Server{
  constructor(){
    this.app = express();

    this.onMessage = this.onMessage.bind(this);

    this.root = protobuf.parse(proto);

    this.currentId = 0;
    this.currentBatch = {};
    this.firstBatch = {};
    this.prevNotes = [];

    // respond with "hello world" when a GET request is made to the homepage
    this.app.get('/', function (req, res) {
      res.json({

      });
    });

    this.app.get('/api/batch', (req, res) => {
      if(!req.query.current){
        res.set('Content-Type', 'application/protobuf');
        res.header("Content-Length", this.firstBatch.length);
        res.end(this.firstBatch);
        return;
      }
      res.set('Content-Type', 'application/protobuf');
      res.header("Content-Length", this.currentBatch.length);
      res.end(this.currentBatch);
    });

    this.app.listen(4000, function () {
      console.log('Web server listening on port 4000');
    });
  }

  onMessage(batch){
    let notes = TextToTone(batch.text);

    this.currentId = batch.id;

    let payload = {
      perplexity: batch.perplexity,
      epoch: batch.epoch,
      id: batch.id,
      notes: notes
    };

    var SamplesMessage = this.root.root.lookupType("nm.Sample");
    var message = SamplesMessage.fromObject(payload);
    var buffer = SamplesMessage.encode(message).finish();

    this.currentBatch = buffer;

    payload.notes = this.prevNotes.concat(notes);
    var message = SamplesMessage.fromObject(payload);
    var buffer = SamplesMessage.encode(message).finish();
    this.firstBatch = buffer;
    this.prevNotes = notes;
  }
}
