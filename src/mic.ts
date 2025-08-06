import { FunASRClient } from "./funasr";
import type { FunASRClientOptions } from "./types";


export class AudioRecorder {
  private context?: AudioContext;
  private processor?: ScriptProcessorNode;
  private source?: MediaStreamAudioSourceNode;
  private stream?: MediaStream;

  constructor(private onAudio: (pcm: Int16Array) => void) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext({ sampleRate: 16000 });
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        pcm[i] = Math.max(-1, Math.min(1, float32[i]!)) * 32767;
      }
      this.onAudio(pcm);
    };
    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  async stop() {
    this.processor?.disconnect();
    this.source?.disconnect();
    await this.context?.close();
    this.stream?.getTracks().forEach(track => track.stop());
  }
}


export class MicASR {
  private recorder: AudioRecorder;
  private client: FunASRClient<true>;

  constructor(opts: Omit<FunASRClientOptions<true>, "decode">) {
    this.client = new FunASRClient({
      ...opts,
      decode: true,
    });
    this.recorder = new AudioRecorder((pcm) => this.client.send(pcm));
  }

  async start() {
    this.client.connect();
    await this.recorder.start();
  }

  async stop() {
    await this.recorder.stop();
    await this.client.close();
  }
}
