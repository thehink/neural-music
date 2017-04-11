require('dotenv').config();
const {
  Network,
  Architect,
  Layer,
  Trainer
} = require('synaptic');

const fs = require("fs");
const MidiConvert = require('MidiConvert');
const BitArray = require('node-bitarray');
const _ = require('lodash');

function BitField32(nSize) {
    var nNumbers = Math.ceil(nSize/32) | 0;
    this.values = new Uint32Array(nNumbers);
}

BitField32.prototype.get = function(i) {
    var index = (i / 32) | 0;
    var bit = i % 32;
    return (this.values[index] & (1 << bit)) !== 0;
};

BitField32.prototype.set = function(i) {
    var index = (i / 32) | 0;
    var bit = i % 32;
    this.values[index] |= 1 << bit;
};

BitField32.prototype.unset = function(i) {
    var index = (i / 32) | 0;
    var bit = i % 32;
    this.values[index] &= ~(1 << bit);
};

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function readFiles(dirname, onFileContent, onReadAll, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }

    let read = 0;

    filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, function(err, content) {
        if (err) {
          onError(err);
          return;
        }
        onFileContent(filename, content);

        if(++read == filenames.length){
          onReadAll();
        }

      });
    });
  });
}

const trainSetLength = 3 + 64;
const trainingStartData = [...Array(trainSetLength)].map(()=>0);
const trainingSet = [];

function UnNormalizeEvent(arr){
  let probs = arr.slice(3, trainSetLength);
  let maxMod = 1 / Math.max.apply( Math, probs );
  probs = probs.map(x => Math.round(x * maxMod));

  return {
    time: arr[0] * 10,
    duration: arr[1] * 10,
    velocity: arr[2] * 1,
    midiBits: probs
  }
}

function NormalizeEvent(event){
  return [
    event.time / 10, //type
    event.duration / 10, //subtype
    event.velocity / 1, //channel
    ...event.midiBits.__bits
  ];
}

var highest = {
}

function checkHighest(event){
  for(var key in event){

    if(typeof event[key] == "object"){
      continue;
    }

    if(!highest[key + '_max']){
      highest[key + '_max'] = 0;
      highest[key + '_min'] = event[key];
    }

    if(event[key] > highest[key + '_max']){
      highest[key + '_max'] = event[key];
    }

    if(event[key] < highest[key + '_min']){
      highest[key + '_min'] = event[key];
    }
  }
}

function generateSong(iterations){
  var events = [];
  var lastEvent = LSTM.activate(trainingStartData);
  for(var i = 0; i < 500; ++i){
    var newEvent = LSTM.activate(lastEvent);
    events.push(newEvent);
    lastEvent = newEvent;
  }

  generateSongFromNotes(iterations, events);
}

function generateSongFromNotes(name, notes, normalize){
  let midi = MidiConvert.create();
  let track = midi.track().patch(6);

  timeOffset = 0;
  for(let i = 0; i < notes.length; ++i){
    let note = normalize ? notes[i] : UnNormalizeEvent(notes[i]);

    timeOffset += note.time;

    for(let j = 0; j < note.midiBits.length; ++j){
      if(note.midiBits[j] == 1){
        track.note(unNormalizeNote(j), timeOffset, note.duration, note.velocity);
      }
    }
  }

  fs.writeFileSync(`./generated_data/test_${name}.mid`, midi.encode(), 'binary');
}

const LSTM = new Architect.LSTM(trainSetLength, 3, trainSetLength);

let lastIter = trainingStartData;
let noteItems = [];

let startNote = 36;
let normalizeNote = n => n - startNote;
let unNormalizeNote = n => n + startNote;

