// Clawd's pixel world. One canvas of square pixels, drawn as SVG rects on
// the desktop and as half-block cells (two pixels per cell) in the terminal.
// Clawd's own pixels are the banner's: one wide, two tall.

export const W = 34
export const H = 18
export const NONE = -1

const OX = 8 // Clawd's left edge
const OY = 8 // Clawd's body top (rows 8..15 body, 16..17 legs)

export const PAL: Record<string, number> = {
  O: 0xd97757, // Clawd
  D: 0x1f1e1d, // eyes
  W: 0xf2f2f2,
  R: 0xe04848,
  r: 0x9e2a2a,
  B: 0x3f6fd1,
  b: 0x9cc4f0,
  G: 0x4caf50,
  Y: 0xf2c94c,
  A: 0xf0a030,
  P: 0xff8fa3,
  V: 0x7a4fc0,
  N: 0x6b4226,
  g: 0x9a9a9a,
  K: 0x2b2b2b,
  L: 0x8bc34a,
}

export type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'x' | 'angry'
export type Arms = 'down' | 'up' | 'waveR' | 'type'
export type Legs = 'stand' | 'walk' | 'stomp'
export type Hat = 'santa' | 'party' | 'witch' | 'nightcap' | 'beanie' | 'flower'
export type Icon =
  | 'terminal'
  | 'pencil'
  | 'magnifier'
  | 'globe'
  | 'mini'
  | 'bolt'
  | 'spinner'
  | 'bang'
  | 'question'
  | 'cross'
  | 'check'
export type Particle =
  | 'snow'
  | 'petals'
  | 'leaves'
  | 'confetti'
  | 'sparkles'
  | 'fireworks'
  | 'steam'
  | 'zzz'
  | 'hearts'
  | 'drop'

export type Look = {
  dx: number
  dy: number
  squish: number
  isFlipped: boolean
  eyes: Eyes
  eyeDx: number
  arms: Arms
  legs: Legs
  hat?: Hat
  hasGlasses: boolean
  hasPajamas: boolean
  hasMug: boolean
  hasSun: boolean
  hasFlag: boolean
  icon?: Icon
  isIconBlinking: boolean
  particles: Particle[]
  dim: number
}

export const BASE_LOOK: Look = {
  dx: 0,
  dy: 0,
  squish: 0,
  isFlipped: false,
  eyes: 'open',
  eyeDx: 0,
  arms: 'down',
  legs: 'stand',
  hasGlasses: false,
  hasPajamas: false,
  hasMug: false,
  hasSun: false,
  hasFlag: false,
  isIconBlinking: false,
  particles: [],
  dim: 1,
}

export class Canvas {
  px: number[] = Array(W * H).fill(NONE)

  set(x: number, y: number, c: number) {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && x < W && y >= 0 && y < H) this.px[y * W + x] = c
  }

  get(x: number, y: number) {
    return x >= 0 && x < W && y >= 0 && y < H ? this.px[y * W + x] : NONE
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }

  sprite(rows: readonly string[], x: number, y: number) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = PAL[row[i]]
        if (c !== undefined) this.set(x + i, y + j, c)
      }
    })
  }

  over(top: Canvas) {
    top.px.forEach((c, i) => {
      if (c !== NONE) this.px[i] = c
    })
  }
}

// ---------------------------------------------------------------- sprites

const HATS: Record<Hat, { rows: string[]; x: number }> = {
  santa: {
    x: 3,
    rows: [
      '..........WW',
      '.........RR.',
      '.......RRR..',
      '....RRRRR...',
      '..RRRRRRRR..',
      'WWWWWWWWWWWW',
    ],
  },
  party: {
    x: 6,
    rows: ['..Y..', '..P..', '.PYP.', '.YPY.', 'PYPYP'],
  },
  witch: {
    x: 3,
    rows: [
      '.......VV...',
      '......VV....',
      '.....VVV....',
      '....VVVVV...',
      '...VAAAAV...',
      'VVVVVVVVVVVV',
    ],
  },
  nightcap: {
    x: 3,
    rows: ['......BBbbW.', '....bbBBbbBW', '..BBbbBBbbB.', 'WWWWWWWWWWWW'],
  },
  beanie: {
    x: 3,
    rows: ['.....WW.....', '...RRRRRR...', '..RRRRRRRR..', '.rrrrrrrrrr.'],
  },
  flower: {
    x: 10,
    rows: ['.P.', 'PYP', '.P.', '.L.'],
  },
}

