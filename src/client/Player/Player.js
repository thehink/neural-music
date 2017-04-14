

export default class Player{

  constructor(context){
    this.notes = [];
    this.context = context;
  }

  update(){
    for(let i = 0; i < this.notes.length; ++i){
      this.notes[i].draw(this.context);
    }
  }

}
