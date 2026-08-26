import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

const { spawnMock, transcribeMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  transcribeMock: vi.fn(),
}));

vi.mock("ffmpeg-static", () => ({ default: "/fake/ffmpeg" }));
vi.mock("@huggingface/transformers", () => ({
  env: { cacheDir: "" },
  pipeline: vi.fn(async () => transcribeMock),
}));
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import { decodeToPcm, transcribe } from "../src/stt.js";

type FakeChild = EventEmitter & {
  stdout: EventEmitter;
  stdin: { write: (b: Buffer) => void; end: () => void };
};

function fakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stdin = { write: vi.fn(), end: vi.fn() };
  return child;
}

describe("decodeToPcm", () => {
  it("convierte la salida f32le de ffmpeg en Float32Array a 16kHz", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = decodeToPcm(Buffer.from("fake"));
    const samples = new Float32Array([0.5, -0.25, 1]);
    child.stdout.emit("data", Buffer.from(samples.buffer));
    child.emit("close", 0);

    const result = await promise;
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(0.5);
    expect(spawnMock).toHaveBeenCalledWith(
      "/fake/ffmpeg",
      expect.arrayContaining(["-ar", "16000", "-ac", "1", "-f", "f32le"]),
      expect.anything(),
    );
  });

  it("rechaza si ffmpeg sale con código != 0", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = decodeToPcm(Buffer.from("fake"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow(/código 1/);
  });
});

describe("transcribe", () => {
  beforeEach(() => {
    transcribeMock.mockReset();
    transcribeMock.mockResolvedValue({ text: "hola mundo" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decodifica el audio y devuelve el texto transcrito", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = transcribe(Buffer.from("fake"));
    const samples = new Float32Array([0.1, 0.2, 0.3]);
    child.stdout.emit("data", Buffer.from(samples.buffer));
    child.emit("close", 0);

    const text = await promise;
    expect(text).toBe("hola mundo");
    expect(transcribeMock).toHaveBeenCalled();
  });
});