const ICONS: Record<Icon, string[][]> = {
  terminal: [['ggggg', 'gKKKg', 'gWKKg', 'gKWWg', 'ggggg']],
  pencil: [['....P', '...Y.', '..Y..', '.Y...', 'N....']],
  magnifier: [['.ggg.', 'gb..g', 'g...g', '.ggg.', '....g']],
  globe: [['.BBB.', 'BGBGB', 'BBGBB', 'BGBBG', '.BBB.']],
  mini: [['.OOOOO.', '.ODODO.', 'OOOOOOO', '.O...O.']],
  bolt: [['..YY.', '.YY..', 'YYYY.', '..YY.', '.YY..']],
  spinner: [
    ['..O..', '..O..', 'OOOOO', '..O..', '..O..'],
    ['O...O', '.O.O.', '..O..', '.O.O.', 'O...O'],
  ],
  bang: [['.R.', '.R.', '.R.', '...', '.R.']],
  question: [['AAA', '..A', '.AA', '...', '.A.']],
  cross: [['R...R', '.R.R.', '..R..', '.R.R.', 'R...R']],
  check: [['.....', '....G', '...G.', 'G.G..', '.G...']],
}

const SUN = [
  ['Y.Y.Y', '.YYY.', 'YYAYY', '.YYY.', 'Y.Y.Y'],
  ['..Y..', '.YYY.', 'YYAYY', '.YYY.', '..Y..'],
]
const MUG = ['WNNW..', 'WWWWW.', 'WWWW.W', 'WWWWW.', '.WWW..']
const FLAG = ['RRRRR', 'RRWRR', 'RWWWR', 'RRWRR', 'RRRRR']
const HEART = ['P.P', 'PPP', '.P.']
const ZED = ['gggg', '..g.', '.g..', 'gggg']
const GLASSES = ['KKKKKKKKKK', 'bKK....bKK']

// ---------------------------------------------------------------- drawing

