import {
  Neuron,
  Layer,
  Network,
  Trainer,
  Architect
} from 'synaptic';
import { merge } from 'lodash';

import marioText from '../shared/midi_mario.txt';

export default class SynapticTrainer{
  constructor(options){
    this.options = merge({

    }, options);

    this.letterToIndex = {};
    this.indexToLetter = {};
  }

  init(){

  }

  train(callback){

  }
}
