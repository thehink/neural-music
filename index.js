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

function get_bits(value){
        var base2_ = (value).toString(2).split("").reverse().join("");
        var baseL_ = new Array(8 - base2_.length).join("0");
        var base2 = base2_ + baseL_;
        return base2;
    }

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
  var standalone = LSTM.standalone();

  var events = [ standalone(trainingStartData) ];
  for(var i = 0; i < 1000; ++i){
    var result = standalone(events[i]);
    events.push(result);
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
  let notes = [];
  for(let i = 0; i < midiConvert.tracks.length; ++i){
    var track = midiConvert.tracks[i];
    if(track.notes){
      for(let j = 0; j < track.notes.length; ++j){

        track.notes[j].midiBits = BitArray.octet(BitArray.fromNumber(track.notes[j].midi).__bits);

        notes.push(track.notes[j]);
      }
    }
  }

  notes.sort((a, b) => {
    return Math.sign(a.time - b.time);
  });

  let deltaTime = notes[0].time;

  for(let i = 0; i < notes.length; ++i){
     notes[i].time -= deltaTime;
     deltaTime += notes[i].time;
   }

  trainingSet.push({
    input: trainingStartData,
    output: NormalizeEvent(notes[0]),
  });

  for(let i = 0; i < notes.length - 1; ++i){
    UnNormalizeEvent(NormalizeEvent(notes[i]));
    trainingSet.push({
      input: NormalizeEvent(notes[i]),
      output: NormalizeEvent(notes[i + 1])
    });

    checkHighest(notes[i]);
  }

  //generateSongFromNotes("test", notes, true);
}

function OnReadFilesDones(){
  console.log('read all files');
  console.log(highest);

  let results = LSTM.trainer.train(trainingSet, {
    rate: .1,
  	iterations: 200000000,
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
  });
}

readFiles('./training_data/', OnReadFile, OnReadFilesDones, console.log);




//console.log(LSTM.activate([1, 0]));
