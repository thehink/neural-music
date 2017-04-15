import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';
import settings from '../shared/settings';

import StartAudioContext from 'startaudiocontext';

import Player from './Player/';

let root = protobuf.parse(proto);
let SamplesMessage = root.root.lookupType("nm.Sample");

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
    this.batchId = '';
    this.fetching = false;

    this.loadNextBatch();
    //setInterval(this.loadNextBatch.bind(this), (settings.refresh_time) * 1000);
    //document.getElementById('logo').addEventListener('touchend', this.player.togglePause);
  }

  onPlayback(currentTime, totalTime){
    if(totalTime - currentTime < 8){
      console.log('load more data...');
      this.loadNextBatch();
    }
  }

  loadNextBatch(){

    if(this.fetching){
      return;
    }

    this.fetching = true;

    fetch(`/api/batch?current=${this.batchId}`, {
      method: 'get'
    }).then(response => {
      return response.arrayBuffer();
    }).then(buf => {
      var message = SamplesMessage.decode(new Uint8Array(buf));
      if(message.id !== this.batchId){
        this.batchId = message.id;
        this.player.addNotes(message.notes);
      }else{
        console.log('discarding batch:', message.id);
      }
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