function rand(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function drawClawd(c: Canvas, look: Look, t: number) {
  const s = look.squish
  const x0 = OX + look.dx
  const top = OY + look.dy + s
  const O = PAL.O
  const D = PAL.D

  // body: 12 x 8, squished shorter and wider
  c.rect(x0 + 3 - s, top, 12 + 2 * s, 8 - s, O)

  // arms
  const armY = top + 4
  const left = () => c.rect(x0 + 1 - s, armY, 2, 2, O)
  const right = () => c.rect(x0 + 15 + s, armY, 2, 2, O)
  const leftUp = () => {
    c.rect(x0 + 1 - s, armY - 2, 2, 2, O)
    c.rect(x0 + 1 - s, armY - 4, 1, 2, O)
  }
  const rightUp = (lean = 0) => {
    c.rect(x0 + 15 + s, armY - 2, 2, 2, O)
    c.rect(x0 + 16 + s + lean, armY - 4, 1, 2, O)
  }
  if (look.arms === 'down') {
    left()
    right()
  } else if (look.arms === 'up') {
    leftUp()
    rightUp()
  } else if (look.arms === 'waveR') {
    left()
    rightUp(t % 2)
  } else {
    // typing: one arm dips, then the other
    c.rect(x0 + 1 - s, armY + (t % 2 === 0 ? 1 : 0), 2, 2, O)
    c.rect(x0 + 15 + s, armY + (t % 2 === 1 ? 1 : 0), 2, 2, O)
  }

  // legs: four, one wide, two tall
  const legY = OY + look.dy + 8
  const legXs = [4, 6, 11, 13]
  legXs.forEach((lx, i) => {
    let x = x0 + lx
    let h = 2
    if (look.legs === 'walk' && t % 2 === 1) x += 1
    if (look.legs === 'stomp' && (i < 2) === (t % 2 === 0)) h = 1
    c.rect(x, legY, 1, h, O)
  })

  // eyes at 5 and 12, rows 2..3 of the body
  const ey = top + 2 - (s > 1 ? 1 : 0)
  for (const [ex, inward] of [
    [x0 + 5 + look.eyeDx, 1],
    [x0 + 12 + look.eyeDx, -1],
  ] as const) {
    switch (look.eyes) {
      case 'open':
        c.rect(ex, ey, 1, 2, D)
        break
      case 'closed':
        c.set(ex, ey + 1, D)
        c.set(ex + inward, ey + 1, D)
        break
      case 'happy':
        c.set(ex - 1, ey + 1, D)
        c.set(ex, ey, D)
        c.set(ex + 1, ey + 1, D)
        break
      case 'wide':
        c.rect(ex, ey - 1, 1, 3, D)
        c.set(ex, ey - 1, PAL.W)
        break
      case 'x':
        c.set(ex - 1, ey - 1, D)
        c.set(ex + 1, ey - 1, D)
        c.set(ex, ey, D)
        c.set(ex - 1, ey + 1, D)
        c.set(ex + 1, ey + 1, D)
        break
      case 'angry':
        c.rect(ex, ey, 1, 2, D)
        c.set(ex - inward, ey - 2, D)
        c.set(ex, ey - 2, D)
        c.set(ex + inward, ey - 1, D)
        break
    }
  }

  if (look.hasPajamas) {
    for (let y = top + 6 - s; y <= legY + 1; y++) {
      for (let x = 0; x < W; x++) {
        if (c.get(x, y) === O) c.set(x, y, x % 2 === 0 ? PAL.B : PAL.b)
      }
    }
  }

  if (look.hasGlasses && (look.eyes === 'open' || look.eyes === 'happy')) {
    c.sprite(GLASSES, x0 + 4, ey)
  }

  if (look.hat) {
    const hat = HATS[look.hat]
    c.sprite(hat.rows, x0 + hat.x, top - hat.rows.length)
  }
}

function drawParticles(back: Canvas, front: Canvas, look: Look, t: number) {
  for (const p of look.particles) {
    switch (p) {
      case 'snow':
        for (let i = 0; i < 12; i++) {
          const x = Math.floor(rand(i) * W + Math.sin((t + i * 5) / 4))
          const y = (Math.floor(t / 2) + Math.floor(rand(i + 50) * H)) % H
          back.set(x, y, PAL.W)
        }
        break
      case 'petals':
        for (let i = 0; i < 8; i++) {
          const y = (Math.floor(t / 3) + Math.floor(rand(i + 7) * H)) % H
          const x = (Math.floor(rand(i) * W) + Math.floor(t / 4)) % W
          back.set(x, y, PAL.P)
        }
        break
      case 'leaves':
        for (let i = 0; i < 8; i++) {
          const y = (Math.floor(t / 2) + Math.floor(rand(i + 3) * H)) % H
          const x = Math.floor(rand(i + 9) * W + 2 * Math.sin((t + i * 3) / 3))
          const color = [PAL.R, PAL.A, PAL.Y][i % 3]
          back.set(x, y, color)
          back.set(x + 1, y, color)
        }
        break
      case 'confetti':
        for (let i = 0; i < 16; i++) {
          const y = (t + Math.floor(rand(i + 1) * H)) % H
          const x = Math.floor(rand(i + 2) * W)
          front.set(x, y, [PAL.R, PAL.Y, PAL.G, PAL.B, PAL.P, PAL.V][i % 6])
        }
        break
      case 'sparkles': {
        const spots = [
          [5, 5],
          [27, 4],
          [3, 11],
          [30, 12],
          [16, 2],
          [24, 1],
        ]
        spots.forEach(([x, y], i) => {
          const phase = (t + i * 2) % 6
          if (phase === 0 || phase === 2) front.set(x, y, PAL.Y)
          if (phase === 1) {
            front.set(x, y, PAL.Y)
            front.set(x - 1, y, PAL.Y)
            front.set(x + 1, y, PAL.Y)
            front.set(x, y - 1, PAL.Y)
            front.set(x, y + 1, PAL.Y)
          }
        })
        break
      }
      case 'fireworks':
        for (let k = 0; k < 2; k++) {
          const cycle = Math.floor((t + k * 6) / 12)
          const phase = (t + k * 6) % 12
          const cx = 3 + Math.floor(rand(cycle * 3 + k) * (W - 6))
          const cy = 2 + Math.floor(rand(cycle * 5 + k) * 5)
          const color = [PAL.R, PAL.Y, PAL.G, PAL.B, PAL.P, PAL.W][(cycle + k) % 6]
          if (phase < 3) {
            back.set(cx, cy + 6 - phase * 2, PAL.Y)
          } else if (phase < 8) {
            const r = phase - 3
            for (const [ddx, ddy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
              [1, 1],
              [-1, -1],
              [1, -1],
              [-1, 1],
            ]) {
              back.set(cx + ddx * r, cy + ddy * r, color)
            }
          }
        }
        break
      case 'steam':
        for (let k = 0; k < 2; k++) {
          const phase = (t + k * 2) % 4
          const y = OY + look.dy - 1 - phase
          back.rect(OX + look.dx + (k === 0 ? 0 : 16) + (phase % 2), y, 2, 1, PAL.g)
        }
        break
      case 'zzz': {
        const a = t % 12
        front.sprite(ZED, 26 + Math.floor(a / 4), 9 - Math.floor(a / 2))
        const b = (t + 6) % 12
        if (b < 8) front.sprite(ZED, 26 + Math.floor(b / 4), 9 - Math.floor(b / 2))
        break
      }
      case 'hearts':
        for (let k = 0; k < 3; k++) {
          const phase = (t + k * 3) % 9
          const x = [3, 15, 27][k] + Math.round(Math.sin((t + k) / 2))
          front.sprite(HEART, x, 8 - phase)
        }
        break
      case 'drop': {
        const phase = t % 5
        front.rect(OX + look.dx + 18, OY + look.dy + phase, 1, 2, PAL.b)
        break
      }
    }
  }
}

export function draw(look: Look, t: number): Canvas {
  const back = new Canvas()
  const mid = new Canvas()
  const front = new Canvas()

  if (look.hasSun) back.sprite(SUN[Math.floor(t / 4) % 2], 0, 0)
  if (look.hasFlag) {
    back.rect(0, 4, 1, 14, PAL.g)
    back.sprite(FLAG, 1, 4)
  }
  if (look.hasMug) {
    back.sprite(MUG, 0, H - MUG.length)
    for (let k = 0; k < 2; k++) {
      const phase = (t + k * 3) % 6
      back.set(1 + k * 2 + (phase % 2), H - MUG.length - 1 - phase, PAL.g)
    }
  }

  drawParticles(back, front, look, t)
  drawClawd(mid, look, t)

  if (look.isFlipped) {
    const flipped = new Canvas()
    const lo = OY + look.dy
    const hi = OY + look.dy + 9
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = mid.get(x, y)
        if (c !== NONE) flipped.set(x, lo + hi - y, c)
      }
    }
    back.over(flipped)
  } else {
    back.over(mid)
  }

  if (look.icon && !(look.isIconBlinking && t % 4 >= 2)) {
    const frames = ICONS[look.icon]
    const frame = frames[Math.floor(t / 2) % frames.length]
    back.sprite(frame, 27, 3)
  }

  back.over(front)
  return back
}

