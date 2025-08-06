/**
 * The initial communication message sent from the client to the server.
 * 
 * Example:
 * ```json
 * {"mode": "2pass", "wav_name": "wav_name", "is_speaking": True, "wav_format":"pcm", "chunk_size":[5,10,5],"hotwords":"{"阿里巴巴":20,"通义实验室":30}","itn":true}
 * ```
 * 
 * Reference: FunASR WebSocket Protocol ([English](https://github.com/modelscope/FunASR/blob/main/runtime/docs/websocket_protocol.md) | [简体中文](https://github.com/modelscope/FunASR/blob/main/runtime/docs/websocket_protocol_zh.md))
 */
export type FunASRInitMessage = {
  /**
   * `offline` indicates the inference mode for single-sentence recognition; `online` indicates the inference mode for real-time speech recognition; `2pass` indicates real-time speech recognition and offline model correction for sentence endings.
   * Default: "2pass".
   */
  mode?: "online" | "offline" | "2pass";
  /**
   * The name of the audio file to be transcribed
   */
  wav_name?: string;
  /**
   * The audio and video file extension, such as pcm, mp3, mp4, etc. (Note: only PCM audio streams are supported in version 1.0).
   */
  wav_format?: string;
  /**
   * False indicates the end of a sentence, such as a VAD segmentation point or the end of a WAV file.
   */
  is_speaking: boolean;
  /**
   * Indicates the latency configuration of the streaming model, `[5,10,5]` indicates that the current audio is 600ms long, with a 300ms look-ahead and look-back time.
   */
  chunk_size?: [number, number, number];
  /**
   * When the input audio is in PCM format, the audio sampling rate parameter needs to be added.
   * Default: 16000.
   */
  audio_fs?: number;
  /**
   * If using the hotword, you need to send the hotword data (string) to the server. For example：`"{"阿里巴巴":20,"通义实验室":30}"`.
   */
  hotwords?: string;
  /**
   * Whether to use itn, the default value is true for enabling and false for disabling.
   */
  itn?: boolean;
  /**
   * Set the language for SenseVoiceSmall model, default is "auto"
   */
  svs_lang?: string;
  /**
   * Set whether to enable punctuation and ITN for SenseVoiceSmall model, default is True
   */
  svs_itn?: boolean;
}

/**
 * Message received from server to client.
 * 
 * Example:
 * ```json
 * {"mode": "2pass-online", "wav_name": "wav_name", "text": "asr ouputs", "is_final": true, "timestamp":"[[100,200], [200,500]]","stamp_sents":[]}
 * ```
 * 
 * Reference: FunASR WebSocket Protocol ([English](https://github.com/modelscope/FunASR/blob/main/runtime/docs/websocket_protocol.md) | [简体中文](https://github.com/modelscope/FunASR/blob/main/runtime/docs/websocket_protocol_zh.md))
*/
export type FunASRMessage = {
  /**
   * Indicates the inference mode, divided into `2pass-online` for real-time recognition results and `2pass-offline` for 2-pass corrected recognition results.
   */
  mode: "2pass-online" | "2pass-offline";
  /**
   * The name of the audio file to be transcribed.
   */
  wav_name: string;
  /**
   * The text output of speech recognition.
   */
  text: string;
  /**
   * Indicating the end of recognition.
   */
  is_final: boolean;
  /**
   * If AM is a timestamp model, it will return this field, indicating the timestamp, in the format of `"[[100,200], [200,500]]"`.
   */
  timestamp?: string;
  /**
   * If AM is a timestamp model, it will return this field, indicating the stamp_sents, in the format of `[{"text_seg":"正 是 因 为","punc":",","start":430,"end":1130,"ts_list":[[430,670],[670,810],[810,1030],[1030,1130]]}]`.
   */
  stamp_sents?: Array<{
    text_seg: string;
    punc: string;
    start: number; // in ms
    end: number; // in ms
    ts_list: Array<[number, number]>;
  }>;
}

/**
 * Decoded FunASRMessage with parsed timestamps and optional real timestamps.
 */
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

/**
 * The initialization configuration for the first message of the FunASR client.
 */
export type FunASRInitConfig = Omit<FunASRInitMessage, 'hotwords' | 'is_speaking'> & {
  hotwords?: Record<string, number>;
};

/**
 * Options for the FunASR client.
 */
export type FunASRClientOptions<TDecode extends boolean> = {
  uri: string | URL;
  /**
   * Whether to decode the message before passing it to the `onMessage` callback.
   */
  decode?: TDecode;
  /**
   * Callback function to handle incoming messages from the server.
   */
  onMessage?: TDecode extends true
    ? (msg: FunASRMessageDecoded) => void
    : (msg: FunASRMessage) => void;
  /**
   * Callback function to handle state changes of the client.
   */
  onStateChange?: (state: FunASRClientState) => void;
  /**
   * The start time of the audio recording.
   */
  startTime?: number;
  /**
   * The initial configuration for the FunASR client.
   */
  config?: Partial<FunASRInitConfig>;
};
