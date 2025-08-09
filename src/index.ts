import type { FunASRClientOptions, FunASRInitMessage, FunASRMessage, FunASRMessageDecoded } from "./types";


// Exports all types to ensure they are available for import
export * from "./types";


export class FunASRClient<TDecode extends boolean> {
  private socket?: WebSocket;
  private finalPromise?: Promise<void>;

  constructor(private opts: FunASRClientOptions<TDecode>) {}

  /**
   * Connects to the FunASR server and sends the initial configuration message.
   * @returns A promise that resolves when the connection is established and the initial message is sent
   * or rejects if the connection fails.
   */
  async connect() {
    return new Promise((resolve, reject) => {
      let resolveFinal!: () => void;
      this.finalPromise = new Promise<void>((resolve) => {
        resolveFinal = resolve;
      });

      this.socket = new WebSocket(this.opts.url);

      this.socket.onopen = (ev) => {
        const payload: FunASRInitMessage = {
          ...this.opts.config,
          is_speaking: true,
          chunk_size: this.opts.config?.chunk_size ?? [5, 10, 5],
          hotwords: this.opts.config?.hotwords ? JSON.stringify(this.opts.config.hotwords) : undefined,
        };
        this.socket?.send(JSON.stringify(payload));
        this.opts.onStateChange?.("connected", ev);
        resolve(null);
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

      this.socket.onerror = (ev) => {
        this.opts.onStateChange?.("error", ev);
        reject(`WebSocket connection to ${this.opts.url} failed.`);
      };

      this.socket.onclose = (ev) => {
        this.opts.onStateChange?.("closed", ev);
        reject(`WebSocket connection to ${this.opts.url} closed.`);
      };
    });
  }

  /**
   * Set the start timestamp for the audio recording.
   * This is useful for converting timestamps in the received messages to real timestamps.
   * @param startTime The start time in milliseconds.
   */
  setStartTime(startTime: number) {
    this.opts.startTime = startTime;
  }

  /**
   * Sends audio data to the FunASR server.
   * @param pcm The audio data in PCM format as an Int16Array.
   * This method will only send data if the WebSocket connection is open.
   * If the connection is closed, it will not send any data.
   */
  send(pcm: Int16Array) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(pcm.buffer);
    }
  }

  /**
   * Send the final message to the server, wait for the final response, and close the WebSocket connection.
   * @param timeout Optional timeout in milliseconds to wait for the final response.
   * If not provided, it will wait indefinitely until the final response is received.
   * If a timeout is provided, it will wait for either the final response or the timeout.
   * If the timeout is reached, it will close the connection.
   * @returns A promise that resolves when the connection is closed.
   */
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
