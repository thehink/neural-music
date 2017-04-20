
import './styles/modal.scss';
import './styles/spinner.scss';

export default class Modal{
  constructor(){
    this.el = document.createElement('div');
    this.el.className = 'modal-screen';

    this.isShowing = true;
    this.loading = false;

    document.body.appendChild(this.el);
    this.buildElement();
  }

  setLoading(loading = false){
    this.loading = loading;
    this.buildElement();
  }

  setText(){

  }

  show(){
    this.isHidden = false;
    this.el.classList.remove('hidden');
  }

  hide(){
    this.isHidden = true;
    this.el.classList.add('hidden');
  }

  buildElement(){
    this.el.innerHTML = '';

    let playWrapperEl = document.createElement('div');
    playWrapperEl.id = 'play-button';
    playWrapperEl.className = 'play-button-wrapper';

    if(this.loading){
      let spinner = document.createElement('div');
      spinner.className = 'loader';

      playWrapperEl.appendChild(spinner);
    }else{
      let playEl = document.createElement('div');
      playEl.className = 'play-button';

      playWrapperEl.appendChild(playEl);
    }

    this.el.appendChild(playWrapperEl);
  }

  show(){

  }

  onClickPlay(){

  }

  dispose(){
    this.el.remove();
  }
}
