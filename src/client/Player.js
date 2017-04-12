import Tone from 'tone';

import { midiToPitch } from '../shared/utils/TextToTone';

import NoteBoard from './NoteBoard';

export default class Player{
  constructor(){
    Tone.Transport.bpm.value = 120;
    this.synth = new Tone.PolySynth(8, Tone.SimpleSynth).set({
			"volume" : -10,
			"oscillator" : {
				"type" : "sine6"
			},
			"envelope" : {
				"attack" :  0.015,
				"decay" :  0.25,
				"sustain" :  0.08,
				"release" :  0.5,
			},
		}).toMaster();
    this.synth.stealVoices = true;

    this.time = 1;

    let noteBoardEl = document.querySelector('#note_board');
    this.noteBoard = new NoteBoard(noteBoardEl);
  }

  update(){
    if(Math.round(100 * Tone.Transport.seconds) % 50 == 0){
      //console.log('state', Tone.Transport.state, 'seconds', Tone.Transport.seconds, 'ticks', Tone.Transport.ticks, 'latency', Tone.Transport);
    }

    this.noteBoard.updateNotes(Tone.Transport.seconds);
    window.requestAnimationFrame(this.update.bind(this));
  }

  play(){
    Tone.Transport.start();
    this.update();
  }

  togglePause(){
    if(Tone.Transport.state === 'started'){
      Tone.Transport.pause();
    }else{
      Tone.Transport.start();
    }
  }

  pause(){
    Tone.Transport.pause();
  }

  addNotes(notes){
    let minPitch = 9999;
    for(let i = 0; i < notes.length; ++i){
      let note = notes[i];
      note.time = this.time += note.delta;

      if(minPitch > note.pitch)
        minPitch = note.pitch;

      this.noteBoard.addNote(note);
    }

    new Tone.Part((time, note) => {
      //use the events to play the synth
      this.synth.triggerAttackRelease(midiToPitch(note.pitch), note.duration, time, note.velocity)

    }, notes).start();

  }
}
