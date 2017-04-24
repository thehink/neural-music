import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';
import settings from '../shared/settings';

import StartAudioContext from 'startaudiocontext';

import Player from './Player';
import Modal from './Modal';

const Root = protobuf.parse(proto);
const ResponseMessage = Root.root.lookupType("nm.Response");
const SampleMessage = Root.root.lookupType("nm.Sample");

export default class App{
  constructor(){
    this.player = new Player();

    this.player.on('playback', this.onPlayback.bind(this));

    document.getElementById('logo').addEventListener('click', this.player.togglePause);

    this.modal = new Modal();

    this.perplexity = 0;
    this.epoch = 0;
    this.chunkId;
    this.nextChunkId = 0;
    this.fetching = false;
    this.lastFetch = 0;

    this.checkAudioContext();
  }

  async checkAudioContext(){
    await StartAudioContext(this.player.tone, '#play-button');

    console.log('AudioContext started');
    this.modal.setText('Loading chunk...');
    this.modal.setLoading(true);
    this.loadNextBatch();
  }

  async onPlayback(currentTime, totalTime){

    //load new chunk when 10 seconds left
    if(totalTime - currentTime < 10){
      this.loadNextBatch();
    }
  }

  async handleMessage(response){

    const {
      status,
      message,
      sample
    } = response;

    if(status === 1){
      this.modal.setText(message);
      setTimeout(this.loadNextBatch.bind(this), 4000);
      console.log('error', message);
      return;
    }

    let chunk = sample;

    if(chunk.id !== this.chunkId){
      this.chunkId = chunk.id;
      this.player.addBatch(chunk);
    }else{
      console.log('discarding chunk:', chunk.id);
    }

    this.nextChunkId = this.chunkId + 1;

    if(!this.player.isPlaying){
      this.player.play();
    }

    if(!this.modal.isHidden){
      this.modal.hide();
    }
  }

  async loadNextBatch(){
    if(this.fetching || Date.now() - this.lastFetch < 2 * 1000){
      return;
    }

    this.fetching = true;
    this.lastFetch  = Date.now();

    let response = await fetch(`/api/chunk?chunk=${this.nextChunkId || ''}`, {
      method: 'get'
    });

    let responseBuffer = await response.arrayBuffer();

    this.fetching = false;

    if(response.status !== 200){
      this.modal.setText(`${response.status} ${response.statusText}, retrying...`);
      console.log('error', 'status', response.status, response.statusText);
      return;
    }

    let message = ResponseMessage.decode(new Uint8Array(responseBuffer));

    this.handleMessage(message);
  }

  dispose(){
    this.player.dispose();
    this.modal.dispose();
  }
}
