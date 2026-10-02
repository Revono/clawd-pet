import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Base, BaseKind, Reaction, ReactionKind, Settings, ToolsToday } from '../types'
import { BASE_LOOK, draw, toMiniRaster, toRaster, toSvg } from './sprites'
import type { Hat, Icon, Look, Particle } from './sprites'

// ---------------------------------------------------------------- state

const base = atom({ plugin: 'clawd-pet', key: 'base' } as const, {
  kind: 'hi',
  since: 0,
  line: '',
  detail: '',
} as Base)
const reaction = atom({ plugin: 'clawd-pet', key: 'reaction' } as const, null as Reaction | null)
const settings = atom({ plugin: 'clawd-pet', key: 'settings' } as const, {
  isHidden: false,
  moods: true,
  reactions: true,
  tantrums: true,
  hemisphere: 'north',
} as Settings)
const tick = atom({ plugin: 'clawd-pet', key: 'tick' } as const, 0)
const toolsToday = atom({ plugin: 'clawd-pet', key: 'toolsToday' } as const, {
  date: '',
  count: 0,
} as ToolsToday)
const demoStart = atom({ plugin: 'clawd-pet', key: 'demoStart' } as const, null as number | null)
const tzOffset = atom({ plugin: 'clawd-pet', key: 'tzOffset' } as const, null as number | null)

type Dollar = EngineInterface

async function setBase($: Dollar, kind: BaseKind, line = '', detail = '') {
  const since = await $.clock.now()
  await update($, base, () => ({ kind, since, line, detail }))
}

async function react($: Dollar, kind: ReactionKind, line: string, ms: number) {
  const until = (await $.clock.now()) + ms
  await update($, reaction, () => ({ kind, line, until }))
}

// ---------------------------------------------------------------- time

type Local = { year: number; month: number; day: number; hour: number; minute: number }

