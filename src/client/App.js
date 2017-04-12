import protobuf from 'protobufjs';
import proto from '../shared/protos/notes.proto';

import Player from './Player';

let root = protobuf.parse(proto);
let SamplesMessage = root.root.lookupType("nm.Sample");

export default class App{
  constructor(){
    this.player = new Player();
    this.loadSongTest();
    document.getElementById('logo').addEventListener('click', this.player.togglePause)
  }

  loadSongTest(){
    fetch('/api/proto', {
      method: 'get'
    }).then(response => {
      return response.arrayBuffer();
    }).then(buf => {
      var message = SamplesMessage.decode(new Uint8Array(buf));
      this.player.addNotes(message.notes);

      this.player.play();
    }).catch(err => {
      // Error :(
      console.log(err);
    });
  }
}
