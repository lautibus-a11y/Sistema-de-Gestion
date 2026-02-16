// Gestor de sonidos sutiles para feedback táctil (Singleton Lazy)

let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx) {
    // Lazy init para evitar bloqueo de autoplay o límite de contextos
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number) => {
  try {
    const ctx = getContext();
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
  } catch (e) {
    console.error("Audio error (ignorable):", e);
  }
};

export const playSound = {
  click: () => playTone(150, 'sine', 0.1, 0.1),
  success: () => playTone(440, 'sine', 0.3, 0.1),
  pop: () => playTone(200, 'sine', 0.05, 0.05),
  error: () => playTone(100, 'sawtooth', 0.2, 0.05),
};
