import { encodeMp3, encodeWav } from '../../../lib/audio/audio-util.js';

export const compressAudio = async (file) => {
  const isWav = file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav');

  try {
    const originalBuffer = await file.arrayBuffer();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(originalBuffer.slice(0));
    await audioCtx.close();

    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const left = audioBuffer.getChannelData(0);
    let monoSamples;

    if (numChannels > 1) {
      const right = audioBuffer.getChannelData(1);
      monoSamples = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        monoSamples[i] = (left[i] + right[i]) / 2;
      }
    } else {
      monoSamples = left;
    }

    const sampleRate = audioBuffer.sampleRate;
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    let compressedBuffer;
    let mimeType;
    let newFileName;

    if (isWav) {
      compressedBuffer = encodeWav(monoSamples, sampleRate);
      mimeType = 'audio/wav';
      newFileName = `${baseName}.wav`;
    } else {
      compressedBuffer = encodeMp3(monoSamples, sampleRate);
      mimeType = 'audio/mpeg';
      newFileName = `${baseName}.mp3`;
    }

    const compressedBlob = new Blob([compressedBuffer], { type: mimeType });
    return new File([compressedBlob], newFileName, { type: mimeType });
  } catch (e) {
    console.warn(e);
    return file;
  }
};
