import { useCallback, useEffect, useRef, useState } from "react";

/**
 * MediaRecorder wrapper for consultation audio.
 *
 * The recorder is rotated every `segmentSeconds` of *recorded* time (pauses excluded):
 * a new MediaRecorder starts on the same stream before the previous one stops, so every
 * segment is an independently decodable file (webm/ogg/mp4 header included) far below the
 * 25 MB transcription limit (~2.4 MB per 10 min at 32 kbps). Audio stays in memory only.
 */

export type RecorderPhase = "idle" | "starting" | "recording" | "paused" | "stopping";
export type RecorderErrorKind = "unsupported" | "insecure" | "denied" | "no-mic" | "busy" | "failed";

export interface AudioSegment {
  blob: Blob;
  durationSec: number;
  ext: string;
}

export class RecorderError extends Error {
  constructor(public kind: RecorderErrorKind, message?: string) {
    super(message ?? kind);
  }
}

const CANDIDATES: Array<[string, string]> = [
  ["audio/webm;codecs=opus", "webm"],
  ["audio/webm", "webm"],
  ["audio/ogg;codecs=opus", "ogg"],
  ["audio/mp4;codecs=mp4a.40.2", "m4a"],
  ["audio/mp4", "m4a"],
];

export function recorderSupport(): RecorderErrorKind | null {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") return "unsupported";
  return null;
}

function pickMime(): { mimeType: string | undefined; ext: string } {
  for (const [mime, ext] of CANDIDATES) {
    try { if (MediaRecorder.isTypeSupported(mime)) return { mimeType: mime, ext }; } catch { /* old Safari */ }
  }
  return { mimeType: undefined, ext: "webm" };
}

function extFor(type: string, fallback: string) {
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mp4") || type.includes("aac")) return "m4a";
  if (type.includes("webm")) return "webm";
  return fallback;
}

function mapMediaError(e: unknown): RecorderError {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return new RecorderError("denied");
  if (name === "NotFoundError" || name === "OverconstrainedError") return new RecorderError("no-mic");
  if (name === "NotReadableError" || name === "AbortError") return new RecorderError("busy");
  return new RecorderError("failed", (e as Error)?.message);
}

interface Options {
  segmentSeconds?: number;
  /** 0..1 input level, called from rAF (throttled with reduced motion). Write to the DOM, not to React state. */
  onLevel?: (level: number) => void;
}

