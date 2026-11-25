import {FFmpeg} from '@ffmpeg/ffmpeg';
import {fetchFile, toBlobURL} from '@ffmpeg/util';
import {SCENE_MAP, VISUAL_STYLE_PRESETS} from '../data/sceneCatalog';
import type {VideoProject, VideoScene} from '../types/evangeliza';
import {
  renderProjectMixAudioBuffer,
  renderProjectMixWav,
  synthesizeServerSpanishVoice,
} from './audioEngine';
import {normalizeVideoProject} from './orthography';

export interface ExportProgress {
  stage: 'preparing' | 'voice' | 'frames' | 'audio' | 'encoding' | 'verifying' | 'done';
  percent: number;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  containerFormat: 'mp4' | 'webm';
  isWebmFallback: boolean;
  codecSummary: string;
  engine: 'ffmpeg-wasm' | 'mediarecorder-fallback';
  verified: boolean;
  hasVideoTrack: boolean;
  verifiedWidth: number;
  verifiedHeight: number;
  verifiedDurationSec: number;
  hasVoiceAudio: boolean;
  hasMusicAudio: boolean;
  durationSec: number;
}

export function getDimensionsForAspectRatio(
  aspectRatio: VideoProject['aspectRatio'],
  quality: 'preview' | 'export' = 'export',
): {width: number; height: number} {
  const scale = quality === 'preview' ? 0.5 : 1;
  switch (aspectRatio) {
    case '9:16':
      return {width: Math.round(720 * scale), height: Math.round(1280 * scale)};
    case '1:1':
      return {width: Math.round(720 * scale), height: Math.round(720 * scale)};
    case '16:9':
      return {width: Math.round(1280 * scale), height: Math.round(720 * scale)};
  }
}

export function getProjectTotalDuration(project: VideoProject): number {
  const sum = project.script.scenes.reduce((acc, s) => acc + Math.max(2, s.durationSec), 0);
  return Math.max(3, sum);
}

export function getSceneAtTime(
  scenes: VideoScene[],
  elapsedSec: number,
): {
  scene: VideoScene;
  prevScene?: VideoScene;
  index: number;
  localTime: number;
  progress: number;
  nextScene?: VideoScene;
} {
  let acc = 0;
  for (let i = 0; i < scenes.length; i++) {
    const dur = Math.max(2, scenes[i].durationSec);
    if (elapsedSec < acc + dur || i === scenes.length - 1) {
      const localTime = Math.max(0, elapsedSec - acc);
      return {
        scene: scenes[i],
        prevScene: i > 0 ? scenes[i - 1] : undefined,
        index: i,
        localTime,
        progress: Math.min(1, localTime / dur),
        nextScene: scenes[i + 1],
      };
    }
    acc += dur;
  }
  return {
    scene: scenes[0],
    index: 0,
    localTime: 0,
    progress: 0,
  };
}

/**
 * Splits a scene's text into balanced subtitle chunks and returns the chunk
 * synchronized to the current progress within the scene.
 */
