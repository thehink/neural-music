
export default class NoteBoard{

  notes = [];

  constructor(el){
    this.el = el;

    this.render();
  }

  render(){
    this.el.innerHTML = '';
    [...Array(40)].forEach(note => {
      this.el.appendChild(this.renderNote(note));
    });
  }

  renderThing(pos, width){
    let thingEl = document.createElement('div');
    thingEl.className = 'thing';

    thingEl.style.left = `${pos}%`;
    thingEl.style.width = `${width}%`;

    return thingEl;
  }

  renderNote(){
    let noteEl = document.createElement('div');
    noteEl.className = 'note';

    let noteNameEl = document.createElement('div');
    noteNameEl.className = 'name';
    noteNameEl.innerText = 'A';

    let noteLineEl = document.createElement('div');
    noteLineEl.className = 'line';

    for(let i = 1; i < 4; ++i){
      noteLineEl.appendChild(this.renderThing(Math.random() * i * 100, Math.random() * 10));
    }

    noteEl.appendChild(noteNameEl);
    noteEl.appendChild(noteLineEl);

    return noteEl;
  }
}
