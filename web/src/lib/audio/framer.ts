/**
 * Pure audio frame accumulator and chunker.
 * Guarantees emission of exactly 1,024-byte binary frames (512 Int16 LE samples).
 * Prevents any sample loss or duplication across incoming buffer boundaries.
 */

export const FRAME_SAMPLES = 512;
export const FRAME_BYTES = 1024;

/**
 * Converts Int16Array to little-endian Uint8Array bytes.
 */
function toLittleEndianBytes(input: Int16Array): Uint8Array {
  const bytes = new Uint8Array(input.length * 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < input.length; i++) {
    view.setInt16(i * 2, input[i], true); // little-endian
  }
  return bytes;
}

export class Framer {
  private buffer: Int16Array;
  private bufferLength: number;

  constructor() {
    this.buffer = new Int16Array(4096);
    this.bufferLength = 0;
  }

  /**
   * Push new Int16 samples into the accumulator.
   * Emits zero or more exactly 1,024-byte Uint8Array frames.
   */
  push(samples: Int16Array): Uint8Array[] {
    if (samples.length === 0) {
      return [];
    }

    // Expand buffer if needed
    const requiredCapacity = this.bufferLength + samples.length;
    if (requiredCapacity > this.buffer.length) {
      let newCapacity = this.buffer.length * 2;
      while (newCapacity < requiredCapacity) {
        newCapacity *= 2;
      }
      const nextBuffer = new Int16Array(newCapacity);
      nextBuffer.set(this.buffer.subarray(0, this.bufferLength));
      this.buffer = nextBuffer;
    }

    // Append incoming samples
    this.buffer.set(samples, this.bufferLength);
    this.bufferLength += samples.length;

    const frames: Uint8Array[] = [];

    // Slice out complete 512-sample blocks
    let offset = 0;
    while (this.bufferLength - offset >= FRAME_SAMPLES) {
      const slice = this.buffer.subarray(offset, offset + FRAME_SAMPLES);
      frames.push(toLittleEndianBytes(slice));
      offset += FRAME_SAMPLES;
    }

    // Shift remaining samples to the beginning of the buffer
    if (offset > 0) {
      const remaining = this.bufferLength - offset;
      if (remaining > 0) {
        this.buffer.copyWithin(0, offset, this.bufferLength);
      }
      this.bufferLength = remaining;
    }

    return frames;
  }

  /**
   * Return number of un-emitted samples remaining in the buffer.
   */
  get remainingSamples(): number {
    return this.bufferLength;
  }

  /**
   * Reset accumulator state, discarding any remaining samples.
   */
  reset(): void {
    this.bufferLength = 0;
  }
}
