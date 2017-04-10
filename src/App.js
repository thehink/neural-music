
import NoteBoard from './NoteBoard';

export default class App{
  constructor(){

    let noteBoardEl = document.querySelector('#note_board');

    this.noteBoard = new NoteBoard(noteBoardEl);
  }
}
