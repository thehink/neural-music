
import NoteBoard from './NoteBoard';

import protobuf from 'protobufjs';

import Tone from 'tone';
import proto from '../shared/protos/notes.proto';

import { midiToPitch } from '../shared/utils/TextToTone';

let root = protobuf.parse(proto);
let SamplesMessage = root.root.lookupType("nm.Sample");

export default class App{
  constructor(){


    let noteBoardEl = document.querySelector('#note_board');

    this.noteBoard = new NoteBoard(noteBoardEl);

    this.loadSongTest();
  }

  playMelody(notes){
    var synth = new Tone.PolySynth(8, Tone.Synth).toMaster();
    synth.set("volume", -6);

    let time = 0;
    for(let i = 0; i < notes.length; ++i){
      let note = notes[i];
      time += note.delta;
      synth.triggerAttackRelease(midiToPitch(note.pitch), note.duration, time, 1.0);
    }
  }

  loadSongTest(){
    fetch('/api/proto', {
    	method: 'get'
    }).then(response => {
      return response.arrayBuffer();
    }).then(buf => {
       var message = SamplesMessage.decode(new Uint8Array(buf));
       console.log('message', message);
       this.playMelody(message.notes);
    }).catch(err => {
    	// Error :(
    	console.log(err);
    });
  }
}