function OnReadFile(filename, content){
  let midiConvert = MidiConvert.parse(content.toString('binary'), {});

  midiConvert.bpm = 120;

  let PPQ = midiConvert.header.PPQ;

  const ticksPerSecond = midiConvert.header.PPQ / (60 / midiConvert.header.bpm);
  const ticksPerSecond2 = 480 / (60 / 120);
  const delta = ticksPerSecond / ticksPerSecond2;

  //console.log(ticksPerSecond, ticksPerSecond2, ticksPerSecond / ticksPerSecond2);

  //let notes = [];
  var notes = [];
  for(let i = 0; i < midiConvert.tracks.length; ++i){
    var track = midiConvert.tracks[i];
    if(track.notes && track.notes.length > 0){

      for(let j = 0; j < track.notes.length; j++){
        if(track.notes[j].midi < startNote){
          continue;
        }

        //track.notes[j].time *= delta;
        //track.notes[j].duration *= delta;

        track.notes[j].midiBits = new BitArray().fill(64);
        track.notes[j].midiBits.set(normalizeNote(track.notes[j].midi), 1);

        notes.push(track.notes[j]);

        //notes.push(track.notes[j]);
      }
    }
  }

  notes.sort((a, b) => {
    return Math.sign(a.time - b.time);
  });

  const noteSequence = [];

  let lastNote;
  for(let i = 0; i < notes.length; ++i){
    let note = notes[i];

    if(lastNote && lastNote.time == note.time){
      lastNote.midiBits.set(normalizeNote(note.midi), 1);
      continue;
    }

    lastNote = note;

    noteSequence.push(note);
  }

  let deltaTime = noteSequence[0].time;
  for(let i = 0; i < noteSequence.length; ++i){
    let note = noteSequence[i];
    if(note.time - deltaTime > 10){
      console.log('warn time delta too high', note.time - deltaTime, note.name, note.time);
    }

    note.time -= deltaTime;
    deltaTime += note.time;

    checkHighest(note);
  }

  let trainingData = [];

  for(let i = 0; i < noteSequence.length - 1; ++i){
    trainingSet.push({
      input: NormalizeEvent(noteSequence[i]),
      output: NormalizeEvent(noteSequence[i + 1])
    });
  }

  //generateSongFromNotes(`music_testtest`, trainingData.map(d => d.input));

  //trainingSet.push(trainingData);
}

function OnReadFilesDones(){
  console.log('read all files');
  console.log(highest);

  let iterations = 0;
  let index = 0;
  let learningRate = 0.01;

  let result = trainingSet[0].input;
  let notes = [];

  let trackIndex = 0;
  let prevError = 0;

  console.log('start training...', trainingSet.length);
  LSTM.trainer.train(trainingSet, {
    rate: learningRate,
    iterations: 99999999,
    error: .05,
    shuffle: true,
    log: 100,
    cost: Trainer.cost.CROSS_ENTROPY,
    schedule: {
      every: 1, // repeat this task every 500 iterations
      do: function(data) {

        console.log("error", data.error, "iterations", data.iterations, "rate", data.rate, 'diff', data.error - prevError);
        prevError = data.error;

        result = LSTM.activate(result);
        notes.push(result);

        if(data.iterations % 50 == 0){
          console.log('generating music', data.iterations);
          generateSongFromNotes(`music_${data.iterations}`, notes);
          notes = [];
        }
      }
    }
  });

  return;

  while(iterations++ < 100){

    for (let j, x, i = trainingSet.length; i; j = Math.floor(Math.random() * i), x = trainingSet[--i], trainingSet[i] = trainingSet[j], trainingSet[j] = x);

    for(let i = 0; i < trainingSet.length; ++i){
      let data = trainingSet[i];
      LSTM.activate(data.input);
      LSTM.propagate(learningRate, data.output);
    }

    if(iterations % 1 == 0){
      console.log('iterations', iterations);

      result = LSTM.activate(result);
      notes.push(result);

    }
  }

  generateSongFromNotes("music", notes);
/*
  let results = LSTM.trainer.train(trainingSet, {
    rate: .1,
  	iterations: 20,
  	error: .0005,
  	shuffle: true,
  	log: 100,
  	cost: Trainer.cost.MSE,
    schedule: {
    	every: 1, // repeat this task every 500 iterations
    	do: function(data) {
    		// custom log

        //console.log(UnNormalizeEvent(startsong));
        lastIter = LSTM.activate(lastIter);
        noteItems.push(lastIter);

        if(noteItems.length >= 500){
          //generateSong(data.iterations);
          generateSongFromNotes(data.iterations, noteItems);
          noteItems = [];
          lastIter = trainingStartData;
        }

        if(data.iterations % 50 == 0){
          console.log("error", data.error, "iterations", data.iterations, "rate", data.rate);
        }

    		if (1==2)
    			return true; // abort/stop training
    	}
    }
  });*/
}

readFiles('./training_data/', OnReadFile, OnReadFilesDones, console.log);




//console.log(LSTM.activate([1, 0]));
