require('dotenv').config();
const {
  Network,
  Architect,
  Layer,
  Trainer
} = require('synaptic');

const fs = require("fs");
const MidiConvert = require('MidiConvert');
const BitArray = require('node-bitarray')

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
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

const trainSetLength = 3 + 8;
const trainingStartData = [...Array(trainSetLength)].map(()=>0);
const trainingSet = [];

function UnNormalizeEvent(arr){
  return {
    time: arr[0] * 10,
    duration: arr[1] * 50,
    velocity: arr[2] * 1,
    midi: BitArray.toNumber(arr.slice(3, 11).map(Math.round))
  }
}

function NormalizeEvent(event){
  return [
    event.time / 10, //type
    event.duration / 50, //subtype
    event.velocity / 1, //channel
    ...event.midiBits
  ];
}

var highest = {
}

function checkHighest(event){
  for(var key in event){
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
  let track = midi.track();

  timeOffset = 0;
  for(let i = 0; i < notes.length; ++i){
    let note = normalize ? notes[i] : UnNormalizeEvent(notes[i]);
    timeOffset += note.time;
    track.note(note.midi, timeOffset, note.duration, note.velocity);
  }

  fs.writeFileSync(`./generated_data/test_${name}.mid`, midi.encode(), 'binary');
}

const LSTM = new Architect.LSTM(trainSetLength, 3, trainSetLength);

let lastIter = trainingStartData;
let noteItems = [];

function OnReadFile(filename, content){
  let midiConvert = MidiConvert.parse(content.toString('binary'), {});
  //let notes = [];
  let tracks = [];
  for(let i = 0; i < midiConvert.tracks.length; ++i){
    var notes = [];

    var track = midiConvert.tracks[i];
    if(track.notes && track.notes.length > 0){

      for(let j = 0; j < track.notes.length; j++){

        track.notes[j].midiBits = BitArray.octet(BitArray.fromNumber(track.notes[j].midi).__bits);

        notes.push(track.notes[j]);

        //notes.push(track.notes[j]);
      }

      tracks.push(notes);
    }
  }

  for(let j = 0; j < tracks.length; j++){
    var notes = tracks[j];

    var trainingData = [];

    notes.sort((a, b) => {
      return Math.sign(a.time - b.time);
    });

    let deltaTime = notes[0].time;

    for(let i = 0; i < notes.length; ++i){
       notes[i].time -= deltaTime;
       deltaTime += notes[i].time;
     }

    for(let i = 0; i < notes.length - 1; ++i){
      trainingData.push({
        input: NormalizeEvent(notes[i]),
        output: NormalizeEvent(notes[i + 1])
      });
      checkHighest(notes[i]);
    }

    trainingSet.push(trainingData);
  }

  //console.log(trainingSet);

  //generateSongFromNotes("test", notes, true);
}

function OnReadFilesDones(){
  console.log('read all files');
  console.log(highest);

  let iterations = 0;
  let index = 0;
  let learningRate = 0.1;

  let result = trainingSet[0][0].input;
  let notes = [];

  let trackIndex = 0;

  while(true){


    for(let i = 0; i < trainingSet.length; ++i){
      var trackData = trainingSet[i];
      LSTM.trainer.train(trackData, {
        rate: .1,
        iterations: 10,
        error: .0005,
        shuffle: true,
        log: 100,
        cost: Trainer.cost.MSE,
        schedule: {
          every: 9, // repeat this task every 500 iterations
          do: function(data) {
            console.log("error", data.error, "iterations", data.iterations, "rate", data.rate, iterations);
          }
        }
      });

      result = LSTM.activate(result);
      notes.push(result);

      iterations++;
      if(iterations % 500 == 0){
        console.log('generating music', iterations);
        generateSongFromNotes(`music_${iterations}`, notes);
        notes = [];
      }

    }
  }

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
