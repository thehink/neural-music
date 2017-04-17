import { merge } from 'lodash';

export default class Block{
  constructor(options){
    merge(this, {
      //seconds
      time: 0,

      //hex color
      color: 'black',

      //width in pixels
      width: 2,

      //height in pixels
      height: 2,

      //offset offsetTop
      offsetTop: 0,
    }, options);


  }

  shouldRender(){
    let offsetLeft = this.player.canvasWidth / 2 + (this.time - this.player.playTime) * this.player.pixelsPerSecond;

    if(offsetLeft > this.player.canvasWidth || offsetLeft + this.width < 0){
      return false;
    }

    return true;
  }

  update(){
    this.offsetLeft = this.player.canvasWidth / 2 + (this.time - this.player.playTime) * this.player.pixelsPerSecond;

    if(this.offsetLeft + this.width < 0){
      this.remove();
    }
  }

  draw(context){
    context.beginPath();
    context.fillStyle = this.color;
    context.fillRect(this.offsetLeft, this.offsetTop, this.width, this.height);
  }

  remove(){
    this._remove = true;
  }
}
