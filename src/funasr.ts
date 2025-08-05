/**
  `mode`：表示推理模式，分为`2pass-online`，表示实时识别结果；`2pass-offline`，表示2遍修正识别结果
  `wav_name`：表示需要推理音频文件名
  `text`：表示语音识别输出文本
  `is_final`：表示识别结束
  `timestamp`：如果AM为时间戳模型，会返回此字段，表示时间戳，格式为 "[[100,200], [200,500]]"(ms)
  `stamp_sents`：如果AM为时间戳模型，会返回此字段，表示句子级别时间戳，格式为 [{"text_seg":"正 是 因 为","punc":",","start":430,"end":1130,"ts_list":[[430,670],[670,810],[810,1030],[1030,1130]]}]

  例子：
  ```json
  {"mode": "2pass-online", "wav_name": "wav_name", "text": "asr ouputs", "is_final": true, "timestamp":"[[100,200], [200,500]]","stamp_sents":[]}
  ```
*/
export type FunASRMessage = {
  mode: "2pass-online" | "2pass-offline";
  wav_name: string;
  text: string;
  is_final: boolean;
  timestamp?: string; // e.g., "[[100,200], [200,500]]"
  stamp_sents?: Array<{
    text_seg: string;
    punc: string;
    start: number; // in ms
    end: number; // in ms
    ts_list: Array<[number, number]>; // e.g., [[430,670],[670,810],[810,1030],[1030,1130]]
  }>;
}

export type FunASRMessageDecoded = Omit<FunASRMessage, 'timestamp'> & {
  /**
   * timestamp
   * 解码后的时间戳，格式为 [[100,200], [200,500]] (ms)
   */
  timestamp?: Array<[number, number]>;
  /**
   * 转换为本机的实际时间戳列表
   */
  real_timestamp?: Array<[number, number]>;
  /**
   * 转换为本机的实际时间戳句子列表
   */
  real_stamp_sents?: Array<{
    text_seg: string;
    punc: string;
    start: number; // in ms
    end: number; // in ms
    ts_list: Array<[number, number]>;
  }>;
}

export type FunASRClientState = "connected" | "error" | "closed";

export type FunASRClientOptions = {
  wsUrl: string | URL;
  onMessage: (msg: FunASRMessageDecoded) => void;
  onStateChange?: (state: FunASRClientState) => void;
  config?: {
    mode?: "online" | "offline" | "2pass";
    itn?: boolean;
    hotwords?: Record<string, number>;
  };
};

export class FunASRClient {
  private socket!: WebSocket;
  private finalPromise!: Promise<void>;
  private startTime!: number;

  constructor(private opts: FunASRClientOptions) {}

  connect() {
    let resolveFinal!: () => void;
    this.finalPromise = new Promise<void>((resolve) => {
      resolveFinal = resolve;
    });

    this.socket = new WebSocket(this.opts.wsUrl);

    this.socket.onopen = () => {
      const payload = {
        wav_name: "browser-client",
        is_speaking: true,
        chunk_size: [5, 10, 5],
        chunk_interval: 10,
        itn: this.opts.config?.itn ?? true,
        mode: this.opts.config?.mode ?? "2pass",
        hotwords: JSON.stringify(this.opts.config?.hotwords || {}),
      };
      this.socket.send(JSON.stringify(payload));
      this.opts.onStateChange?.("connected");

      // 记录连接开始时间
      this.startTime = Date.now();
    };

    this.socket.onmessage = (event) => {
      const data: FunASRMessage = JSON.parse(event.data);
      // 解码并转换时间戳
      const dataDecoded: FunASRMessageDecoded = {
        ...data,
        timestamp: data.timestamp ? JSON.parse(data.timestamp) : undefined,
        real_timestamp: data.timestamp ? JSON.parse(data.timestamp).map((ts: [number, number]) => [
          ts[0] + this.startTime,
          ts[1] + this.startTime,
        ]) : undefined,
        real_stamp_sents: data.stamp_sents ? data.stamp_sents.map((sent) => ({
          ...sent,
          ts_list: sent.ts_list.map((ts: [number, number]) => [
            ts[0] + this.startTime,
            ts[1] + this.startTime,
          ]),
          start: sent.start >= 0 ? sent.start + this.startTime : sent.start,
          end: sent.end >= 0 ? sent.end + this.startTime : sent.end,
        })) : undefined,
      };
      this.opts.onMessage(dataDecoded);
      if (data.is_final) {
        resolveFinal();
        // this.socket.close(); // Close the socket after receiving final message
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
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(pcm.buffer);
    }
  }

  async stop(timeout: number | null = null) {
    if (this.socket.readyState === WebSocket.OPEN) {
      // 提示后端发送最终结果
      this.socket.send(JSON.stringify({is_speaking: false}));
    }

    if (timeout === null) {
      // 如果没有设置超时，则等待直到连接关闭
      await this.finalPromise;
    } else {
      // 超时强制关闭
      await Promise.race([
        this.finalPromise,
        new Promise(resolve => setTimeout(() => {
          resolve(null);
          console.warn("Force closing WebSocket connection after timeout.");
        }, timeout))
      ]);
    }

    this.socket.close();
  }
}
