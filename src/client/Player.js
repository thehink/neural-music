import Tone from 'tone';

import { midiToPitch } from '../shared/utils/TextToTone';

import NoteBoard from './NoteBoard';

export default class Player{
  constructor(){
    this.context = Tone.context;
    Tone.Transport.bpm.value = 120;
    this.synth = new Tone.PolySynth(8, Tone.SimpleSynth).set({
			"volume" : -8,
			"oscillator" : {
				"type" : "sine6"
			},
			"envelope" : {
				"attack" :  0.015,
				"decay" :  0.25,
				"sustain" :  0.08,
				"release" :  0.5,
			}
		}).toMaster();
    this.synth.stealVoices = true;

    this.time = 0.1;

    this.iteration = 0;

    let noteBoardEl = document.querySelector('#note_board');
    this.noteBoard = new NoteBoard(noteBoardEl);

    this.togglePause = this.togglePause.bind(this);

    this.update();
  }

  update(){
    if(this.iteration++ % 100 === 0){
      //console.log(Tone.Transport.state + ' | ' + Tone.Transport.seconds);
    }

    this.noteBoard.updateNotes(Tone.Transport.seconds);
    window.requestAnimationFrame(this.update.bind(this));
  }

  play(){
    Tone.Transport.start(Tone.Transport.now() + 0.3);
  }

  togglePause(){
    if(Tone.Transport.state === 'started'){
      this.pause();
    }else{
      this.play();
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

    let asfasf = new Tone.Part((time, note) => {
      //use the events to play the synth
      this.synth.triggerAttackRelease(midiToPitch(note.pitch), note.duration, time, 0.5)

    }, notes).start();

  }
}
