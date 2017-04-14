import { merge } from 'lodash';

import marioText from '../shared/midi_mario.txt';

import { ticksToTime, timeToTicks } from '../shared/utils/TextToTone';

import R from '../../lib/recurrent.js';
import fs from 'fs';

export default class Trainer{

  constructor(options){
    this.options = merge({
      generator: 'lstm',
      hidden_sizes: [128, 128],
      letter_size: 5,
      regc: 0.000001,
      learning_rate: 0.01,
      clipval: 5.0,
      sample_softmax_temperature: 1.0,
      max_chars_gen: 100,
      batch_size: 10,
    }, options);

    this.currentBatch = {
      epoch: 0,
      perplexity: 0,
      id: '',
      text: ''
    };

    this.tick_iter = 0;
    this.epoch_size = -1;
    this.input_size = -1;
    this.output_size = -1;
    this.letterToIndex = {};
    this.indexToLetter = {};
    this.vocab = [];
    this.data_sents = [];
    this.solver = new R.Solver(); // should be class because it needs memory for step caches

    this.prev = {};
    this.last_char = 0;

    this.model = {};
  }

  initVocab(sents, count_threshold){
    // go over all characters and keep track of all unique ones seen
    var txt = sents.join(''); // concat all

    // count up all characters
    var d = {};
    for(var i=0,n=txt.length;i<n;i++) {
      var txti = txt[i];
      if(txti in d) { d[txti] += 1; }
      else { d[txti] = 1; }
    }

    // filter by count threshold and create pointers
    this.letterToIndex = {};
    this.indexToLetter = {};
    this.vocab = [];
    // NOTE: start at one because we will have START and END tokens!
    // that is, START token will be index 0 in model letter vectors
    // and END token will be index 0 in the next character softmax
    var q = 1;
    for(let ch in d) {
      if(d.hasOwnProperty(ch)) {
        if(d[ch] >= count_threshold) {
          // add character to this.vocab
          this.letterToIndex[ch] = q;
          this.indexToLetter[q] = ch;
          this.vocab.push(ch);
          q++;
        }
      }
    }

    // globals written: indexToLetter, letterToIndex, this.vocab (list), and:
    this.input_size = this.vocab.length + 1;
    this.output_size = this.vocab.length + 1;
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

    this.tick_iter = 0;

    // process the input, filter out blanks
    var data_sents_raw = [];

    let maxlen = 40
    let step = 3
    let sentences = []
    let next_chars = []

    console.log('characters: ', text.length);
    for (let i = 0; i < text.length - maxlen; i += step){
      let sss = '';
      for(let j = 0; j < maxlen; ++j){
        sss += text[i + j];
      }
      data_sents_raw.push(sss)
    }

    this.data_sents = [];
    for(var i = 0; i < data_sents_raw.length; i++) {
      var sent = data_sents_raw[i].trim();
      if(sent.length > 0) {
        this.data_sents.push(sent);
      }
    }

    this.initVocab(this.data_sents, 1); // takes count threshold for characters
    this.model = this.initModel();
  }

  saveModel(){
    let out = {
      hidden_sizes: this.options.hidden_sizes,
      generator: this.options.generator,
      letter_size: this.options.letter_size,
      letterToIndex: this.letterToIndex,
      indexToLetter: this.indexToLetter,
      vocab: this.vocab,
    };

    let model_out = {};
    for(let k in model) {
      if(model.hasOwnProperty(k)) {
        model_out[k] = model[k].toJSON();
      }
    }
    out.model = model_out;
    return JSON.stringify(out);
  }

  loadModel(){
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

    this.tick_iter = 0;
    this.solver = new R.Solver(); // have to reinit the solver since model changed
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

    if(ix == 0){
      return '';
    }

    this.last_char = ix;
    return this.indexToLetter[ix];
  }

  costFun(model, sent){
    // takes a model and a sentence and
    // calculates the loss. Also returns the Graph
    // object which can be used to do backprop
    var n = sent.length;
    var G = new R.Graph();
    var log2ppl = 0.0;
    var cost = 0.0;
    var prev = {};
    for(var i=-1; i < n; i++) {
      // start and end tokens are zeros
      var ix_source = i === -1 ? 0 : this.letterToIndex[sent[i]]; // first step: start with START token
      var ix_target = i === n-1 ? 0 : this.letterToIndex[sent[i+1]]; // last step: end with END token

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

  generateNextBatch(ticks){

  }

  train(){
    this.reInit(marioText);
    while(true){
      this.tick();
    }
  }

  tick(){
      // sample sentence fromd data
      var sentix = R.randi(0, this.data_sents.length);
      var sent = this.data_sents[sentix];

      var t0 = +new Date();  // log start timestamp

      // evaluate cost function on a sentence
      var cost_struct = this.costFun(this.model, sent);

      // use built up graph to compute backprop (set .dw fields in mats)
      cost_struct.G.backward();
      // perform param update
      var solver_stats = this.solver.step(this.model, this.options.learning_rate, this.options.regc, this.options.clipval);
      //$("#gradclip").text('grad clipped ratio: ' + solver_stats.ratio_clipped)

      var t1 = +new Date();
      var tick_time = t1 - t0;

      // evaluate now and then
      this.tick_iter += 1;
      if(this.tick_iter % 100 === 0) {
        // draw samples

        let text = '';
        for (let i = 0; i < 400; ++i){
          text += this.predictCharacter(this.model, 1.0);
        }
        console.log(text);
      }
      if(this.tick_iter % 500 === 0) {
        // draw argmax prediction
        //var pred = predictSentence(model, 400, false);
        //console.log('argmax', pred)
        console.log(' ');
        console.log('epoch', (this.tick_iter/this.epoch_size).toFixed(2));
        console.log('perplexity', cost_struct.ppl.toFixed(2));
        console.log('forw/bwd time per example', tick_time.toFixed(1) + 'ms');
        console.log(' ');
      }
  }
}
