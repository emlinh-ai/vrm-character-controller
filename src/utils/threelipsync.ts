/**
 * Slightly customized threelipsync module.
 *
 * Computes the values of THREE blend shapes (kiss, lips closed and mouth open/jaw)
 * To do so, it computes the energy of THREE frequency bands in real time.
 *
 * Author: Gerard Llorach
 * Paper: G. Llorach, A. Evans, J. Blat, G. Grimm, V. Hohmann. Web-based live speech-driven
 * lip-sync, Proceedings of VS-Games 2016, September, Barcelona
 * Date: Nov 2016
 * License: MIT
 */

export type LipsyncCallback = (kiss: number, lipsClosed: number, jaw: number) => void;

export class Lipsync {
  private context: AudioContext;
  private analyser: AnalyserNode;
  private data: Float32Array;
  private energy: number[];
  private lipsyncBSW: [number, number, number];
  private lipSyncCallback: LipsyncCallback | null;
  private threshold: number;
  private smoothness: number;
  private pitch: number;
  private fBins: number[];
  private sample?: MediaStreamAudioSourceNode | AudioBufferSourceNode;
  private gainNode?: GainNode;

  private static refFBins = [0, 500, 700, 3000, 6000];

  constructor(
    context: AudioContext,
    input: MediaStream | AnalyserNode,
    threshold = 0.45,
    smoothness = 0.6,
    pitch = 1
  ) {
    this.context = context;
    this.energy = [0, 0, 0, 0, 0, 0, 0, 0];
    this.lipsyncBSW = [0, 0, 0];
    this.lipSyncCallback = null;
    this.threshold = threshold;
    this.smoothness = smoothness;
    this.pitch = pitch;
    this.fBins = Lipsync.refFBins.map((v) => v * pitch);

    if (input instanceof MediaStream) {
      this.analyser = this.initAnalyser();
      this.sample = context.createMediaStreamSource(input);
      this.sample.connect(this.analyser);
    } else if (input instanceof AnalyserNode) {
      this.analyser = input;
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = this.smoothness;
    } else {
      this.analyser = this.initAnalyser();
    }

    this.data = new Float32Array(this.analyser.frequencyBinCount);
  }

  private initAnalyser(): AnalyserNode {
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = this.smoothness;
    return analyser;
  }

  setLipSyncCallback(callback: LipsyncCallback): void {
    this.lipSyncCallback = callback;
  }

  update(): [number, number, number] {
    // @ts-expect-error - Web Audio API type issue, works correctly at runtime
    this.analyser.getFloatFrequencyData(this.data);
    this.binAnalysis();
    this.lipAnalysis();

    if (this.lipSyncCallback) {
      const [kiss, lipsClosed, jaw] = this.lipsyncBSW;
      this.lipSyncCallback(kiss, lipsClosed, jaw);
    }

    return this.lipsyncBSW;
  }

  private binAnalysis(): void {
    const nfft = this.analyser.frequencyBinCount;
    const fs = this.context.sampleRate;

    for (let binInd = 0; binInd < this.fBins.length - 1; binInd++) {
      const indxIn = Math.round((this.fBins[binInd] * nfft) / (fs / 2));
      const indxEnd = Math.round((this.fBins[binInd + 1] * nfft) / (fs / 2));

      this.energy[binInd] = 0;
      for (let i = indxIn; i < indxEnd; i++) {
        let value = this.threshold + (this.data[i] + 20) / 140;
        value = value > 0 ? value : 0;
        this.energy[binInd] += value;
      }
      this.energy[binInd] /= indxEnd - indxIn;
    }
  }

  private lipAnalysis(): void {
    const energy = this.energy;

    if (energy !== undefined) {
      let value = 0;

      // Kiss blend shape
      value = (0.5 - energy[2]) * 2;
      if (energy[1] < 0.2) value = value * (energy[1] * 5);
      value = Math.max(0, Math.min(value, 1));
      this.lipsyncBSW[0] = value;

      // Lips closed blend shape
      value = energy[3] * 3;
      value = Math.max(0, Math.min(value, 1));
      this.lipsyncBSW[1] = value;

      // Jaw blend shape
      value = energy[1] * 0.8 - energy[3] * 0.8;
      value = Math.max(0, Math.min(value, 1));
      this.lipsyncBSW[2] = value;
    }
  }
}
