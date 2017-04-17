import EventEmitter from 'neural/shared/utils/EventEmitter';

export default class Scroll extends EventEmitter{

  constructor(context){
    super();

    //contains items that will scroll
    this.blocks = [];

    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvasWidth = 0;
    this.canvasHeight = 0;

    this.pixelsPerSecond = 100;
    this.iteration = 0;
    this.avgFps = 0;
    this.avgDelta = 0;
    this.lastRender = Date.now();
    this.playTime = 0;
    this.time = 0.5;

    window.addEventListener("resize", this.resize.bind(this));
    this.resize();

    this.render();
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

  addBlock(block){
    block.scroll = this;
    this.blocks.push(note);
  }

  renderBlocks(){
    for(let i = this.blocks.length - 1; i > -1; i--){
      if(this.blocks[i]._remove){
        this.blocks.splice(i, 1);
        continue;
      }
      this.blocks[i].draw(this.context, this.playTime);
    }
  }

  render(){
    let time = Date.now();
    let delta = time - this.lastRender;
    this.lastRender = time;

    //calculate avg fps
    if(++this.iteration % 10 === 0){
      this.avgFps = Math.round(1000 / this.avgDelta);
      this.avgDelta = 0;
    }

    this.avgDelta += delta/10;

    //clear canvas
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.context.fillStyle = "black";
    this.context.font = '40px serif';
    this.context.fillText(`FPS: ${this.avgFps}`, 10, 50);

    //draw blocks
    this.renderBlocks();

    this.emit('render');

    window.requestAnimationFrame(this.render.bind(this));
  }

  dispose(){
    Tone.Transport.cancel();
  }

}
