import { midiToPitch } from 'neural/shared/utils/TextToTone';

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

export default class Note{
  constructor(note){
    this.pitch = note.pitch;
    this.duration = note.duration;
    this.time = note.time;

    let name = midiToPitch(note.pitch).replace('#', 's');
    this.color = COLORS[name.slice(0, name.length - 1)];
  }

  draw(context, time){
    let width = this.duration * this.player.pixelsPerSecond,
        offsetLeft = this.player.canvasWidth / 2 + (this.time - time) * this.player.pixelsPerSecond;

    if(offsetLeft > this.player.canvasWidth - 100 || offsetLeft + width < 0){
      if(offsetLeft + width < 0){
        this.remove();
      }

      return;
    }

    context.beginPath();

    if(time - this.time > 0 && time - this.time < this.duration){
      context.fillStyle = "black";
    }else{
      context.fillStyle = this.color;
    }

    context.fillRect(offsetLeft, (this.pitch - this.player.minNote) * this.player.noteHeight, width-1, this.player.noteHeight);
  }

  remove(){
    this._remove = true;
  }
}