export function useAudioRecorder({ segmentSeconds = 600, onLevel }: Options = {}) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);

  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const segments = useRef<AudioSegment[]>([]);
  const mime = useRef<{ mimeType: string | undefined; ext: string }>({ mimeType: undefined, ext: "webm" });
  const segMs = useRef(0); // recorded ms in the current segment, excluding the running stretch
  const doneMs = useRef(0); // recorded ms of finished segments
  const runningSince = useRef<number | null>(null);
  const raf = useRef(0);
  const tick = useRef<number | undefined>(undefined);
  const finishing = useRef<((s: AudioSegment[]) => void) | null>(null);
  const pendingStops = useRef(0);
  const durations = useRef(new WeakMap<MediaRecorder, number>());
  const levelCb = useRef(onLevel);
  levelCb.current = onLevel;

  const runningMs = () => (runningSince.current === null ? 0 : performance.now() - runningSince.current);
  const settle = () => { segMs.current += runningMs(); runningSince.current = runningSince.current === null ? null : performance.now(); };

  const release = useCallback(() => {
    cancelAnimationFrame(raf.current);
    window.clearInterval(tick.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void ctx.current?.close().catch(() => undefined);
    ctx.current = null;
    analyser.current = null;
    levelCb.current?.(0);
  }, []);

  const startRecorder = useCallback(() => {
    const s = stream.current;
    if (!s) return;
    const rec = new MediaRecorder(s, { ...(mime.current.mimeType ? { mimeType: mime.current.mimeType } : {}), audioBitsPerSecond: 32000 });
    const parts: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType || mime.current.mimeType || "audio/webm";
      if (parts.length) segments.current.push({ blob: new Blob(parts, { type }), durationSec: (durations.current.get(rec) ?? 0) / 1000, ext: extFor(type, mime.current.ext) });
      pendingStops.current -= 1;
      if (pendingStops.current === 0 && finishing.current) {
        const done = finishing.current;
        finishing.current = null;
        const out = segments.current;
        segments.current = [];
        release();
        setPhase("idle");
        done(out);
      }
    };
    rec.start(1000);
    recorder.current = rec;
  }, [release]);

  /** Fixes the segment's recorded duration and stops it; `onstop` turns it into a Blob. */
  const finishSegment = useCallback((rec: MediaRecorder) => {
    settle();
    durations.current.set(rec, segMs.current);
    doneMs.current += segMs.current;
    segMs.current = 0;
    pendingStops.current += 1;
    rec.stop();
  }, []);

  const rotate = useCallback(() => {
    const old = recorder.current;
    startRecorder(); // the new segment starts before the old one stops: no gap
    if (old && old !== recorder.current && old.state !== "inactive") finishSegment(old);
  }, [finishSegment, startRecorder]);

  const start = useCallback(async () => {
    const unsupported = recorderSupport();
    if (unsupported) throw new RecorderError(unsupported);
    setPhase("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (e) {
      setPhase("idle");
      throw mapMediaError(e);
    }
    try {
      mime.current = pickMime();
      segments.current = [];
      segMs.current = 0;
      doneMs.current = 0;
      pendingStops.current = 0;
      finishing.current = null;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        ctx.current = new AC();
        analyser.current = ctx.current.createAnalyser();
        analyser.current.fftSize = 512;
        ctx.current.createMediaStreamSource(stream.current).connect(analyser.current);
      }
      startRecorder();
    } catch (e) {
      release();
      setPhase("idle");
      throw new RecorderError("failed", (e as Error)?.message);
    }
    runningSince.current = performance.now();
    setElapsed(0);
    setPhase("recording");

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const buf = new Uint8Array(512);
    let last = 0;
    const loop = (t: number) => {
      raf.current = requestAnimationFrame(loop);
      if (t - last < (reduced ? 250 : 50)) return;
      last = t;
      const a = analyser.current;
      if (!a || runningSince.current === null) { levelCb.current?.(0); return; }
      a.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      levelCb.current?.(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    };
    raf.current = requestAnimationFrame(loop);
    tick.current = window.setInterval(() => {
      setElapsed((doneMs.current + segMs.current + runningMs()) / 1000);
      if (runningSince.current !== null && segMs.current + runningMs() >= segmentSeconds * 1000) rotate();
    }, 250);
  }, [release, rotate, segmentSeconds, startRecorder]);

  const pause = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    segMs.current += runningMs();
    runningSince.current = null;
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    const rec = recorder.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    runningSince.current = performance.now();
    setPhase("recording");
  }, []);

  /** Stops and resolves with every segment in order. */
  const stop = useCallback(() => new Promise<AudioSegment[]>((resolve) => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") { release(); setPhase("idle"); resolve([]); return; }
    finishing.current = resolve;
    setPhase("stopping");
    window.clearInterval(tick.current);
    if (rec.state === "paused") rec.resume(); // Safari drops the last chunk of a paused recorder otherwise
    finishSegment(rec);
    runningSince.current = null;
  }), [finishSegment, release]);

  /** Stops and throws the audio away. */
  const cancel = useCallback(() => {
    finishing.current = null;
    const rec = recorder.current;
    recorder.current = null;
    if (rec && rec.state !== "inactive") { rec.ondataavailable = null; rec.onstop = null; rec.stop(); }
    segments.current = [];
    runningSince.current = null;
    release();
    setPhase("idle");
    setElapsed(0);
  }, [release]);

  useEffect(() => () => {
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") { rec.onstop = null; rec.stop(); }
    release();
  }, [release]);

  return { phase, elapsed, start, pause, resume, stop, cancel };
}
