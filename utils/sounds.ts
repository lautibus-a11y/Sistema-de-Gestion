
// Gestor de sonidos sutiles para feedback táctil
const createAudio = (freq: number, type: OscillatorType, duration: number, volume: number) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };
};

export const playSound = {
  click: createAudio(150, 'sine', 0.1, 0.1),
  success: createAudio(440, 'sine', 0.3, 0.1),
  pop: createAudio(200, 'sine', 0.05, 0.05),
  error: createAudio(100, 'sawtooth', 0.2, 0.05),
};
