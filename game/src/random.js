// Ridge Runner — seeded random numbers, so every mission's world is
// deterministic: the same seed always builds the same ridge, rings and town.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1D value noise: smooth, repeatable bumps for the ridge line.
export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const grid = [];
  for (let i = 0; i < 512; i++) grid.push(rand() * 2 - 1);
  const smooth = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = grid[((i % 512) + 512) % 512];
    const b = grid[(((i + 1) % 512) + 512) % 512];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
  return (x) => smooth(x * 0.5) * 0.6 + smooth(x * 1.7) * 0.3 + smooth(x * 4.3) * 0.1;
}

export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

export function range(rand, min, max) {
  return min + rand() * (max - min);
}
