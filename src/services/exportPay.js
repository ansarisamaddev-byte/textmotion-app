export async function renderVideoToBlob({
  exportVideoFn,
  videoSrc,
  mainVideo,
  captions,
  captionStyles,
  elements,
  duration,
  isExportingRef,
  onProgress,
  onStatus
}) {
  // exportVideo currently triggers a download internally.
  // To keep changes minimal, we re-render by temporarily monkeypatching download behavior
  // via a provided exportVideoFn that returns a Blob.
  return await exportVideoFn({
    videoSrc,
    mainVideo,
    captions,
    captionStyles,
    elements,
    duration,
    isExportingRef,
    onProgress,
    onStatus,
    returnBlob: true
  });
}

export async function uploadLockedExport(blob) {
  const form = new FormData();
  form.append('video', blob, 'video.mp4');
  const res = await fetch('http://localhost:5174/api/exports', {
    method: 'POST',
    body: form
  });
  if (!res.ok) throw new Error('upload_failed');
  return await res.json();
}

export function downloadLockedZip(downloadUrl, exportId) {
  const a = document.createElement('a');
  a.href = `http://localhost:5174${downloadUrl}`;
  a.download = `textmotion-${exportId}.zip`;
  a.click();
}

// In your frontend file
export async function createRazorpayOrder({ exportId, amountInr }) {
  const res = await fetch('http://localhost:5174/api/payments/order', { // Your backend, not Razorpay's API
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountInr: amountInr,
      exportId: exportId
    })
  });
  
  console.log(res);
  if (!res.ok) throw new Error('Order creation failed');
  return await res.json();
}

export async function pollExportStatus(exportId) {
  const res = await fetch(`http://localhost:5174/api/exports/${exportId}/status`);
  if (!res.ok) throw new Error('status_failed');
  return await res.json();
}