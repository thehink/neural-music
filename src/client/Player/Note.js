import { midiToPitch } from 'neural/shared/utils/TextToTone';

import Block from './Block';

const COLORS = {
  'C': '#4e61d8',
  'Cs': '#8064c6',
  'D': '#a542b1',
  'Ds': '#ed3883',
  'E': '#f75839',
  'F': '#f7943d',
  'Fs': '#f6be37',
  'G': '#d1c12e',
  'Gs': '#95c631',
  'A': '#4bb250',
  'As': '#45b5a1',
  'B': '#4598b6'
}

export default class Note extends Block{
  constructor(note){
    super(note);
    this.pitch = note.pitch;
    this.duration = note.duration;
    this.time = note.time;

    let name = midiToPitch(note.pitch).replace('#', 's');
    this.color = COLORS[name.slice(0, name.length - 1)];
    this.noteColor = this.color;
  }

  update(){
    super.update();

    this.width = this.duration * this.player.pixelsPerSecond;

    if(this.player.playTime - this.time > 0 && this.player.playTime - this.time < this.duration){
      this.color = "black";
    }else{
      this.color = this.noteColor;
    }

    this.height = this.player.noteHeight;
    this.offsetTop = (this.player.maxNote - this.pitch) * this.player.noteHeight;
  }
}
