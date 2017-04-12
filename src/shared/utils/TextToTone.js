const ASCII_OFFSET = 12;
const PITCH_OFFSET = 12;

const BPM = 120;
const PPQ = 8;

export const midiToPitch = (midi) => {
	const scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
	const octave = Math.floor(midi / 12) - 1;
	const note = midi % 12;
	return scaleIndexToNote[note] + octave;
}

function ticksToTime(ticks){
  return (60 / BPM) * (ticks / PPQ);
}

export default (text, precision) => {
  let sample = [];
  let timestep = 0;

  let activePitches = Array(88).fill(0);

  let ntt = text.split(' ');
      ntt.push('');
  let prevNotes = [];
  for(let timestep = 0; timestep < ntt.length - 1; timestep++){
    let notes = ntt[timestep].split('').map(e => e.charCodeAt(0) - ASCII_OFFSET + PITCH_OFFSET);
    let nextNotes = ntt[timestep + 1].split('').map(e => e.charCodeAt(0) - ASCII_OFFSET + PITCH_OFFSET);

    notes.forEach(e => activePitches[e] += 1);

    for(let j = 0; j < notes.length; ++j){
      let note = notes[j];
      if(nextNotes.indexOf(note) === -1){
        sample.push({
          name: midiToPitch(note),
          pitch: note,
          time: ticksToTime(timestep - activePitches[note] + 1),
          duration: ticksToTime(activePitches[note] + 1)
        });
        if(activePitches[note] > 1){
          //console.log(ticksToTime(activePitches[note]));
        }

        activePitches[note] = 0;
      }
    }

    prevNotes = notes;
  }

  sample.sort((a, b) => Math.sign(a.time - b.time));

  let lastTime = 0;
  for(let i = 0; i < sample.length; ++i){
    sample[i].delta = sample[i].time - lastTime;
    lastTime = sample[i].time;
  }

  return sample;
};
