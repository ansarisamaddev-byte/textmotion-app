import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { renderCaptionFrame } from '../lib/captionRenderer';

export async function exportVideo({
  videoSrc,
  mainVideo,
  captions,
  captionStyles,
  elements = [],
  duration,
  isExportingRef,
  onProgress,
  onStatus,
  returnBlob = false
}) {
  const nativeWidth = mainVideo.videoWidth || 1080;
  const nativeHeight = mainVideo.videoHeight || 1920;
  const originalTime = mainVideo.currentTime;

  mainVideo.pause();

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: nativeWidth, height: nativeHeight },
    audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 44100 },
    fastStart: 'fragmented'
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('Video encoder error:', e)
  });
  await videoEncoder.configure({
    codec: 'avc1.4d002a',
    width: nativeWidth,
    height: nativeHeight,
    bitrate: 8000000,
    framerate: 30,
    latencyMode: 'quality'
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error('Audio encoder error:', e)
  });
  await audioEncoder.configure({
    codec: 'mp4a.40.2',
    numberOfChannels: 2,
    sampleRate: 44100,
    bitrate: 192000
  });

  try {
    const response = await fetch(videoSrc);
    const arrayBuffer = await response.arrayBuffer();
    const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await tempCtx.decodeAudioData(arrayBuffer);
    tempCtx.close();
    const offlineCtx = new OfflineAudioContext(2, Math.floor(duration * 44100), 44100);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    const len = rendered.length;
    const audioDataBlock = new AudioData({
      format: 'f32-planar',
      sampleRate: 44100,
      numberOfFrames: len,
      numberOfChannels: 2,
      timestamp: 0,
      data: new Float32Array([...rendered.getChannelData(0), ...rendered.getChannelData(1)])
    });
    audioEncoder.encode(audioDataBlock);
    audioDataBlock.close();
  } catch (e) {
    console.warn('Audio extraction skipped', e);
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = nativeWidth;
  exportCanvas.height = nativeHeight;
  const exportCtx = exportCanvas.getContext('2d');

  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  for (let frameCount = 0; frameCount < totalFrames; frameCount++) {
    if (!isExportingRef.current) {
      videoEncoder.close();
      audioEncoder.close();
      mainVideo.currentTime = originalTime;
      return returnBlob ? null : false;
    }

    const currentFrameTime = frameCount / fps;
    if (currentFrameTime >= duration) break;

    mainVideo.currentTime = currentFrameTime;

    await new Promise((resolve) => {
      if ('requestVideoFrameCallback' in mainVideo) {
        mainVideo.requestVideoFrameCallback(() => resolve());
      } else {
        const onSeeked = () => {
          mainVideo.removeEventListener('seeked', onSeeked);
          setTimeout(resolve, 40);
        };
        mainVideo.addEventListener('seeked', onSeeked);
      }
    });

    renderCaptionFrame(exportCtx, exportCanvas, mainVideo, captions, captionStyles, elements);

    const frameInstance = new VideoFrame(exportCanvas, {
      timestamp: frameCount * (1000000 / fps),
      duration: 1000000 / fps
    });

    videoEncoder.encode(frameInstance, { keyFrame: frameCount % 90 === 0 });
    frameInstance.close();

    onProgress(Math.floor((currentFrameTime / duration) * 100));
    // Small yield so the UI can keep responding
    await new Promise(r => setTimeout(r, 5));
  }

  if (!isExportingRef.current) return returnBlob ? null : false;

  onStatus('Compiling final video...');
  await videoEncoder.flush();
  await audioEncoder.flush();
  muxer.finalize();

  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  if (!returnBlob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `render-${Date.now()}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  }

  mainVideo.currentTime = originalTime;
  return returnBlob ? blob : true;
}
