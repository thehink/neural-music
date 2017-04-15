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
    this.iteration = 0;
    this.avgFps = 0;
    this.avgDelta = 0;
    this.lastRender = Date.now();
    this.playTime = 0;

    this.noteHeight = 0;

    this.time = 0.5;

    this.tone = Tone.context;
    Tone.Transport.bpm.value = 120;

    Tone.Transport.latencyHint = 'interactive';

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
    //this.playTime = Tone.Transport.seconds;
    Tone.Transport.seconds = this.playTime;
    Tone.Transport.start();
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

      Tone.Transport.schedule(time => {
        this.synth.triggerAttackRelease(midiToPitch(note.pitch), note.duration, time, 0.5);
      }, note.time);
    }

    console.log('notes', (this.time - this.playTime).toFixed(2), this.notes.length);
  }

  update(){
    let time = Date.now();
    let delta = time - this.lastRender;
    this.lastRender = time;

    if(Tone.Transport.state === 'started'){
      this.playTime += delta/1000;
    }

    if(++this.iteration % 10 === 0){
      this.avgFps = Math.round(1000 / this.avgDelta);
      this.avgDelta = 0;
    }

    if(this.iteration % 200 === 0){
      //console.log('Delta', this.playTime - Tone.Transport.seconds);
    }

    this.avgDelta += delta/10;

    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.context.fillStyle = "black";
    this.context.font = '40px serif';
    this.context.fillText(`FPS: ${this.avgFps}`, 10, 50);

    for(let i = this.notes.length - 1; i > -1; i--){
      if(this.notes[i]._remove){
        this.notes.splice(i, 1);
        continue;
      }
      this.notes[i].draw(this.context, this.playTime);
    }

    window.requestAnimationFrame(this.update.bind(this));
  }

  dispose(){
    Tone.Transport.cancel();
  }

}
