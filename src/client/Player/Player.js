import Tone from 'tone';
import Note from './Note';

import { midiToPitch } from 'neural/shared/utils/TextToTone';

export default class Player{

  constructor(context){
    this.notes = [];
    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvasWidth = 0;
    this.canvasHeight = 0;

    this.pixelsPerSecond = 100;
    this.minNote = 35;
    this.maxNote = 88;

    this.noteHeight = 0;

    this.time = 0;

    this.tone = Tone.context;
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

    this.togglePause = this.togglePause.bind(this);

    window.addEventListener("resize", this.resize.bind(this));
    this.resize();
    this.update();
  }

  resize(){
    this.canvasWidth = this.canvas.offsetWidth;
		this.canvasHeight = this.canvas.offsetHeight;
		this.context.canvas.width = this.canvasWidth;
		this.context.canvas.height = this.canvasHeight;
    this.noteHeight = this.canvasHeight / (this.maxNote - this.minNote);
  }

  togglePause(){
    if(Tone.Transport.state === 'started'){
      this.pause();
    }else{
      this.play();
    }
  }

  play(){
    Tone.Transport.start(Tone.Transport.now() + 0.3);
  }

  pause(){
    Tone.Transport.pause();
  }

  removeNote(note){
    let index = this.notes.indexOf(note);
    if(index > -1){
      this.notes.splice(index, 1);
    }
  }

  addNote(note){
    note = new Note(note);
    note.player = this;
    this.notes.push(note);
  }

  addNotes(notes){
    for(let i = 0; i < notes.length; ++i){
      let note = notes[i];
      note.time = this.time += note.delta;
      this.addNote(note);
    }

    let asfasf = new Tone.Part((time, note) => {
      //use the events to play the synth
      this.synth.triggerAttackRelease(midiToPitch(note.pitch), note.duration, time, 0.5)

    }, notes).start();
  }

  update(){
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    for(let i = 0; i < this.notes.length; ++i){
      this.notes[i].draw(this.context, Tone.Transport.seconds);
    }

    window.requestAnimationFrame(this.update.bind(this));
  }

  dispose(){

  }

}
