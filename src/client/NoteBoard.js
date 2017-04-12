
import { midiToPitch } from '../shared/utils/TextToTone';

export default class NoteBoard{

  constructor(el){
    this.el = el;
    this.lines = [];
    this.notes = [];
    this.timePixel = 100;
    this.timeWidth = 10; //100% of screen is 5 seconds
    this.time = 0;

    this.numDiffNotes = 50;
    this.maxPitch = 88;

    this.render();
  }

  render(){
    this.el.innerHTML = '';
    this.lines = [...Array(this.numDiffNotes)].map((note, i) => {
      return this.el.appendChild(this.renderNote(this.maxPitch - i - 1));
    });
  }

  renderThing(time, duration){
    let thingEl = document.createElement('div');
    thingEl.className = 'thing';

    return thingEl;
  }

  addNote(note, time, duration){
    let el = this.renderThing();

    let noteItem = {
      time: note.time,
      duration: note.duration,
      el: el
    };

    this.updateNote(noteItem);
    this.notes.push(noteItem);
    // console.log(note.pitch, midiToPitch(note.pitch));
    this.lines[this.maxPitch - 1 - note.pitch].querySelector('.line').appendChild(el);
  }

  updateNote(note){

    if(note.time <= this.time){
      note.el.classList.add('active');
    }

    note.el.style.left = `${  (note.time - this.time) * this.timePixel }px`;
    note.el.style.width = `${ this.timePixel * note.duration }px`;
  }

  updateNotes(time){
    this.time = time;

    for(let i = this.notes.length - 1; i > -1; i--){
      let note = this.notes[i];
      if(note.time + note.duration + 1 < this.time){
        //remove note from screen
        note.el.remove();
        this.notes.splice(i, 1);
        return;
      }

      this.updateNote(note);
    }
  }

  renderNote(pitch){
    let noteEl = document.createElement('div');
    noteEl.className = 'note';

    let noteNameEl = document.createElement('div');
    noteNameEl.className = 'name';
    //noteNameEl.innerText = midiToPitch(pitch);

    let noteLineEl = document.createElement('div');
    noteLineEl.className = 'line';

    for(let i = 1; i < 4; ++i){
      //noteLineEl.appendChild(this.renderThing(Math.random() * i * 100, Math.random() * 10));
    }

    //noteEl.appendChild(noteNameEl);
    noteEl.appendChild(noteLineEl);

    return noteEl;
  }
}
