import { merge, uniq } from 'lodash';

import crypto from 'crypto';

import { ticksToTime, timeToTicks } from '../shared/utils/TextToTone';

import R from '../../lib/recurrent.js';
import fs from 'fs';
import fsp from 'fs-promise';

const Avg = arr => {
  let sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

export default class Trainer{

  constructor(options){
    this.options = merge({
      generator: 'lstm',
      hidden_sizes: [412, 412, 412],
      letter_size: 34,
      regc: 0.000001,
      learning_rate: 0.001,
      clipval: 5.0,
      sample_softmax_temperature: 1.0,
      max_chars_gen: 100,
      batch_size: 10,
      refresh_batch: 5,
      smooth_eps: 1e-08,
      decay_rate: 0.999
    }, options);

    this.currentBatch = {
      epoch: 0,
      perplexity: 0,
      id: '',
      text: ''
    };

    this.trainingDataPath = './training_data/midi_8.txt';
    this.modelPath = './weights/midi_8_model.json';

    this.tick_iter = 0;
    this.epoch_size = -1;
    this.input_size = -1;
    this.output_size = -1;
    this.letterToIndex = {};
    this.indexToLetter = {};
    this.vocab = [];
    this.data_sents = [];
    this.solver = new R.Solver(); // should be class because it needs memory for step caches

    this.batchId = 0;
    this.perplexity = 0;
    this.cost = 0;
    this.costs = [];

    this.prev = {};
    this.last_char = 0;

    this.model = {};
  }

  initVocab(sents, count_threshold){
    // go over all characters and keep track of all unique ones seen
    var txt = sents.join(''); // concat all

    this.letterToIndex = {};
    this.indexToLetter = {};
    this.vocab = [];

    let characters = uniq(txt);
    this.numCharacters = characters.length;

    for(let i in characters){
      this.letterToIndex[characters[i]] = i;
      this.indexToLetter[i] = characters[i];
      this.vocab.push(characters[i]);
    }

    // globals written: indexToLetter, letterToIndex, this.vocab (list), and:
    this.letter_size = this.vocab.length;
    this.input_size = this.vocab.length;
    this.output_size = this.vocab.length;
    this.epoch_size = sents.length;
    console.log('found ' + this.vocab.length + ' distinct characters: ' + this.vocab.join(''));
  }

  addToModel(modelfrom){
    for(var k in modelfrom) {
      if(modelfrom.hasOwnProperty(k)) {
        // copy over the pointer but change the key to use the append
        this.model[k] = modelfrom[k];
      }
    }
  }

  initModel(){
    this.model = {};
    this.model['Wil'] = new R.RandMat(this.input_size, this.options.letter_size , 0, 0.08);

    if(this.options.generator === 'rnn') {
      var rnn = R.initRNN(this.options.letter_size, this.options.hidden_sizes, this.output_size);
      this.addToModel(rnn);
    } else {
      var lstm = R.initLSTM(this.options.letter_size, this.options.hidden_sizes, this.output_size);
      this.addToModel(lstm);
    }

    return this.model;
  }

  reInit(text){
    this.solver = new R.Solver(); // reinit solver
    this.solver.decay_rate = this.options.decay_rate;
    this.solver.smooth_eps = this.options.smooth_eps;

    this.tick_iter = 0;

    // process the input, filter out blanks
    var data_sents_raw = [];

    let maxlen = 40
    let step = 40
    let sentences = []
    let next_chars = []

    console.log('characters: ', text.length);

    /*
    let pieces = text.split(' ');

    for(let i = 0; i < pieces.length - maxlen; i += step){
    let txt = pieces.slice(i, i + maxlen).join(' ');
    this.data_sents.push(txt);
  }*/


  for (let i = 0; i < text.length - maxlen; i += step){
    let sss = text.slice(i, i + maxlen);
    this.data_sents.push(sss);
  }

  console.log('txt chunks', this.data_sents.length);

  this.initVocab(this.data_sents, 1); // takes count threshold for characters
  this.model = this.initModel();
}

async saveModel(){
  let modelData = this.getModelJson();
  fs.writeFileSync(this.modelPath, JSON.stringify(modelData), 'utf-8');
  console.log("weights saved!", this.modelPath);
}

getModelJson(){
  let out = {
    hidden_sizes: this.options.hidden_sizes,
    generator: this.options.generator,
    letter_size: this.options.letter_size,
    letterToIndex: this.letterToIndex,
    indexToLetter: this.indexToLetter,
    vocab: this.vocab,
    iteration: this.tick_iter,
    epoch_size: this.epoch_size
  };

  let model_out = {};
  for(let k in this.model) {
    if(this.model.hasOwnProperty(k)) {
      model_out[k] = this.model[k].toJSON();
    }
  }
  out.model = model_out;

  return out;
}

loadModel(j){
  this.options.hidden_sizes = j.hidden_sizes;
  this.options.generator = j.generator;
  this.options.letter_size = j.letter_size;
  this.model = {};
  for(var k in j.model) {
    if(j.model.hasOwnProperty(k)) {
      var matjson = j.model[k];
      this.model[k] = new R.Mat(1,1);
      this.model[k].fromJSON(matjson);
    }
  }
  this.letterToIndex = j['letterToIndex'];
  this.indexToLetter = j['indexToLetter'];
  this.vocab = j['vocab'];

  this.tick_iter = j.iteration;
  this.epoch_size = j.epoch_size;

  this.solver = new R.Solver(); // have to reinit the solver since model changed

  console.log('model loaded!');
}

forwardIndex(G, model, ix, prev){
  var x = G.rowPluck(model['Wil'], ix);
  // forward prop the sequence learner
  if(this.options.generator === 'rnn') {
    var out_struct = R.forwardRNN(G, model, this.options.hidden_sizes, x, prev);
  } else {
    var out_struct = R.forwardLSTM(G, model, this.options.hidden_sizes, x, prev);
  }
  return out_struct;
}

predictCharacter(model, temperature = 1.0){
  var G = new R.Graph(false);
  var ix = this.last_char;
  var lh = this.forwardIndex(G, model, ix, this.prev);
  this.prev = lh;
  let logprobs = lh.o;

  if(temperature !== 1.0) {
    for(var q=0, nq=logprobs.w.length; q<nq; q++) {
      logprobs.w[q] /= temperature;
    }
  }

  let probs = R.softmax(logprobs);
  ix = R.samplei(probs.w);

  this.last_char = ix;
  return this.indexToLetter[ix];
}

costFun(model, sent){
  //sent += ' ';
  // takes a model and a sentence and
  // calculates the loss. Also returns the Graph
  // object which can be used to do backprop
  var n = sent.length;
  var G = new R.Graph();
  var log2ppl = 0.0;
  var cost = 0.0;
  var prev = {};
  for(var i = 0; i < n - 1; i++) {
    // start and end tokens are zeros
    var ix_source = this.letterToIndex[sent[i]]; // first step: start with START token
    var ix_target = this.letterToIndex[sent[i + 1]]; // last step: end with END token

    let lh = this.forwardIndex(G, model, ix_source, prev);
    prev = lh;

    // set gradients into logprobabilities
    let logprobs = lh.o; // interpret output as logprobs
    let probs = R.softmax(logprobs); // compute the softmax probabilities

    log2ppl += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
    cost += -Math.log(probs.w[ix_target]);

    // write gradients into log probabilities
    logprobs.dw = probs.w;
    logprobs.dw[ix_target] -= 1;
  }
  var ppl = Math.pow(2, log2ppl / (n - 1));
  return {'G':G, 'ppl':ppl, 'cost':cost};
}

median(values){
  values.sort( function(a,b) {return a - b;} );
  var half = Math.floor(values.length/2);
  if(values.length % 2) return values[half];
  else return (values[half-1] + values[half]) / 2.0;
}

async generateChunkFromModel(ticks){
  return fsp.readJson(this.modelPath)
  .then(model => {
    this.loadModel(model);
    return this.generateNextChunk(ticks);
  }).catch(err => {
    console.log(err);
  });
}

async generateNextChunk(ticks){
  let numTicks = 0;
  let text = '';
  console.log('generating chunk...');
  let time = Date.now();
  while(numTicks < ticks){
    let predictCharacter = this.predictCharacter(this.model, 1.0);
    if(predictCharacter === ' '){
      numTicks++;
    }

    text += predictCharacter;
  }

  console.log('generated chunk!', Date.now() - time, 'ms', 'epoch', (this.tick_iter/this.epoch_size).toFixed(2), 'perplexity', this.perplexity.toFixed(2));

  return {
    time: Date.now() - time,
    perplexity: this.perplexity,
    epoch: this.tick_iter/this.epoch_size,
    id: this.batchId++,
    text: text
  };
}

async trainLoop(callback){
  let it = 1;
  let time = Date.now();
  let passedTime = 0;
  let id = 1;
  let avgTime = 2000;
  let avgsTimes = [];
  let lastTime = Date.now();

  //max delay (ms) on chunks before skipping
  let targetMarginThreshold = 120 * 1000;

  while(true){
    let delta = Date.now() - time;
    passedTime += delta;

    let targetTime = time + it * this.options.refresh_batch * 1000;

    if(Date.now() >= targetTime - avgTime){
      let chunk = await this.generateNextChunk(timeToTicks(this.options.batch_size));
      callback(chunk);

      /*
      this.saveModel();
      console.log('Request chunk...', 'iteration', this.tick_iter, 'epoch', (this.tick_iter/this.epoch_size).toFixed(2), 'perplexity', this.perplexity.toFixed(2));
      callback({
      //model: this.getModelJson(),
      ticks: timeToTicks(this.options.batch_size),
    });*/

    let targetMargin = targetTime - Date.now();

    console.log('chunkTime', chunk.time, 'avgTime', avgTime.toFixed(2), 'targetMargin', targetMargin, 'lastTime', Date.now() - lastTime, 'iteration', this.tick_iter);

    avgsTimes.push(chunk.time);

    if(avgsTimes.length >= 5){
      avgsTimes.splice(0, 1);
    }

    lastTime = Date.now();
    avgTime = Avg(avgsTimes);

    //skip chunks if we lag behind threshold
    if(targetMargin < -targetMarginThreshold){
      it -= targetMargin / (this.options.refresh_batch * 1000);
    }

    it++;
  }

  let datenow = Date.now();
  await this.tick();
  //console.log('iteration', this.tick_iter, 'time', Date.now() - datenow, 'ms', 'cost', this.cost.toFixed(2));

  if(this.tick_iter % 1000 === 0){
    await this.saveModel();
  }
}
}

async train(callback){
  console.log('reading training data...');

  const reflect = promise => promise.then(
    content => {return {content, resolved: true} },
    error => { return {error, resolved: false} }
  );

  let model = await reflect(fsp.readJson(this.modelPath));
  let trainingData = await reflect(fsp.readFile(this.trainingDataPath, {encoding:'utf8'}));

  if(!trainingData.resolved){
    console.log('could not find training data!', );
    return;
  }

  this.reInit(trainingData.content);

  if(!model.resolved){
    console.log('could not find model');
  }else{
    this.loadModel(model.content);
  }

  this.trainLoop(callback);
}

async tick(){
  // sample sentence fromd data
  var sentix = R.randi(0, this.data_sents.length);
  var sent = this.data_sents[this.tick_iter % this.data_sents.length];

  var t2 = Date.now();  // log start timestamp
  // evaluate cost function on a sentence
  var cost_struct = this.costFun(this.model, sent);
  var t2c = Date.now() - t2;


  var t3 = Date.now();  // log start timestamp
  // use built up graph to compute backprop (set .dw fields in mats)
  cost_struct.G.backward();
  var t3c = Date.now() - t3;

  var t0 = +new Date();  // log start timestamp
  // perform param update
  var solver_stats = this.solver.step(this.model, this.options.learning_rate, this.options.regc, this.options.clipval);

  var t1 = +new Date();
  var tick_time = t1 - t0;
  console.log('step', tick_time, 'ms', 'cost', t2c, 'backprop', t3c, 'total', Date.now() - t2);

  // evaluate now and then
  this.tick_iter += 1;
  this.perplexity = cost_struct.ppl;

  this.costs.push(cost_struct.cost);

  this.cost = Avg(this.costs);

  if(this.costs.length >= 10){
    this.costs.splice(0, 1);
  }
}
}
