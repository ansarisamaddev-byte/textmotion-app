export function retimeCaptionsSequential(captions, gap = 0.1) {
  let cursor = 0;
  return captions.map(cap => {
    const blockDuration = Math.max(0.3, parseFloat(cap.end) - parseFloat(cap.start));
    const start = parseFloat(cursor.toFixed(2));
    const end = parseFloat((cursor + blockDuration).toFixed(2));
    cursor = end + gap;
    return { ...cap, start, end };
  });
}
