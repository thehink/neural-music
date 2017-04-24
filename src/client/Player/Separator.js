import Block from './Block';

export default class Separator extends Block{
  constructor(options, batch){
    super(options);

    this.perplexity = batch.perplexity;
    this.epoch = batch.epoch;
    this.id = batch.id;
  }

  update(){
    super.update();
    this.height = this.player.canvasHeight;
  }

  draw(context){
    super.draw(context);

    context.fillStyle = "#0075bc";
    context.font = '15px monospace';
    context.fillText(`Chunk ${this.id}`, this.offsetLeft-45, 35);
    context.fillText(`Epoch ${this.epoch.toFixed(4)}`, this.offsetLeft-45, 50);
    context.fillText(`Perp  ${this.perplexity.toFixed(2)}`, this.offsetLeft-45, 65);
  }

  remove(){
    this._remove = true;
  }
}
