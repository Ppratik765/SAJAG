/**
 * Pure PCM conversion utilities.
 * Converts Float32 [-1.0, 1.0] samples to signed 16-bit little-endian PCM integers.
 */

/**
 * Converts Float32 audio samples to Int16Array, with hard clipping to [-1.0, 1.0].
 *
 * @param input Float32Array of normalized audio samples
 * @returns Int16Array of signed 16-bit PCM samples
 */
export function floatToPcm16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    // Hard clip to [-1.0, 1.0]
    const s = Math.max(-1.0, Math.min(1.0, input[i]));
    // Scale: positive up to 32767 (0x7FFF), negative down to -32768 (-0x8000)
    output[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
  }
  return output;
}

/**
 * Converts Int16Array to little-endian Uint8Array bytes.
 *
 * @param input Int16Array of samples
 * @returns Uint8Array containing little-endian bytes (2 bytes per sample)
 */
export function pcm16ToBytes(input: Int16Array): Uint8Array {
  const bytes = new Uint8Array(input.length * 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < input.length; i++) {
    view.setInt16(i * 2, input[i], true); // little-endian
  }
  return bytes;
}