function getTimedSubtitleChunk(scene: VideoScene, progress: number): string {
  const sourceText = (scene.onScreenText || scene.narrationText || '').trim();
  if (!sourceText) return '';

  const words = sourceText.split(/\s+/);
  if (words.length <= 13) return sourceText;

  const chunks: string[] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    const joined = current.join(' ');
    if (
      current.length >= 10 &&
      (w.endsWith('.') || w.endsWith(',') || w.endsWith(';') || w.endsWith(':') || joined.length >= 68)
    ) {
      chunks.push(joined);
      current = [];
    } else if (current.length >= 13) {
      chunks.push(joined);
      current = [];
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  if (chunks.length <= 1) return sourceText;
  const idx = Math.min(chunks.length - 1, Math.floor(progress * chunks.length));
  return chunks[idx];
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2;
}

function computeCameraTransform(
  scene: VideoScene,
  index: number,
  progress: number,
  w: number,
  h: number,
): {zoom: number; panX: number; panY: number} {
  const eased = easeInOutSine(progress);
  const motion =
    scene.cameraMotion ??
    (['zoom_in', 'pan_right', 'ken_burns_up', 'pan_left', 'zoom_out'][index % 5] as NonNullable<
      VideoScene['cameraMotion']
    >);

  switch (motion) {
    case 'zoom_out':
      return {zoom: 1.14 - eased * 0.1, panX: 0, panY: 0};
    case 'pan_left':
      return {zoom: 1.1, panX: (0.5 - eased) * (w * 0.045), panY: 0};
    case 'pan_right':
      return {zoom: 1.1, panX: (eased - 0.5) * (w * 0.045), panY: 0};
    case 'ken_burns_up':
      return {zoom: 1.08 + eased * 0.05, panX: 0, panY: (0.5 - eased) * (h * 0.035)};
    case 'zoom_in':
    default:
      return {zoom: 1.03 + eased * 0.1, panX: (index % 2 === 0 ? -1 : 1) * eased * (w * 0.015), panY: 0};
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  zoom: number,
  panX: number,
  panY = 0,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const canvasRatio = w / h;
  let drawW = w;
  let drawH = h;
  if (imgRatio > canvasRatio) {
    drawH = h * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgRatio;
  }
  const x = (w - drawW) / 2 + panX;
  const y = (h - drawH) / 2 + panY;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

export function drawProjectFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rawProject: VideoProject,
  elapsedSec: number,
  imageMap: Map<string, HTMLImageElement>,
  logoImg?: HTMLImageElement | null,
  backgroundVideo?: HTMLVideoElement | null,
): void {
  const project = normalizeVideoProject(rawProject);
  const totalDur = getProjectTotalDuration(project);
  const clampedTime = Math.max(0, Math.min(totalDur, elapsedSec));
  const {scene, prevScene, index, localTime, progress} = getSceneAtTime(
    project.script.scenes,
    clampedTime,
  );
  const stylePreset = VISUAL_STYLE_PRESETS[project.visualStyle];

  ctx.fillStyle = '#11151E';
  ctx.fillRect(0, 0, width, height);

  const imgKey = scene.customImageDataUrl || SCENE_MAP[scene.imageId]?.src;
  const img = imgKey ? imageMap.get(imgKey) : undefined;
  const prevKey = prevScene ? prevScene.customImageDataUrl || SCENE_MAP[prevScene.imageId]?.src : undefined;
  const prevImg = prevKey ? imageMap.get(prevKey) : undefined;

  const cam = computeCameraTransform(scene, index, progress, width, height);
  let zoom = cam.zoom;
  let panX = cam.panX;
  const panY = cam.panY;
  let alpha = 1;

  const transitionDur = 0.75;
  const inTransition = index > 0 && localTime < transitionDur && scene.transition !== 'cut';

  if (inTransition && prevImg && prevImg.complete && prevImg.naturalWidth > 0 && prevScene) {
    const prevCam = computeCameraTransform(prevScene, index - 1, 1, width, height);
    drawCoverImage(ctx, prevImg, width, height, prevCam.zoom, prevCam.panX, prevCam.panY, 1);
  }

  if (scene.transition === 'fade' && localTime < transitionDur) {
    alpha = easeInOutSine(localTime / transitionDur);
  } else if (scene.transition === 'zoom' && localTime < transitionDur) {
    const t = easeInOutSine(localTime / transitionDur);
    zoom = zoom + (1 - t) * 0.08;
    alpha = Math.min(1, t * 1.15);
  } else if (scene.transition === 'slide' && localTime < transitionDur) {
    const t = easeInOutSine(localTime / transitionDur);
    panX += (1 - t) * (width * 0.12);
    alpha = Math.min(1, t * 1.25);
  }

  if (backgroundVideo && backgroundVideo.readyState >= 2 && backgroundVideo.videoWidth > 0) {
    const vw = backgroundVideo.videoWidth, vh = backgroundVideo.videoHeight;
    const scale = Math.max(width / vw, height / vh);
    const dw = vw * scale, dh = vh * scale;
    ctx.drawImage(backgroundVideo, (width - dw) / 2, (height - dh) / 2, dw, dh);
  } else if (img && img.complete && img.naturalWidth > 0) {
    drawCoverImage(ctx, img, width, height, zoom, panX, panY, alpha);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#263147');
    grad.addColorStop(1, '#11151E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = stylePreset.canvasTint;
  ctx.fillRect(0, 0, width, height);

  const topScrim = ctx.createLinearGradient(0, 0, 0, height * 0.24);
  topScrim.addColorStop(0, 'rgba(9, 11, 16, 0.64)');
  topScrim.addColorStop(1, 'rgba(9, 11, 16, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, width, height * 0.24);

  const bottomScrim = ctx.createLinearGradient(0, height * 0.48, 0, height);
  bottomScrim.addColorStop(0, 'rgba(9, 11, 16, 0)');
  bottomScrim.addColorStop(0.55, 'rgba(9, 11, 16, 0.56)');
  bottomScrim.addColorStop(1, 'rgba(9, 11, 16, 0.88)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, height * 0.48, width, height * 0.52);

  const padX = Math.round(width * 0.075);
  const padY = Math.round(height * 0.055);

  if (scene.bibleRef || project.script.bibleReference) {
    const refText = scene.bibleRef || (index === 0 ? project.script.bibleReference : '');
    if (refText) {
      ctx.font = `600 ${Math.round(width * 0.03)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = stylePreset.accentHex;
      ctx.textAlign = 'left';
      ctx.fillText(refText, padX, padY + Math.round(width * 0.03));
    }
  }

  if (project.showLogo) {
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      const logoSize = Math.round(width * 0.09);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(logoImg, width - padX - logoSize, padY, logoSize, logoSize);
      ctx.restore();
    } else if (project.ministryIdentity.enabled) {
      ctx.font = `600 ${Math.round(width * 0.023)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255, 252, 245, 0.88)';
      ctx.textAlign = 'right';
      ctx.fillText(
        project.ministryIdentity.brandName,
        width - padX,
        padY + Math.round(width * 0.028),
      );
    }
  }

  // Professional Intro Title Overlay (first 2.4s on videos >= 10s)
  const introEnd = 2.4;
  if (project.ministryIdentity.enabled && totalDur >= 10 && clampedTime < introEnd) {
    const introAlpha =
      clampedTime < 0.4
        ? clampedTime / 0.4
        : clampedTime > introEnd - 0.6
          ? Math.max(0, (introEnd - clampedTime) / 0.6)
          : 1;

    ctx.save();
    ctx.globalAlpha = introAlpha;
    ctx.fillStyle = 'rgba(9, 11, 16, 0.42)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    const topBandY = height * 0.25;
    ctx.font = `600 ${Math.round(width * 0.023)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = stylePreset.accentHex;
    ctx.fillText(project.ministryIdentity.brandName, width / 2, topBandY);

    const titleSize =
      project.aspectRatio === '16:9' ? Math.round(height * 0.068) : Math.round(width * 0.062);
    ctx.font = `700 ${titleSize}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = '#FFFFFF';
    const titleLines = wrapTextLines(ctx, project.title, width - padX * 2.2).slice(0, 3);
    const titleLH = Math.round(titleSize * 1.18);
    titleLines.forEach((line, li) => {
      ctx.fillText(line, width / 2, topBandY + Math.round(height * 0.07) + li * titleLH);
    });

    const mottoY =
      topBandY + Math.round(height * 0.085) + titleLines.length * titleLH;
    ctx.font = `500 ${Math.round(width * 0.024)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(244, 241, 234, 0.9)';
    ctx.fillText(
      `${project.ministryIdentity.authorLine} · ${project.ministryIdentity.motto}`,
      width / 2,
      mottoY,
    );
    ctx.restore();
  }

  // Professional Closing Identity Card (last 3.0s on videos >= 8s)
  const isEndingCard =
    project.ministryIdentity.enabled && totalDur >= 8 && clampedTime >= totalDur - 3.0;

  if (isEndingCard) {
    const endFade = Math.min(1, (clampedTime - (totalDur - 3.0)) / 0.55);
    ctx.save();
    ctx.globalAlpha = endFade;
    ctx.fillStyle = 'rgba(9, 11, 16, 0.72)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    const centerY = height * 0.43;
    const brandFontSize =
      project.aspectRatio === '16:9' ? Math.round(width * 0.046) : Math.round(width * 0.056);
    ctx.font = `700 ${brandFontSize}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = stylePreset.accentHex;
    ctx.fillText(project.ministryIdentity.brandName, width / 2, centerY);

    ctx.font = `600 ${Math.round(width * 0.032)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      project.ministryIdentity.authorLine,
      width / 2,
      centerY + Math.round(width * 0.062),
    );

    ctx.font = `600 ${Math.round(width * 0.024)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(244, 241, 234, 0.88)';
    ctx.fillText(
      project.ministryIdentity.motto,
      width / 2,
      centerY + Math.round(width * 0.11),
    );

    if (project.script.bibleReference) {
      ctx.font = `500 ${Math.round(width * 0.023)}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = stylePreset.accentHex;
      ctx.fillText(
        project.script.bibleReference,
        width / 2,
        centerY + Math.round(width * 0.165),
      );
    }
    ctx.restore();
    return;
  }

  if (project.showSubtitles) {
    const captionText = getTimedSubtitleChunk(scene, progress);
    if (captionText) {
      const fontSize =
        project.aspectRatio === '16:9'
          ? Math.round(height * 0.048)
          : Math.round(width * 0.045);

      ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      const maxTextW = width - padX * 2;
      const lines = wrapTextLines(ctx, captionText, maxTextW).slice(0, 4);
      const lineHeight = Math.round(fontSize * 1.32);
      const blockH = lines.length * lineHeight;
      const startY =
        height -
        padY -
        blockH -
        (project.ministryIdentity.enabled ? Math.round(height * 0.045) : 0);

      ctx.fillStyle = 'rgba(9, 11, 16, 0.62)';
      const boxPad = Math.round(fontSize * 0.48);
      ctx.fillRect(
        padX - boxPad * 0.5,
        startY - fontSize - boxPad * 0.35,
        maxTextW + boxPad,
        blockH + boxPad * 0.85,
      );

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, startY + i * lineHeight);
      });
    }
  }

  if (project.ministryIdentity.enabled) {
    ctx.textAlign = 'center';
    ctx.font = `500 ${Math.round(width * 0.021)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(255, 252, 245, 0.8)';
    ctx.fillText(
      `${project.ministryIdentity.brandName} · ${project.ministryIdentity.authorLine}`,
      width / 2,
      height - Math.round(padY * 0.45),
    );
  }
}

export async function preloadProjectImages(
  project: VideoProject,
): Promise<{imageMap: Map<string, HTMLImageElement>; logoImg: HTMLImageElement | null}> {
  const urls = new Set<string>();
  project.script.scenes.forEach((s) => {
    const src = s.customImageDataUrl || SCENE_MAP[s.imageId]?.src;
    if (src) urls.add(src);
  });

  const imageMap = new Map<string, HTMLImageElement>();
  await Promise.all(
    Array.from(urls).map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            imageMap.set(src, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );

  let logoImg: HTMLImageElement | null = null;
  if (project.ministryIdentity.customLogoDataUrl) {
    logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = project.ministryIdentity.customLogoDataUrl!;
    });
  }

  return {imageMap, logoImg};
}

let cachedFfmpeg: FFmpeg | null = null;

async function getFfmpegInstance(): Promise<FFmpeg> {
  if (cachedFfmpeg && cachedFfmpeg.loaded) {
    return cachedFfmpeg;
  }
  const ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  cachedFfmpeg = ffmpeg;
  return ffmpeg;
}

function hasMp4FtypBox(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

async function verifyVideoBlobPlayable(
  blob: Blob,
): Promise<{playable: boolean; width: number; height: number; duration: number}> {
  if (typeof document === 'undefined' || blob.size < 1000) {
    return {playable: false, width: 0, height: 0, duration: 0};
  }
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const finish = (ok: boolean) => {
      const w = video.videoWidth || 0;
      const h = video.videoHeight || 0;
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      resolve({playable: ok && w > 0 && h > 0 && d > 0, width: w, height: h, duration: d});
    };

    video.onloadedmetadata = () => finish(true);
    video.onerror = () => finish(false);
    setTimeout(() => finish(false), 5000);
    video.src = url;
  });
}

async function fallbackMediaRecorderExport(
  project: VideoProject,
  canvas: HTMLCanvasElement,
  imageMap: Map<string, HTMLImageElement>,
  logoImg: HTMLImageElement | null,
  voiceAudioDataUrl: string | undefined,
  onProgress: (p: ExportProgress) => void,
  backgroundVideo?: HTMLVideoElement | null,
): Promise<ExportResult> {
  const totalDur = getProjectTotalDuration(project);
  const fps = 20;
  const ctx = canvas.getContext('2d')!;
  const canvasStream = canvas.captureStream(fps);

  const {buffer: mixBuffer, hasVoice} = await renderProjectMixAudioBuffer({
    musicTrackId: project.musicTrackId,
    musicVolume: project.musicVolume,
    narrationVolume: project.narrationVolume,
    durationSec: totalDur,
    voiceAudioDataUrl,
  });

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
  const liveCtx = new AudioCtx();
  const dest = liveCtx.createMediaStreamDestination();
  const srcNode = liveCtx.createBufferSource();
  srcNode.buffer = mixBuffer;
  srcNode.connect(dest);

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const preferredMime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')
    ? 'video/mp4;codecs=avc1,mp4a.40.2'
    : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: preferredMime,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const donePromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      void liveCtx.close().catch(() => {});
      resolve(new Blob(chunks, {type: preferredMime.split(';')[0]}));
    };
  });

  srcNode.start(0);
  recorder.start(250);
  const startTs = performance.now();

  await new Promise<void>((resolve) => {
    const step = () => {
      const elapsed = (performance.now() - startTs) / 1000;
      if (elapsed >= totalDur) {
        drawProjectFrame(ctx, canvas.width, canvas.height, project, totalDur, imageMap, logoImg, backgroundVideo);
        resolve();
        return;
      }
      if (backgroundVideo && Number.isFinite(backgroundVideo.duration) && backgroundVideo.duration > 0) { backgroundVideo.currentTime = elapsed % backgroundVideo.duration; }
      drawProjectFrame(ctx, canvas.width, canvas.height, project, elapsed, imageMap, logoImg, backgroundVideo);
      onProgress({
        stage: 'encoding',
        percent: Math.min(94, Math.round((elapsed / totalDur) * 85) + 10),
        message: `Finalizando el video (${Math.round(elapsed)}s de ${totalDur}s)...`,
      });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  srcNode.stop();
  recorder.stop();
  const blob = await donePromise;
  const meta = await verifyVideoBlobPlayable(blob);
  const isMp4 = preferredMime.includes('mp4');
  const safeTitle = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '');

  return {
    blob,
    filename: `jairrestaura-${safeTitle || 'video'}.${isMp4 ? 'mp4' : 'webm'}`,
    mimeType: blob.type,
    containerFormat: isMp4 ? 'mp4' : 'webm',
    isWebmFallback: !isMp4,
    codecSummary: isMp4
      ? 'Video MP4 compatible'
      : 'Video compatible (WEBM)',
    engine: 'mediarecorder-fallback',
    verified: meta.playable && blob.size > 1000,
    hasVideoTrack: meta.width > 0 && meta.height > 0,
    verifiedWidth: meta.width || canvas.width,
    verifiedHeight: meta.height || canvas.height,
    verifiedDurationSec: meta.duration || totalDur,
    hasVoiceAudio: hasVoice,
    hasMusicAudio: project.musicTrackId !== 'sin_musica' && project.musicVolume > 0,
    durationSec: totalDur,
  };
}

export async function exportProjectToMp4(
  rawProject: VideoProject,
  onProgress: (p: ExportProgress) => void,
  backgroundBlob?: Blob,
): Promise<ExportResult> {
  const project = normalizeVideoProject(rawProject);
  const totalDur = getProjectTotalDuration(project);
  const {width, height} = getDimensionsForAspectRatio(project.aspectRatio, 'export');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  onProgress({
    stage: 'preparing',
    percent: 4,
    message: 'Cargando escenas bíblicas y tipografía...',
  });

  const {imageMap, logoImg} = await preloadProjectImages(project);
  let backgroundVideo: HTMLVideoElement | null = null;
  let backgroundUrl: string | null = null;
  if (backgroundBlob) {
    backgroundUrl = URL.createObjectURL(backgroundBlob);
    backgroundVideo = document.createElement('video');
    backgroundVideo.muted = true; backgroundVideo.playsInline = true; backgroundVideo.preload = 'auto';
    backgroundVideo.src = backgroundUrl;
    await new Promise<void>((resolve, reject) => { backgroundVideo!.onloadedmetadata = () => resolve(); backgroundVideo!.onerror = () => reject(new Error('No se pudo leer el video de fondo.')); });
  }

  // Respect the currently selected voiceType cleanly
  let voiceAudioDataUrl =
    project.voiceType === 'propia'
      ? project.customVoiceDataUrl
      : project.synthesizedVoiceDataUrl;
  if (!voiceAudioDataUrl && project.voiceType !== 'propia' && project.narrationVolume > 0) {
    onProgress({
      stage: 'voice',
      percent: 8,
      message: 'Preparando voz narrada en español...',
    });
    const ttsRes = await synthesizeServerSpanishVoice(
      project.script.fullNarration,
      project.voiceType,
    );
    if (ttsRes.audioDataUrl) {
      voiceAudioDataUrl = ttsRes.audioDataUrl;
    }
  }

  try {
    onProgress({
      stage: 'preparing',
      percent: 12,
      message: 'Preparando tu mensaje...',
    });

    const ffmpeg = await getFfmpegInstance();
    const fps = 10; // Exportación rápida: reduce un tercio los fotogramas sin cambiar la resolución.
    const totalFrames = Math.max(15, Math.round(totalDur * fps));

    for (let f = 0; f < totalFrames; f++) {
      const t = (f / totalFrames) * totalDur;
      if (backgroundVideo && Number.isFinite(backgroundVideo.duration) && backgroundVideo.duration > 0) {
        const target = t % backgroundVideo.duration;
        if (Math.abs(backgroundVideo.currentTime - target) > 0.04) {
          await new Promise<void>((resolve) => { backgroundVideo!.onseeked = () => resolve(); backgroundVideo!.currentTime = target; });
        }
      }
      drawProjectFrame(ctx, width, height, project, t, imageMap, logoImg, backgroundVideo);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), 'image/jpeg', 0.78),
      );
      if (blob) {
        const name = `frame_${String(f).padStart(5, '0')}.jpg`;
        await ffmpeg.writeFile(name, await fetchFile(blob));
      }
      if (f % 10 === 0 || f === totalFrames - 1) {
        const pct = 14 + Math.round((f / totalFrames) * 44);
        onProgress({
          stage: 'frames',
          percent: pct,
          message: `Organizando las escenas (${f + 1} de ${totalFrames})...`,
        });
      }
    }

    onProgress({
      stage: 'audio',
      percent: 62,
      message: voiceAudioDataUrl
        ? 'Añadiendo tu narración y música...'
        : 'Añadiendo música de fondo...',
    });

    const {wavBytes, hasVoice} = await renderProjectMixWav({
      musicTrackId: project.musicTrackId,
      musicVolume: project.musicVolume,
      narrationVolume: project.narrationVolume,
      durationSec: totalDur,
      voiceAudioDataUrl,
    });
    await ffmpeg.writeFile('audio.wav', wavBytes);

    onProgress({
      stage: 'encoding',
      percent: 70,
      message: 'Finalizando el video...',
    });

    ffmpeg.on('progress', ({progress}) => {
      if (Number.isFinite(progress)) {
        const pct = 70 + Math.min(25, Math.round(progress * 25));
        onProgress({
          stage: 'encoding',
          percent: pct,
          message: 'Finalizando el video...',
        });
      }
    });

    await ffmpeg.exec([
      '-framerate',
      String(fps),
      '-i',
      'frame_%05d.jpg',
      '-i',
      'audio.wav',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'stillimage',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-shortest',
      '-movflags',
      '+faststart',
      'output.mp4',
    ]);

    onProgress({
      stage: 'verifying',
      percent: 96,
      message: 'Verificando reproducción e integridad del archivo MP4...',
    });

    const outData = (await ffmpeg.readFile('output.mp4')) as Uint8Array;
    const isIsoMp4 = outData.length > 1000 && hasMp4FtypBox(outData);

    for (let f = 0; f < totalFrames; f++) {
      await ffmpeg.deleteFile(`frame_${String(f).padStart(5, '0')}.jpg`).catch(() => {});
    }
    await ffmpeg.deleteFile('audio.wav').catch(() => {});
    await ffmpeg.deleteFile('output.mp4').catch(() => {});

    if (!isIsoMp4) {
      throw new Error('Verificación MP4 fallida');
    }

    const blob = new Blob([new Uint8Array(outData)], {type: 'video/mp4'});
    const meta = await verifyVideoBlobPlayable(blob);

    const safeTitle = project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '');

    onProgress({
      stage: 'done',
      percent: 100,
      message: 'Video MP4 verificado y listo para descargar y compartir.',
    });

    return {
      blob,
      filename: `jairrestaura-${safeTitle || 'video'}.mp4`,
      mimeType: 'video/mp4',
      containerFormat: 'mp4',
      isWebmFallback: false,
      codecSummary: 'Video MP4 compatible (alta calidad)',
      engine: 'ffmpeg-wasm',
      verified: isIsoMp4 && meta.playable,
      hasVideoTrack: meta.width > 0 && meta.height > 0,
      verifiedWidth: meta.width || width,
      verifiedHeight: meta.height || height,
      verifiedDurationSec: meta.duration || totalDur,
      hasVoiceAudio: hasVoice,
      hasMusicAudio: project.musicTrackId !== 'sin_musica' && project.musicVolume > 0,
      durationSec: totalDur,
    };
  } catch (err) {
    console.warn('FFmpeg.wasm unavailable, falling back to local MediaRecorder:', err);
    onProgress({
      stage: 'encoding',
      percent: 20,
      message: 'Finalizando el video en tu navegador...',
    });
    const fallbackResult = await fallbackMediaRecorderExport(
      project,
      canvas,
      imageMap,
      logoImg,
      voiceAudioDataUrl,
      onProgress,
      backgroundVideo,
    );
    onProgress({
      stage: 'done',
      percent: 100,
      message: 'Video generado localmente y verificado.',
    });
    return fallbackResult;
  } finally {
    if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  }
}
