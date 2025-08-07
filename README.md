# FunASR-Client (TS/JS)

[![NPM](https://img.shields.io/npm/v/funasr-client?logo=npm&label=funasr-client)](https://www.npmjs.com/package/funasr-client)
[![GitHub](https://img.shields.io/badge/github-gray?logo=github)](https://github.com/atomiechen/funasr-client-ts)


Really easy-to-use Typescript/JavaScript client for FunASR runtime server.

To deploy your own FunASR server, follow the [FunASR runtime guide][2], or use the improved startup scripts [here][3].


## Features

- 🔤 Auto decoding of messages with real timestamps (`FunASRMessageDecoded`)
- 🎙️ Real-time audio recognition from a microphone (`MicASR`)


## Installation

### NPM (Browser/Node.js)

```sh
npm install funasr-client
```

```ts
import { FunASRClient } from 'funasr-client';

// import this if you want real-time microphone ASR
import { MicASR } from 'funasr-client/mic';
```

### ESM CDN (Browser)

Import the ESM module directly from a CDN:

```html
<script type="importmap">
  {
    "imports": {
      "funasr-client": "https://esm.sh/funasr-client@latest",
      "funasr-client/mic": "https://esm.sh/funasr-client@latest/mic"
    }
  }
</script>
<script type="module">
  import { FunASRClient } from 'funasr-client';
  import { MicASR } from 'funasr-client/mic';
</script>
```

### IIFE CDN (Browser)

All features are also available in the IIFE bundle `dist/iife/index.global.js`, which can be directly included in web pages.
Tools are exposed in the global `funasr` object.

Import the IIFE module directly from a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/funasr-client@latest/dist/iife/index.global.js"></script>
<script>
    // funasr object is available globally
    console.log(funasr.FunASRClient);
    console.log(funasr.MicASR);
</script>
```

## Usage

### FunASRClient

The *only* required option is the URL of the FunASR server.

```ts
const client = new FunASRClient({
  // (Required) URL of the FunASR server
  url: "ws://localhost:8000/ws",

  // Whether to decode the message before passing it to the `onMessage` callback.
  // Disable auto-decoding if you want to handle original message objects
  decode: true,

  // callback to handle incoming messages
  onMessage: (msg) => {
    console.log("Received message:", msg);
  },

  // callback to handle state changes
  onStateChange: (state) => { 
    console.log("State changed:", state);
  },

  // the start timestamp (ms) for the audio recording
  startTime: Date.now(),

  // initial configuration for the first message
  config: {
    mode: "2pass",
    wav_name: "test.wav",
    wav_format: "pcm",
    chunk_size: [5, 10, 5],
    audio_fs: 16000,
    hotwords: { "hello": 20, "world": 30 },
    itn: true,
    svs_lang: "auto",
    svs_itn: true,
  }
});

// (async) Connect to the server and send the initial configuration.
client.connect();

// Set the start timestamp for the audio recording.
client.setStartTime(timestamp);

// Send a message to the server.
client.send(data);

// (async) Send the final message to the server, wait for the final result and then close the connection. An optional timeout can be provided.
client.close();
```


### MicASR

The `MicASR` class provides a convenient way to perform real-time audio recognition from a microphone.
It takes the same options as `FunASRClient` except for the `decode` option, which is always `true` for `MicASR`.

```ts
const mic_asr = new MicASR({
  url: 'ws://your-funasr-server-url'
});

// (async) Start the real-time ASR process by connecting to the FunASR server and starting the audio recorder.
mic_asr.start()

// (async) Stop the real-time ASR process by stopping the audio recorder and closing the FunASR client connection.
mic_asr.stop()
```

## References

- FunASR WebSocket Protocol ([English](https://github.com/modelscope/FunASR/blob/main/runtime/docs/websocket_protocol.md) | [简体中文](https://github.com/modelscope/FunASR/blob/main/runtime/docs/websocket_protocol_zh.md))


[1]: https://github.com/modelscope/FunASR
[2]: https://github.com/modelscope/FunASR/blob/main/runtime/readme.md
[3]: https://gist.github.com/atomiechen/2deaf80dba21b4434ab21d6bf656fbca
