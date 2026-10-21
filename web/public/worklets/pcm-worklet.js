/**
 * AudioWorkletProcessor for capturing raw microphone Float32 samples.
 *
 * Runs in the Web Audio rendering thread at low latency.
 * Forwards Float32 sample blocks to the main thread via MessagePort.
 * Resampling to 16 kHz and 1,024-byte framing are handled on the main thread.
 */

class PcmWorkletProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      if (channelData && channelData.length > 0) {
        // Send a clone of the Float32 samples to the main thread
        this.port.postMessage(channelData.slice());
      }
    }
    return true; // Keep processor alive
  }
}

registerProcessor("pcm-worklet-processor", PcmWorkletProcessor);