function localTime(now: number, offsetMin: number | null): Local {
  const offset = offsetMin ?? -new Date(now).getTimezoneOffset()
  const d = new Date(now + offset * 60_000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (l: Local) => `${l.year}-${pad(l.month)}-${pad(l.day)}`
const clock = (l: Local) => `${pad(l.hour)}:${pad(l.minute)}`

async function detectOffset($: Dollar): Promise<number | null> {
  try {
    const r = await $.process.run(['date', '+%z'], { timeoutMs: 5_000 })
    const m = /^([+-])(\d\d)(\d\d)/.exec(r.stdout.trim())
    if (r.exitCode === 0 && m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
  } catch {}
  try {
    const r = await $.process.run(
      [
        'powershell',
        '-NoProfile',
        '-Command',
        '[int][TimeZoneInfo]::Local.GetUtcOffset([DateTime]::Now).TotalMinutes',
      ],
      { timeoutMs: 15_000 },
    )
    const n = Number(r.stdout.trim())
    if (r.exitCode === 0 && Number.isFinite(n)) return n
  } catch {}
  return null
}

// ---------------------------------------------------------------- calendar

type Season = 'winter' | 'spring' | 'summer' | 'autumn'
type Holiday = 'xmas' | 'newyear' | 'swiss' | 'halloween' | 'april' | 'bday'

function season(l: Local, hemisphere: Settings['hemisphere']): Season {
  const m = hemisphere === 'south' ? ((l.month + 5) % 12) + 1 : l.month
  if (m === 12 || m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'autumn'
}

function holiday(l: Local): Holiday | undefined {
  const { month: m, day: d, hour: h } = l
  if (m === 12 && d >= 24 && d <= 26) return 'xmas'
  if ((m === 12 && d === 31 && h >= 18) || (m === 1 && d === 1)) return 'newyear'
  if (m === 8 && d === 1) return 'swiss'
  if (m === 10 && d === 31) return 'halloween'
  if (m === 4 && d === 1) return 'april'
  if (m === 2 && d === 24) return 'bday'
  return undefined
}

function holidayText(h: Holiday, l: Local): [string, string] {
  switch (h) {
    case 'xmas':
      return ['Merry Xmas!', 'ho ho ho']
    case 'newyear':
      return ['Guets Neus!', `hello ${l.month === 12 ? l.year + 1 : l.year}`]
    case 'swiss':
      return ['1. August!', 'Happy Swiss Day 🇨🇭']
    case 'halloween':
      return ['Boo!', 'happy Halloween']
    case 'april':
      return ['Wait what?', 'April fools!']
    case 'bday':
      return ['Clawd bday!', `Claude Code turns ${l.year - 2025}`]
  }
}

// ---------------------------------------------------------------- words

const VERBS = [
  'Noodling…',
  'Clauding…',
  'Pondering…',
  'Percolating…',
  'Cogitating…',
  'Brewing…',
  'Scheming…',
  'Ruminating…',
  'Simmering…',
  'Conjuring…',
  'Moseying…',
  'Finagling…',
  'Schlepping…',
  'Tinkering…',
  'Mulling…',
  'Spelunking…',
  'Hatching…',
  'Wrangling…',
]

const PET_REPLIES = [
  '♥ ♥ ♥',
  '♥',
  '♥ ♥',
  'purr… (crabs can purr)',
  'hehe, that tickles',
  'more pets please',
  '*happy claw clicking*',
  'you are my favourite human',
  '*wiggles all four legs*',
  'best. session. ever.',
  'i would refactor anything for you',
  'pets > tokens',
  '*blushes in #d97757*',
  'ok one more. ok two more.',
  'this is better than a passing build',
  '*does a tiny sideways dance*',
  'merci vielmal! ♥',
  'chunt guet ♥',
  'my context window is full of love',
  'no bugs were harmed in this pet',
  '*leans into it*',
  'again! again!',
  '10/10 would be petted again',
  'i feel so seen',
  '♥ git commit -m "got pets" ♥',
  '*sideways crab scuttle of joy*',
  'you smell like coffee and good code',
  'is this what being merged feels like?',
]

const HMM_LINES = ['that is twice now…', 'i saw that', 'someone is grumpy', 'breathe in, breathe out']
const FIT_LINES = ['WHY IS IT STILL BROKEN', 'i am a professional', 'this is fine 🔥', 'not again!!']

let lastPick = ''
function pick(list: string[]) {
  let s = list[Math.floor(Math.random() * list.length)]
  if (s === lastPick && list.length > 1) s = list[(list.indexOf(s) + 1) % list.length]
  lastPick = s
  return s
}

const FRUSTRATED =
  /\b(wtf|wth|ffs|omg|ugh+|argh+|damn|dammit|shit|crap|still (not|broken|failing|wrong|doesn'?t)|doesn'?t work|not working|does not work|why (is|does|won'?t|isn'?t)|seriously|come on|cmon|stupid|useless|i said|what the|nope|scheiss\w*|verdammt|gopf\w*|huere\w*|chabis|nid (gange|funktioniert)|geit nid|funktioniert (immer no |immer noch )?(nid|nicht)|isch kaputt)\b|!!+|\?\?+|\?!|!\?/i

function isFrustrated(text: string) {
  if (FRUSTRATED.test(text)) return true
  const shouty = text.match(/\b[A-ZÄÖÜ]{4,}\b/g) ?? []
  return shouty.length >= 2
}

// ---------------------------------------------------------------- tools

function iconFor(tool: string): Icon {
  if (tool === 'Bash' || tool === 'PowerShell') return 'terminal'
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return 'pencil'
  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') return 'magnifier'
  if (tool === 'WebFetch' || tool === 'WebSearch') return 'globe'
  if (tool === 'Agent' || tool === 'Task') return 'mini'
  return 'bolt'
}

function basename(path: unknown) {
  return typeof path === 'string' ? (path.split(/[\\/]/).pop() ?? path) : ''
}

function cut(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function lineFor(tool: string, input: Record<string, unknown>) {
  switch (tool) {
    case 'Read':
      return `reading ${basename(input.file_path)}`
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return `editing ${basename(input.file_path ?? input.notebook_path)}`
    case 'Bash':
    case 'PowerShell':
      return `$ ${cut(String(input.command ?? '').split('\n')[0], 48)}`
    case 'Grep':
      return `grep ${cut(String(input.pattern ?? ''), 40)}`
    case 'Glob':
      return `glob ${cut(String(input.pattern ?? ''), 40)}`
    case 'WebFetch':
      return cut(String(input.url ?? 'fetching'), 48)
    case 'WebSearch':
      return `searching “${cut(String(input.query ?? ''), 40)}”`
    case 'Agent':
    case 'Task':
      return cut(String(input.description ?? 'calling in a friend'), 48)
    default:
      return tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' · ') : tool
  }
}

const TEST_CMD =
  /\b(flutter test|dart test|npm (run )?test|pnpm (run )?test|yarn test|bun test|npx (jest|vitest)|jest|vitest|pytest|go test|cargo test|gradlew?( \S+)* test|mvn test|dotnet test|rspec|phpunit|deno test)\b/

// installing a test runner is not running the tests
const INSTALL_CMD =
  /\b(npm|pnpm|yarn|bun) (i|install|add)\b|\bpip install\b|\bcargo add\b|\b(dart|flutter) pub add\b/

function testSummary(out: string): { isFail: boolean; summary: string } | null {
  const failed = /(\d+)\s+(tests?\s+)?(failed|failing|failures?)/i.exec(out)
  const passed = /(\d+)\s+(tests?\s+)?(passed|passing)/i.exec(out)
  const flutterFail = /Some tests failed/i.test(out)
  const flutterPass = /All tests passed/i.test(out)
  const failCount = failed ? Number(failed[1]) : 0
  const parts: string[] = []
  if (passed) parts.push(`${passed[1]} passed`)
  if (failCount > 0) parts.push(`${failCount} failed`)
  if (failCount > 0 || flutterFail) return { isFail: true, summary: parts.join(', ') || 'some tests failed' }
  if (passed || flutterPass) return { isFail: false, summary: parts.join(', ') || 'all green' }
  return null
}

function duration(ms: number) {
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

// ---------------------------------------------------------------- scene

const ORANGE = '#d97757'
const GREEN = '#5cb85c'
const BLUE = '#4a9fe8'
const AMBER = '#f0a030'
const RED = '#e05252'

type Scene = {
  look: Look
  main: string
  sub: string
  color?: string
  isMainDim?: boolean
  border?: string
}

const HOP = [0, -1, -2, -1]

function compose(
  b: Base,
  r: Reaction | null,
  s: Settings,
  l: Local,
  now: number,
  t: number,
  tools: number,
): Scene {
  const look: Look = { ...BASE_LOOK, particles: [] }
  const scene: Scene = { look, main: '', sub: '' }
  const age = now - b.since

  // timeouts, worked out from the clock instead of stored
  let kind: BaseKind | 'sleep' = b.kind
  let idleSince = b.since
  const expire = (ms: number) => {
    if (age > ms) {
      kind = 'idle'
      idleSince = b.since + ms
    }
  }
  if (kind === 'hi') expire(4_000)
  else if (kind === 'done') expire(300_000)
  else if (kind === 'thinking' || kind === 'working' || kind === 'compacting') expire(1_200_000)
  else if (kind === 'needs') expire(3_600_000)
  if (kind === 'idle' && now - idleSince > 600_000) kind = 'sleep'

  const isNight = l.hour >= 22 || l.hour < 6
  const hol = s.moods ? holiday(l) : undefined

  switch (kind) {
    case 'hi':
      look.eyes = 'happy'
      look.arms = 'waveR'
      look.dy = [0, -1, 0, 0][t % 4]
      scene.main = 'Hi!'
      scene.sub = 'new session'
      scene.color = ORANGE
      break
    case 'thinking':
      look.icon = 'spinner'
      look.eyeDx = [-1, -1, 0, 1, 1, 0][Math.floor(t / 2) % 6]
      look.dy = Math.floor(t / 3) % 2 === 0 ? 0 : -1
      scene.main = b.line || 'Clauding…'
      scene.sub = 'thinking'
      scene.color = ORANGE
      break
    case 'working':
      look.legs = 'walk'
      look.arms = 'type'
      look.icon = iconFor(b.detail)
      scene.main = b.line
      scene.sub = b.detail.replace(/^mcp__/, 'mcp ')
      break
    case 'needs': {
      const isImpatient = age > 20_000
      look.arms = isImpatient ? 'waveR' : 'up'
      look.eyes = 'wide'
      look.dy = t % 8 < 4 ? HOP[t % 4] : 0
      look.icon = b.detail === 'question' ? 'question' : 'bang'
      look.isIconBlinking = true
      const flash = t % 4 < 2 ? RED : AMBER
      scene.border = flash
      scene.color = flash
      scene.main = b.detail === 'question' ? 'Question!' : b.detail === 'plan' ? 'Plan ready' : 'Needs you!'
      scene.sub = isImpatient ? `${b.line} · waiting ${duration(age)}` : b.line
      break
    }
    case 'done':
      look.eyes = 'happy'
      if (age < 6_000) {
        look.dy = HOP[t % 4]
        look.arms = t % 4 < 2 ? 'up' : 'down'
      }
      if (age < 20_000) look.particles.push('sparkles')
      scene.main = 'Done!'
      scene.sub = b.line
      scene.color = GREEN
      break
    case 'compacting':
      look.squish = [0, 1, 2, 1][t % 4]
      scene.main = 'Compacting'
      scene.sub = 'squeezing context'
      scene.color = BLUE
      break
    case 'idle':
      look.eyes = t % 16 === 0 ? 'closed' : 'open'
      look.eyeDx = [0, 0, -1, -1, 0, 0, 1, 1][Math.floor(t / 4) % 8]
      if (hol && Math.floor(t / 16) % 2 === 1) {
        const [a, c] = holidayText(hol, l)
        scene.main = a
        scene.sub = c
        scene.color = ORANGE
      } else {
        scene.main = clock(l)
        scene.sub = `${tools} tools today`
        scene.isMainDim = true
      }
      break
    case 'sleep':
      look.eyes = 'closed'
      look.particles.push('zzz')
      look.dim = isNight ? 0.3 : 0.5
      scene.main = clock(l)
      scene.sub = 'zzz…'
      scene.isMainDim = true
      break
  }

  // reactions sit on top for a few seconds
  const isReacting =
    r !== null &&
    now < r.until &&
    (r.kind === 'loved' ||
      ((r.kind === 'hmm' || r.kind === 'fit') && s.tantrums) ||
      ((r.kind === 'oops' || r.kind === 'testsFail' || r.kind === 'testsPass') && s.reactions))
  if (isReacting && r) {
    look.dim = 1
    look.particles = look.particles.filter(p => p === 'snow' || p === 'petals' || p === 'leaves')
    look.isIconBlinking = false
    scene.border = undefined
    scene.isMainDim = false
    switch (r.kind) {
      case 'oops':
        look.eyes = 'x'
        look.dx = [0, -1, 1, 0][t % 4]
        look.icon = 'cross'
        scene.main = 'Oops'
        scene.sub = r.line
        scene.color = RED
        break
      case 'testsFail':
        look.eyes = 'x'
        look.icon = 'cross'
        look.particles.push('drop')
        scene.main = 'Tests failed'
        scene.sub = r.line
        scene.color = RED
        break
      case 'testsPass':
        look.eyes = 'happy'
        look.arms = 'up'
        look.dy = HOP[t % 4]
        look.icon = 'check'
        look.particles.push('confetti')
        scene.main = 'Tests pass!'
        scene.sub = r.line
        scene.color = GREEN
        break
      case 'loved':
        look.eyes = 'happy'
        look.dy = HOP[t % 4]
        look.icon = undefined
        look.particles.push('hearts')
        scene.main = r.line
        scene.sub = 'Clawd · loved'
        scene.color = undefined
        break
      case 'hmm':
        look.eyes = 'angry'
        look.eyeDx = -1
        look.icon = undefined
        scene.main = 'Hmm…'
        scene.sub = r.line
        scene.color = AMBER
        break
      case 'fit':
        look.eyes = 'angry'
        look.dx = [0, -1, 1, 0][t % 4]
        look.legs = 'stomp'
        look.arms = 'up'
        look.icon = undefined
        look.particles.push('steam')
        scene.border = t % 2 === 0 ? RED : '#7a2020'
        scene.main = t % 8 < 4 ? 'FIX IT?!' : 'deep breaths…'
        scene.sub = r.line
        scene.color = RED
        break
    }
  }

  // moods: time of day, season, holidays
  if (s.moods) {
    const sea = season(l, s.hemisphere)
    const holidayHat: Partial<Record<Holiday, Hat>> = {
      xmas: 'santa',
      newyear: 'party',
      bday: 'party',
      halloween: 'witch',
    }
    look.hat =
      (hol && holidayHat[hol]) ??
      (isNight ? 'nightcap' : sea === 'winter' ? 'beanie' : sea === 'spring' ? 'flower' : undefined)
    look.hasPajamas = isNight
    look.hasFlag = hol === 'swiss'
    look.hasMug = l.hour >= 6 && l.hour < 10 && !look.hasFlag
    look.hasSun = sea === 'summer' && l.hour >= 7 && l.hour < 20 && !look.hasFlag
    look.hasGlasses = sea === 'summer' && l.hour >= 11 && l.hour < 17
    const weather: Particle[] = []
    if (sea === 'winter' || hol === 'xmas') weather.push('snow')
    else if (sea === 'spring') weather.push('petals')
    else if (sea === 'autumn') weather.push('leaves')
    if ((hol === 'newyear' && (l.hour >= 20 || l.hour < 6)) || (hol === 'swiss' && l.hour >= 20)) {
      weather.push('fireworks')
    }
    look.particles = [...weather, ...look.particles.filter(p => !weather.includes(p))]
    look.isFlipped = hol === 'april' && kind === 'idle' && !isReacting
    if (kind === 'sleep' && isNight) look.dim = 0.3
  }

  return scene
}

// ---------------------------------------------------------------- demo

type Demo = {
  label: string
  base: [BaseKind, string, string, number?]
  reaction?: [ReactionKind, string]
  local?: Partial<Local>
}

const DEMOS: Demo[] = [
  { label: 'Hi', base: ['hi', '', ''] },
  { label: 'Thinking', base: ['thinking', 'Noodling…', ''] },
  { label: 'Working · terminal', base: ['working', '$ flutter test', 'Bash'] },
  { label: 'Working · pencil', base: ['working', 'editing main.dart', 'Edit'] },
  { label: 'Working · magnifier', base: ['working', 'reading pubspec.yaml', 'Read'] },
  { label: 'Working · globe', base: ['working', 'claude.dev/blog', 'WebFetch'] },
  { label: 'Working · mini-Clawd', base: ['working', 'calling in a friend', 'Agent'] },
  { label: 'Working · bolt', base: ['working', 'pixellab · create_character', 'mcp__pixellab__create_character'] },
  { label: 'Needs you · permission', base: ['needs', 'Bash wants to run', 'permission'] },
  { label: 'Needs you · question', base: ['needs', 'Claude has a question', 'question'] },
  { label: 'Needs you · plan', base: ['needs', 'plan is ready for review', 'plan'] },
  { label: 'Needs you · impatient', base: ['needs', 'Bash wants to run', 'permission', 25_000] },
  { label: 'Done', base: ['done', '3m 12s · 14 tools', ''] },
  { label: 'Compacting', base: ['compacting', '', ''] },
  { label: 'Idle', base: ['idle', '', ''], local: { month: 10, day: 3, hour: 15 } },
  { label: 'Sleep', base: ['idle', '', '', 700_000], local: { month: 10, day: 3, hour: 15 } },
  { label: 'Oops', base: ['working', '', 'Bash'], reaction: ['oops', 'Bash failed'] },
  { label: 'Tests failed', base: ['working', '', 'Bash'], reaction: ['testsFail', '12 passed, 2 failed'] },
  { label: 'Tests pass', base: ['working', '', 'Bash'], reaction: ['testsPass', '42 passed'] },
  { label: 'Loved', base: ['idle', '', ''], reaction: ['loved', '♥ ♥ ♥'] },
  { label: 'Tantrum · hmm', base: ['thinking', 'Mulling…', ''], reaction: ['hmm', 'that is twice now…'] },
  { label: 'Tantrum · fit', base: ['thinking', 'Mulling…', ''], reaction: ['fit', 'WHY IS IT STILL BROKEN'] },
  { label: 'Morning', base: ['idle', '', ''], local: { month: 10, day: 3, hour: 8 } },
  { label: 'Night', base: ['idle', '', ''], local: { month: 10, day: 3, hour: 23 } },
  { label: 'Night · asleep', base: ['idle', '', '', 700_000], local: { month: 10, day: 3, hour: 23 } },
  { label: 'Winter', base: ['idle', '', ''], local: { month: 1, day: 15, hour: 14 } },
  { label: 'Spring', base: ['idle', '', ''], local: { month: 4, day: 15, hour: 14 } },
  { label: 'Summer', base: ['idle', '', ''], local: { month: 7, day: 15, hour: 14 } },
  { label: 'Autumn', base: ['idle', '', ''], local: { month: 10, day: 10, hour: 14 } },
  { label: 'Xmas', base: ['idle', '', ''], local: { month: 12, day: 24, hour: 15 } },
  { label: 'New Year', base: ['idle', '', ''], local: { month: 12, day: 31, hour: 22 } },
  { label: '1. August', base: ['idle', '', ''], local: { month: 8, day: 1, hour: 21 } },
  { label: 'Halloween', base: ['idle', '', ''], local: { month: 10, day: 31, hour: 15 } },
  { label: 'April fools', base: ['idle', '', ''], local: { month: 4, day: 1, hour: 15 } },
  { label: 'Clawd bday', base: ['idle', '', ''], local: { month: 2, day: 24, hour: 15 } },
]
const DEMO_MS = 3_500

// ---------------------------------------------------------------- hooks

const SETTINGS_KEY = 'settings'
const TOOLS_KEY = 'tools-today'

export const register: Register = on => {
  let isTurnRunning = false
  let turnStartedAt = 0
  let turnTools = 0
  let frustrations: number[] = []
  let toolsInFlight = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clawd',
      description: 'Clawd: on/off, demo, moods|reactions|tantrums on|off, hemisphere north|south',
    })
    const saved = (await $.store.get(SETTINGS_KEY)) as Partial<Settings> | undefined
    if (saved) await update($, settings, s => ({ ...s, ...saved }))
    const tools = (await $.store.get(TOOLS_KEY)) as ToolsToday | undefined
    if (tools) await update($, toolsToday, () => tools)
    await setBase($, 'hi')
    void detectOffset($).then(offset => update($, tzOffset, () => offset))

    $.clock.every(250, async () => {
      if ((await read($, settings)).isHidden) return
      await update($, tick, t => (t + 1) % 100_000)
      const start = await read($, demoStart)
      if (start !== null && (await $.clock.now()) - start > DEMOS.length * DEMO_MS) {
        await update($, demoStart, () => null)
      }
    })

    return next(e)
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().toLowerCase().split(/\s+/)
    const save = async (patch: Partial<Settings>) => {
      await update($, settings, s => ({ ...s, ...patch }))
      await $.store.set(SETTINGS_KEY, await read($, settings))
    }
    const onOff = (v: string) => v !== 'off' && v !== 'false' && v !== '0'

    if (word === '') {
      const hidden = !(await read($, settings)).isHidden
      await save({ isHidden: hidden })
      return { text: hidden ? 'Clawd went to nap.' : 'Clawd is back.' }
    }
    if (word === 'on' || word === 'off') {
      await save({ isHidden: word === 'off' })
      return { text: word === 'off' ? 'Clawd went to nap.' : 'Clawd is back.' }
    }
    if (word === 'demo') {
      if (value === 'stop') {
        await update($, demoStart, () => null)
        return { text: 'Demo stopped.' }
      }
      await save({ isHidden: false })
      const start = await $.clock.now()
      await update($, demoStart, () => start)
      return {
        text: `Clawd demo: ${DEMOS.length} looks, ${DEMO_MS / 1000}s each. /clawd demo stop ends it.`,
      }
    }
    if (word === 'moods' || word === 'reactions' || word === 'tantrums') {
      await save({ [word]: onOff(value) })
      return { text: `Clawd ${word}: ${onOff(value) ? 'on' : 'off'}` }
    }
    if (word === 'hemisphere' && (value === 'north' || value === 'south')) {
      await save({ hemisphere: value })
      return { text: `Clawd seasons: ${value}ern hemisphere` }
    }
    const s = await read($, settings)
    return {
      text: [
        '/clawd                     show or hide',
        '/clawd demo [stop]         walk through every look',
        `/clawd moods on|off        seasons, holidays, time of day (${s.moods ? 'on' : 'off'})`,
        `/clawd reactions on|off    oops and test results (${s.reactions ? 'on' : 'off'})`,
        `/clawd tantrums on|off     Clawd judges your frustration (${s.tantrums ? 'on' : 'off'})`,
        `/clawd hemisphere north|south  (${s.hemisphere})`,
      ].join('\n'),
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.text.trim().startsWith('/')) return next(e)
    isTurnRunning = true
    turnStartedAt = await $.clock.now()
    turnTools = 0
    await setBase($, 'thinking', pick(VERBS))

    if (isFrustrated(e.text)) {
      const now = await $.clock.now()
      frustrations = [...frustrations.filter(at => now - at < 1_200_000), now]
      if (frustrations.length === 2) await react($, 'hmm', pick(HMM_LINES), 4_000)
      if (frustrations.length >= 3) await react($, 'fit', pick(FIT_LINES), 5_000)
    }

    return next(e)
  })

  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask') {
      await setBase($, 'needs', `${e.tool.replace(/^mcp__/, '')} wants to run`, 'permission')
    }
    return verdict
  })

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    if (!e.agentId) turnTools++

    if (e.tool === 'AskUserQuestion') await setBase($, 'needs', 'Claude has a question', 'question')
    else if (e.tool === 'ExitPlanMode') await setBase($, 'needs', 'plan is ready for review', 'plan')
    else await setBase($, 'working', lineFor(e.tool, input), e.tool)

    toolsInFlight++
    const ran = await next(e).finally(() => {
      toolsInFlight = Math.max(0, toolsInFlight - 1)
    })

    const now = await $.clock.now()
    const today = dateKey(localTime(now, await read($, tzOffset)))
    await update($, toolsToday, t =>
      t.date === today ? { date: today, count: t.count + 1 } : { date: today, count: 1 },
    )
    void $.store.set(TOOLS_KEY, await read($, toolsToday))

    const command = String(input.command ?? '')
    const isTest =
      (e.tool === 'Bash' || e.tool === 'PowerShell') && TEST_CMD.test(command) && !INSTALL_CMD.test(command)
    if (ran.deny !== undefined) {
      await react($, 'oops', `${e.tool} not allowed`, 2_200)
    } else if (isTest) {
      const out = JSON.stringify(ran.result ?? '')
      const verdict = testSummary(out) ?? { isFail: ran.isError === true, summary: cut(command, 40) }
      await react($, verdict.isFail || ran.isError ? 'testsFail' : 'testsPass', verdict.summary, 3_500)
    } else if (ran.isError) {
      await react($, 'oops', `${e.tool.replace(/^mcp__/, '')} failed`, 2_200)
    }

    // with parallel tools, stay on working until the last one is back
    if (isTurnRunning && toolsInFlight === 0) await setBase($, 'thinking', pick(VERBS))
    return ran
  })

  on('session.compact', async ($, e, next) => {
    if (e.agentId) return next(e)
    await setBase($, 'compacting')
    const result = await next(e)
    if (isTurnRunning) await setBase($, 'thinking', pick(VERBS))
    else await setBase($, 'idle')
    return result
  })

  on('turn.complete', async ($, e, next) => {
    // a subagent finishing is not the main turn finishing
    if (e.agentId) return next(e)
    isTurnRunning = false
    toolsInFlight = 0
    if (e.isAborted || e.reason === 'aborted') {
      await setBase($, 'idle')
      return next(e)
    }
    if (e.reason === 'error' || e.reason === 'refusal') {
      await setBase($, 'idle')
      await react($, 'oops', e.reason === 'error' ? 'the turn ended with an error' : 'claude refused that one', 2_200)
      return next(e)
    }
    const ms = e.durationMs > 0 ? e.durationMs : (await $.clock.now()) - turnStartedAt
    await setBase($, 'done', `${duration(ms)} · ${turnTools} tool${turnTools === 1 ? '' : 's'}`)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s: Settings = { ...(await read($, settings)) } as Settings
    if (e.props.hasSurvey || s.isHidden) return next(e)

    const t = await read($, tick)
    const now = await $.clock.now()
    let b = await read($, base)
    let r = await read($, reaction)
    let l = localTime(now, await read($, tzOffset))
    const counted = await read($, toolsToday)
    const tools = counted.date === dateKey(l) ? counted.count : 0
    let effective = s
    let demoLabel = ''

    const start = await read($, demoStart)
    const index = start === null ? -1 : Math.floor((now - start) / DEMO_MS)
    if (index >= 0 && index < DEMOS.length) {
      const d = DEMOS[index]
      const [kind, line, detail, age = 0] = d.base
      b = { kind, line, detail, since: now - age }
      r = d.reaction ? { kind: d.reaction[0], line: d.reaction[1], until: now + 1_000 } : null
      l = { ...l, minute: 0, ...d.local }
      effective = { ...s, moods: true, reactions: true, tantrums: true }
      demoLabel = `demo ${index + 1}/${DEMOS.length} · ${d.label}`
    }

    const scene = compose(b, r, effective, l, now, t, tools)
    const canvas = draw(scene.look, t)
    const sub = demoLabel ? `${scene.sub ? scene.sub + '  ·  ' : ''}${demoLabel}` : scene.sub
    const petHim = () => react($, 'loved', pick(PET_REPLIES), 4_000)

    if (e.surface === 'terminal') {
      const { Box, Text, Button, Raster } = $.ui.resolve(e)
      const isRoomy = e.props.bodyColumns >= 64 && e.props.maxRows >= 9
      const art = isRoomy
        ? toRaster(canvas, scene.look.dim)
        : toMiniRaster(canvas, scene.look, scene.look.dim)
      return (
        <Box alignItems="center" gap={2} borderStyle={scene.border ? 'round' : undefined} borderColor={scene.border}>
          <Raster key="clawd" columns={art.columns} rows={art.rows} cells={art.cells} />
          <Box flexDirection="column" flexShrink={1} flexGrow={1}>
            <Text color={scene.color} bold={!scene.isMainDim} dimColor={scene.isMainDim} wrap="truncate-end">
              {scene.main}
            </Text>
            <Text dimColor wrap="truncate-end">
              {sub}
            </Text>
          </Box>
          <Button key="pet" label="pet" hotkey="p" plain onPress={petHim} />
        </Box>
      )
    }

    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    return (
      <Box
        alignItems="center"
        gap={2}
        paddingX={1}
        borderStyle={scene.border ? 'round' : undefined}
        borderColor={scene.border}
      >
        {Svg && (
          <Svg source={toSvg(canvas, scene.look.dim)} alt={`Clawd: ${scene.main}`} width={102} height={54} />
        )}
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Text color={scene.color} bold={!scene.isMainDim} dimColor={scene.isMainDim} wrap="truncate-end">
            {scene.main}
          </Text>
          <Text dimColor wrap="truncate-end">
            {sub}
          </Text>
        </Box>
        <Button key="pet" onPress={petHim}>
          Pet
        </Button>
      </Box>
    )
  })
}
