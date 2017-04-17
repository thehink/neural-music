import {
  Neuron,
  Layer,
  Network,
  Trainer,
  Architect
} from 'synaptic';
import { merge, uniq } from 'lodash';

import { ticksToTime, timeToTicks } from '../shared/utils/TextToTone';

import marioText from '../shared/midi_mario.txt';

function softmax(arr) {
  return arr.map(function(value,index) {
    return Math.exp(value) / arr.map( function(y /*value*/){ return Math.exp(y) } ).reduce( function(a,b){ return a+b })
  })
}

const randf = function(a, b) { return Math.random()*(b-a)+a; }

const samplei = function(w) {
  // sample argmax from w, assuming w are
  // probabilities that sum to one
  var r = randf(0,1);
  var x = 0.0;
  var i = 0;
  while(true) {
    x += w[i];
    if(x > r) { return i; }
    i++;
  }
  return w.length - 1; // pretty sure we should never get here?
}

export default class SynapticTrainer{
  constructor(options){
    this.options = merge({

    }, options);

    this.letterToIndex = {};
    this.indexToLetter = {};
    this.trainingSets = [];
    this.trainingSet = [];

    this.batchId = 0;

    this.numCharacters = 0;

    this.lastCharacter = ' ';
  }

  initVocab(text){
    this.trainingSet = [];
    this.trainingSets = [];

    let trainingSet = [];

    let characters = uniq(text);
    this.numCharacters = characters.length;

    for(let i in characters){
      this.letterToIndex[characters[i]] = i;
      this.indexToLetter[i] = characters[i];
    }

    console.log('corpus length', text.length);
    console.log('characters', this.numCharacters);

    let sents = text.split(' ');

    let step = 2;
    let maxLen = 8;

    for(let i = 0; i < sents.length - maxLen; i += step){
      let txt = sents.slice(i, i + maxLen).join(' ');
      let trainingSet = [];

      for(let i = 0; i < txt.length-1; ++i){
        let character = txt[i];
        let nextCharacter = txt[i + 1];
        let input = Array(this.numCharacters).fill(0);
        let output = Array(this.numCharacters).fill(0);

        input[this.letterToIndex[character]] = 1;
        output[this.letterToIndex[nextCharacter]] = 1;

        trainingSet.push({
          input: input,
          output: output
        });
      }
      this.trainingSets.push(trainingSet);
    }

  }

  init(){
    this.LSTM = new Architect.LSTM(this.numCharacters, 60, this.numCharacters);
  }

  saveModel(){

  }

  loadModel(){

  }

  predictCharacter(){
    let input = Array(this.numCharacters).fill(0);
    input[this.letterToIndex[this.lastCharacter]] = 1;
    let predictions = this.LSTM.activate(input);
    let sm = softmax(predictions);
    let ix = samplei(sm);
    this.lastCharacter = this.indexToLetter[ix];
    return this.lastCharacter;
  }

  generateNextBatch(ticks){
    let numTicks = 0;
    let text = '';
    let time = Date.now();

    console.log('generating batch...');

    let iterations = 0;

    while(numTicks < ticks){
      let predictCharacter = this.predictCharacter();
      if(predictCharacter === ' '){
        numTicks++;
      }

      text += predictCharacter;
      iterations++;
    }

    console.log(text);

    console.log('generated batch!', Date.now() - time, 'ms', 'length', text.length, 'iterations', iterations);

    return {
      time: Date.now() - time,
      perplexity: 0,
      epoch: 0,
      id: this.batchId++,
      text: text
    };
  }

  train(callback){
    this.initVocab(marioText);
    this.init();

    let time = Date.now();
    let passedTime = 0;

    //seconds
    let batchInterval = 10;

    let iteration = 0;

    while(true){
      let trainingSet = this.trainingSets[iteration % this.trainingSets.length];
      this.LSTM.trainer.train(trainingSet, {
        rate: [0.01],
        iterations: 1,
        error: .05,
        shuffle: false,
        log: 100,
        cost: Trainer.cost.CROSS_ENTROPY,
        schedule: {
          every: 1, // repeat this task every 500 iterations
          do: (data) => {
            let delta = Date.now() - time;
            time = Date.now();
            passedTime += delta;

            if(passedTime/1000 > batchInterval){
              let batch = this.generateNextBatch(timeToTicks(batchInterval));
              callback(batch);

              passedTime = batch.time;
            }

            console.log("error", data.error, "iterations", data.iterations, "rate", data.rate);
          }
        }
      });

      console.log('iteration', iteration++, 'epoch', (this.iteration / this.trainingSets.length).toFixed(2));
    }
  }
}
