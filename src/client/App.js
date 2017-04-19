import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';
import settings from '../shared/settings';

import StartAudioContext from 'startaudiocontext';

import Player from './Player/';

const Root = protobuf.parse(proto);
const ResponseMessage = Root.root.lookupType("nm.Response");
const SampleMessage = Root.root.lookupType("nm.Sample");

export default class App{
  constructor(){
    this.player = new Player();

    this.player.on('playback', this.onPlayback.bind(this));

    document.getElementById('logo').addEventListener('click', this.player.togglePause);

    StartAudioContext(this.player.tone, '#logo', function(){
    	console.log('AudioContext started');
    });

    this.perplexity = 0;
    this.epoch = 0;
    this.chunkId;
    this.nextChunkId = 0;
    this.fetching = false;
    this.lastFetch = 0;

    this.loadNextBatch();
    //setInterval(this.loadNextBatch.bind(this), (settings.refresh_time) * 1000);
    //document.getElementById('logo').addEventListener('touchend', this.player.togglePause);
  }

  onPlayback(currentTime, totalTime){
    if(totalTime - currentTime < 6){
      this.loadNextBatch();
    }
  }

  loadNextBatch(){

    if(this.fetching || Date.now() - this.lastFetch < 2 * 1000){
      return;
    }

    this.fetching = true;
    this.lastFetch  = Date.now();

    fetch(`/api/chunk?chunk=${this.nextChunkId || ''}`, {
      method: 'get'
    }).then(response => {
      return response.arrayBuffer();
    }).then(buf => {
      var message = ResponseMessage.decode(new Uint8Array(buf));

      if(message.status === 1){
        console.log('error', message.message);
        return;
      }

      let chunk = message.sample;

      if(chunk.id !== this.chunkId){
        this.chunkId = chunk.id;
        this.player.addBatch(chunk);
      }else{
        console.log('discarding chunk:', chunk.id);
      }

      this.nextChunkId = this.chunkId + 1;
      this.fetching = false;

    }).catch(err => {
      // Error :(
      console.log(err);
    });
  }

  dispose(){
    this.player.dispose();
  }
}
