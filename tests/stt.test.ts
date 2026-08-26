import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const decodeMock = vi.fn();
const freeMock = vi.fn();
const transcribeMock = vi.fn(async () => ({ text: "hola mundo" }));

vi.mock("ogg-opus-decoder", () => ({
  OggOpusDecoder: class {
    ready = Promise.resolve();
    decode = decodeMock;
    free = freeMock;
  },
}));

vi.mock("@huggingface/transformers", () => ({
  env: { cacheDir: "" },
  pipeline: vi.fn(async () => transcribeMock),
}));

import { resample, transcribe } from "../src/stt.js";

describe("resample", () => {
  it("devuelve la misma señal si las tasas son iguales", () => {
    const input = new Float32Array([1, 2, 3, 4]);
    expect(resample(input, 48000, 48000)).toEqual(input);
  });

  it("reduce 48kHz a 16kHz (factor 3)", () => {
    const input = new Float32Array([0, 1, 2, 3, 4, 5]);
    const out = resample(input, 48000, 16000);
    expect(out.length).toBe(2);
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(3);
  });

  it("aumenta 16kHz a 48kHz (factor 3)", () => {
    const input = new Float32Array([0, 1]);
    const out = resample(input, 16000, 48000);
    expect(out.length).toBe(6);
  });
});

describe("transcribe", () => {
  beforeEach(() => {
    decodeMock.mockReset();
    decodeMock.mockReturnValue({
      channelData: [new Float32Array([0, 1, 2, 3, 4, 5])],
      sampleRate: 48000,
    });
    freeMock.mockReset();
    transcribeMock.mockReset();
    transcribeMock.mockResolvedValue({ text: "hola mundo" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decodifica, resamplea a 16kHz y devuelve el texto", async () => {
    const text = await transcribe(Buffer.from("fake-ogg"));
    expect(text).toBe("hola mundo");
    expect(decodeMock).toHaveBeenCalled();
    expect(freeMock).toHaveBeenCalled();
  });
});