// ---------------------------------------------------------------- output

function shade(c: number, dim: number) {
  if (dim >= 1) return c
  const r = Math.round(((c >> 16) & 255) * dim)
  const g = Math.round(((c >> 8) & 255) * dim)
  const b = Math.round((c & 255) * dim)
  return (r << 16) | (g << 8) | b
}

export function toSvg(c: Canvas, dim: number) {
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')
  const rects: string[] = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      const color = c.get(x, y)
      let end = x + 1
      while (end < W && c.get(end, y) === color) end++
      if (color !== NONE) {
        rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${hex(color)}"/>`)
      }
      x = end
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">` +
    `<g opacity="${dim}">${rects.join('')}</g></svg>`
  )
}

const DEFAULT = 0x01000000

function encode(words: number[]) {
  return new Uint8Array(Uint32Array.from(words).buffer).toBase64()
}

// Full size: one cell per pixel column, two pixel rows per cell.
export function toRaster(c: Canvas, dim: number) {
  const words: number[] = []
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x++) {
      const a = c.get(x, y)
      const b = c.get(x, y + 1)
      if (a === NONE && b === NONE) words.push(0x20, DEFAULT, DEFAULT)
      else if (b === NONE) words.push(0x2580, shade(a, dim), DEFAULT)
      else if (a === NONE) words.push(0x2584, shade(b, dim), DEFAULT)
      else words.push(0x2580, shade(a, dim), shade(b, dim))
    }
  }
  return { columns: W, rows: H / 2, cells: encode(words) }
}

// Compact: Clawd alone as the banner draws him, 9 x 3 cells of quadrant
// blocks, each quadrant one banner pixel (one canvas column, two rows).
const QUAD = [
  0x20, 0x2598, 0x259d, 0x2580, 0x2596, 0x258c, 0x259e, 0x259b, 0x2597, 0x259a, 0x2590, 0x259c,
  0x2584, 0x2599, 0x259f, 0x2588,
]

export function toMiniRaster(c: Canvas, look: Look, dim: number) {
  const words: number[] = []
  const x0 = OX + look.dx
  const y0 = OY + look.dy - 2
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const at = (qx: number, qy: number) => c.get(x0 + col * 2 + qx, y0 + row * 4 + qy * 2)
      const quad = [at(0, 0), at(1, 0), at(0, 1), at(1, 1)]
      const color = quad.find(q => q !== NONE && q !== PAL.D) ?? NONE
      const bits = quad.reduce((acc, q, i) => (q === color && q !== NONE ? acc | (1 << i) : acc), 0)
      words.push(QUAD[bits], color === NONE ? DEFAULT : shade(color, dim), DEFAULT)
    }
  }
  return { columns: 9, rows: 3, cells: encode(words) }
}
