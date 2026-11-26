// Ridge Runner — sound: everything is synthesised with WebAudio, so the
// game ships no audio files and makes no network request. Engine hum, ring
// chime, pickup blip, stall warning, landing jingle and a crash thud.

export function makeAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine hum: two detuned saws through a low-pass, pitch follows throttle.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 55 * 1.005;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineOsc.connect(filter);
      osc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      osc2.start();
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function engine(throttle, flying) {
    if (!ctx || muted) return;
    const target = flying ? 0.05 + throttle * 0.08 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 46, ctx.currentTime, 0.1);
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  return {
    resume,
    engine,
    ring() {
      blip(880, 0.25, 'sine', 0.25);
      blip(1318, 0.35, 'sine', 0.2, 0.08);
    },
    pickup() {
      blip(660, 0.12, 'triangle', 0.25);
      blip(990, 0.18, 'triangle', 0.22, 0.07);
    },
    warn() {
      blip(220, 0.18, 'square', 0.12);
    },
    crash() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const dur = 0.5;
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.4;
      src.connect(g);
      g.connect(master);
      src.start(t);
      blip(70, 0.5, 'sine', 0.3);
    },
    land() {
      blip(523, 0.15, 'sine', 0.22);
      blip(659, 0.15, 'sine', 0.22, 0.12);
      blip(784, 0.3, 'sine', 0.22, 0.24);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
