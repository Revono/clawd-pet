export type BaseKind = 'hi' | 'thinking' | 'working' | 'needs' | 'done' | 'compacting' | 'idle'

export type Base = {
  kind: BaseKind
  since: number
  /** thinking verb, tool detail, done summary, what is needed */
  line: string
  /** tool name, or permission / question / plan for needs */
  detail: string
}

export type ReactionKind = 'oops' | 'testsFail' | 'testsPass' | 'loved' | 'hmm' | 'fit'

export type Reaction = { kind: ReactionKind; line: string; until: number }

export type Settings = {
  isHidden: boolean
  moods: boolean
  reactions: boolean
  tantrums: boolean
  hemisphere: 'north' | 'south'
}

export type ToolsToday = { date: string; count: number }

declare module 'claude-code' {
  interface PluginState {
    'clawd-pet': {
      base: Base
      reaction: Reaction | null
      settings: Settings
      tick: number
      toolsToday: ToolsToday
      demoStart: number | null
      tzOffset: number | null
    }
  }
}
