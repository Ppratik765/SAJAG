/**
 * Pure audio resampling utility.
 * Downsamples audio to 16,000 Hz for Gnani Prisma STT.
 */

/**
 * Resamples Float32 audio samples from `inputSampleRate` to 16,000 Hz using linear interpolation.
 *
 * @param input Float32Array of raw PCM audio samples
 * @param inputSampleRate Input sample rate (e.g., 44100, 48000, 16000)
 * @returns Float32Array resampled to 16,000 Hz
 */
export function resampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) {
    return new Float32Array(input);
  }

  if (input.length === 0) {
    return new Float32Array(0);
  }

  const targetRate = 16000;
  const ratio = inputSampleRate / targetRate;
  const targetLength = Math.round(input.length / ratio);
  const output = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const idx0 = Math.floor(srcIndex);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcIndex - idx0;
    output[i] = input[idx0] + frac * (input[idx1] - input[idx0]);
  }

  return output;
}
