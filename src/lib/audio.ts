export function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const result = new Uint8Array(44 + pcm.length);
  const view = new DataView(result.buffer);
  const write = (offset: number, text: string) => { for (let i = 0; i < text.length; i++) result[offset + i] = text.charCodeAt(i); };
  write(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, pcm.length, true); result.set(pcm, 44); return result;
}
