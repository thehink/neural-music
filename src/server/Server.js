import express from 'express';
import path from 'path';
import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';
import TextToTone from '../shared/utils/TextToTone';

const Root = protobuf.parse(proto);
const ResponseMessage = Root.root.lookupType("nm.Response");
const SampleMessage = Root.root.lookupType("nm.Sample");

export default class Server{
  constructor(){
    this.app = express();

    this.onMessage = this.onMessage.bind(this);

    this.root = protobuf.parse(proto);

    this.chunkCache = {};

    this.chunks = [];

    this.currentId = 0;
    this.currentBatch = {};
    this.firstBatch = {};
    this.prevNotes = [];

    // respond with "hello world" when a GET request is made to the homepage
    this.app.use(express.static('public'));

    this.app.get('/api/chunk', (req, res) => {
      res.set('Content-Type', 'application/protobuf');
      let responseBuffer = this.fetchChunkResponse(parseInt(req.query.chunk));
      res.header("Content-Length", responseBuffer.length);
      res.end(responseBuffer);
    });

    this.app.listen(4000, function () {
      console.log('Web server listening on port 4000');
    });
  }

  fetchChunkResponse(chunkId){
    let chunk;

    if(!chunkId){
      chunk = this.chunks[this.chunks.length - 3]; //default chunk, delay by 2
    }else{
      chunk = this.chunks.find(chunk => chunk.id === chunkId)
    }

    if(!chunk){
      return this.buildResponseBuffer(null, 1, 'could not fetch chunk!');
    }

    return chunk.buffer;
  }

  buildResponseBuffer(sample, status = 0, message = ''){
    let payload = {
      status: status,
      message: message,
      sample: sample,
    };

    var message = ResponseMessage.fromObject(payload);
    var buffer = ResponseMessage.encode(message).finish();

    return buffer;
  }

  addChunk(chunk){
    this.chunks.push(chunk);

    if(this.chunks.length >= 100){
      this.chunks.splice(0, 1);
    }
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

    let buffer = this.buildResponseBuffer(payload);

    //cache response buffer
    payload.buffer = buffer;

    this.addChunk(payload);
  }
}
