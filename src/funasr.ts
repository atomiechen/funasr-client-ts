import type { FunASRClientOptions, FunASRInitMessage, FunASRMessage, FunASRMessageDecoded } from "./types";


export class FunASRClient<TDecode extends boolean> {
  private socket?: WebSocket;
  private finalPromise?: Promise<void>;

  constructor(private opts: FunASRClientOptions<TDecode>) {}

  connect() {
    let resolveFinal!: () => void;
    this.finalPromise = new Promise<void>((resolve) => {
      resolveFinal = resolve;
    });

    this.socket = new WebSocket(this.opts.uri);

    this.socket.onopen = () => {
      const payload: FunASRInitMessage = {
        ...this.opts.config,
        is_speaking: true,
        hotwords: this.opts.config?.hotwords ? JSON.stringify(this.opts.config.hotwords) : undefined,
      };
      this.socket?.send(JSON.stringify(payload));
      this.opts.onStateChange?.("connected");
    };

    this.socket.onmessage = (event) => {
      const data: FunASRMessage = JSON.parse(event.data);
      // decode the message if required
      if (this.opts.decode) {
        const dataDecoded: FunASRMessageDecoded = {
          ...data,
          timestamp: data.timestamp ? JSON.parse(data.timestamp) : undefined,
        };
        // Convert timestamp to real timestamps if startTime is provided
        const startTime = this.opts.startTime;
        if (startTime !== undefined && startTime > 0) {
          dataDecoded.real_timestamp = dataDecoded.timestamp?.map((ts: [number, number]) => [
            ts[0] + startTime,
            ts[1] + startTime,
          ]);
          dataDecoded.real_stamp_sents = dataDecoded.stamp_sents?.map((sent) => ({
            ...sent,
            ts_list: sent.ts_list.map((ts: [number, number]) => [
              ts[0] + startTime,
              ts[1] + startTime,
            ]),
            start: sent.start >= 0 ? sent.start + startTime : sent.start,
            end: sent.end >= 0 ? sent.end + startTime : sent.end,
          }));
        }
        (this.opts.onMessage as ((msg: FunASRMessageDecoded) => void) | undefined)?.(dataDecoded);
      } else {
        (this.opts.onMessage as ((msg: FunASRMessage) => void) | undefined)?.(data);
      }
      if (data.is_final) {
        resolveFinal();
      }
    };

    this.socket.onerror = () => {
      this.opts.onStateChange?.("error");
    };

    this.socket.onclose = () => {
      this.opts.onStateChange?.("closed");
    };
  }

  send(pcm: Int16Array) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(pcm.buffer);
    }
  }

  async close(timeout: number | null = null) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      // signal that we are done speaking
      this.socket.send(JSON.stringify({is_speaking: false}));
    }

    if (timeout === null) {
      // if no timeout is specified, wait for the final promise to resolve
      await this.finalPromise;
    } else {
      // if a timeout is specified, wait for either the final promise or the timeout
      await Promise.race([
        this.finalPromise,
        new Promise(resolve => setTimeout(() => {
          resolve(null);
          console.warn("Force closing WebSocket connection after timeout.");
        }, timeout))
      ]);
    }

    // Close the WebSocket connection
    this.socket?.close();
  }
}
