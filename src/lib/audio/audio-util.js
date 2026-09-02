import lamejs from '@breezystack/lamejs';
import { WaveFile } from 'wavefile';

const SOUND_BYTE_LIMIT = 10 * 1000 * 1000; // 10mb

const MP3_BIT_RATE = 128;

/**
 * Encode Float32Array audio samples to MP3 (audio/mpeg).
 * @param {Float32Array} samples - mono audio samples in range [-1, 1]
 * @param {number} sampleRate - sample rate of the audio
 * @returns {Uint8Array} MP3 encoded bytes
 */
const encodeMp3 = (samples, sampleRate) => {
  const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, MP3_BIT_RATE);
  const mp3Data = [];

  const sampleBlockSize = 1152;
  const int16Samples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
    const chunk = int16Samples.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endBuffer = mp3Encoder.flush();
  if (endBuffer.length > 0) {
    mp3Data.push(new Uint8Array(endBuffer));
  }

  const totalLength = mp3Data.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of mp3Data) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
};

const encodeWav = (samples, sampleRate) => {
  const wav = new WaveFile();

  wav.fromScratch(1, sampleRate, '32f', [samples]);

  if (sampleRate > 16000) {
    wav.toSampleRate(16000);
  }

  wav.toBitDepth('8');

  return wav.toBuffer();
};

const computeRMS = function (samples, scaling = 0.55) {
  if (samples.length === 0) return 0;
  // Calculate RMS, adapted from https://github.com/Tonejs/Tone.js/blob/master/Tone/component/Meter.js#L88
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    sum += Math.pow(sample, 2);
  }
  const rms = Math.sqrt(sum / samples.length);
  const val = rms / scaling;
  return Math.sqrt(val);
};

const computeChunkedRMS = function (samples, chunkSize = 1024) {
  const sampleCount = samples.length;
  const chunkLevels = [];
  for (let i = 0; i < sampleCount; i += chunkSize) {
    const maxIndex = Math.min(sampleCount, i + chunkSize);
    chunkLevels.push(computeRMS(samples.slice(i, maxIndex)));
  }
  return chunkLevels;
};

const encodeAndAddSoundToVM = function (vm, samples, sampleRate, name, callback) {
  const mp3Buffer = encodeMp3(samples, sampleRate);

  const vmSound = {
    format: '',
    dataFormat: 'mp3',
    rate: sampleRate,
    sampleCount: samples.length
  };

  // Create an asset from the encoded .mp3 and get resulting md5
  const storage = vm.runtime.storage;
  vmSound.asset = storage.createAsset(
    storage.AssetType.Sound,
    storage.DataFormat.MP3,
    mp3Buffer,
    null,
    true // generate md5
  );
  vmSound.assetId = vmSound.asset.assetId;

  // update vmSound object with md5 property
  vmSound.md5 = `${vmSound.assetId}.${vmSound.dataFormat}`;
  // The VM will update the sound name to a fresh name
  vmSound.name = name;

  vm.addSound(vmSound).then(() => {
    if (callback) callback();
  });
};

/**
 @typedef SoundBuffer
 @type {Object}
 @property {Float32Array} samples Array of audio samples
 @property {number} sampleRate Audio sample rate
 */

/**
 * Downsample the given buffer to try to reduce file size below SOUND_BYTE_LIMIT
 * @param {SoundBuffer} buffer - Buffer to resample
 * @param {function(SoundBuffer):Promise<SoundBuffer>} resampler - resampler function
 * @returns {SoundBuffer} Downsampled buffer with half the sample rate
 */
const downsampleIfNeeded = (buffer, resampler) => {
  const { samples, sampleRate } = buffer;
  const duration = samples.length / sampleRate;
  const encodedByteLength = samples.length * 2; /* bitDepth 16 bit */
  // Resolve immediately if already within byte limit
  if (encodedByteLength < SOUND_BYTE_LIMIT) {
    return Promise.resolve({ samples, sampleRate });
  }
  // If encodeable at 22khz, resample and call submitNewSamples again
  if (duration * 22050 * 2 < SOUND_BYTE_LIMIT) {
    return resampler({ samples, sampleRate }, 22050);
  }
  // Cannot save this sound at 22khz, refuse to edit
  // In the future we could introduce further compression here
  return Promise.reject(new Error('Sound too large to save, refusing to edit'));
};

/**
 * Drop every other sample of an audio buffer as a last-resort way of downsampling.
 * @param {SoundBuffer} buffer - Buffer to resample
 * @returns {SoundBuffer} Downsampled buffer with half the sample rate
 */
const dropEveryOtherSample = (buffer) => {
  const newLength = Math.floor(buffer.samples.length / 2);
  const newSamples = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    newSamples[i] = buffer.samples[i * 2];
  }
  return {
    samples: newSamples,
    sampleRate: buffer.sampleRate / 2
  };
};

export {
  computeRMS,
  computeChunkedRMS,
  encodeAndAddSoundToVM,
  encodeMp3,
  encodeWav,
  downsampleIfNeeded,
  dropEveryOtherSample
};
