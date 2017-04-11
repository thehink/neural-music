
import NoteBoard from './NoteBoard';

import protobufjs from 'protobufjs';

import Tone from 'tone';

import TextToTone from '../shared/utils/TextToTone';

import proto from '../shared/protos/notes.proto';
import marioText from '../shared/midi_mario.txt';

export default class App{
  constructor(){
    var synth = new Tone.PolySynth(8, Tone.Synth).toMaster();
    synth.set("volume", -6);

    let tones = TextToTone(marioText);

    for(let i = 0; i < tones.length; ++i){
      let note = tones[i];
      //synth.triggerAttackRelease(note.name, note.duration, note.time, 1.0);
    }

    let noteBoardEl = document.querySelector('#note_board');

    this.noteBoard = new NoteBoard(noteBoardEl);
  }
}
