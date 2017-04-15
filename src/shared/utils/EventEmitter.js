//very simple event emitter

export default class EventEmitter{
  constructor(){
    this.listeners = {};
  }

  emit(action){
    if(!this.listeners[action]){
      return;
    }

    const args = [...arguments].slice(1,arguments.length);
    this.listeners[action].forEach(callback => {
      callback(...args);
    });

    const asd = 'on' + action.charAt(0).toUpperCase() + action.slice(1);

    if(this[asd]){
      this[asd](...args);
    }
  }

  on(action, callback){
    if(!this.listeners[action]){
      this.listeners[action] = [];
    }

    this.listeners[action].push(callback);
  }
}
