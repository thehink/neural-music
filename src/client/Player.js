import { midiToPitch } from '../shared/utils/TextToTone';

export default class Player{
  constructor(){
    this.synth = new Tone.PolySynth(8, Tone.Synth).toMaster();
    this.synth.set("volume", -6);

    this.time = 0;
  }

  play(){

  }

  pause(){

  }

  addNotes(notes){
    for(let i = 0; i < notes.length; ++i){
      let note = notes[i];
      this.time += note.delta;
      synth.triggerAttackRelease(midiToPitch(note.pitch), note.duration, this.time, 1.0);
    }
  }
}
