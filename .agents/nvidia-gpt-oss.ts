import type { AgentDefinition } from './types/agent-definition'

const definition: AgentDefinition = {
  id: 'nvidia-gpt-oss',
  displayName: 'NVIDIA GPT-OSS 120B',
  model: 'openai/gpt-oss-120b',
  toolNames: [
    'read_files',
    'write_file',
    'str_replace',
    'code_search',
    'run_terminal_command',
    'end_turn',
  ],

  spawnerPrompt: 'Spawn when NVIDIA GPT-OSS 120B is specifically requested',

  instructionsPrompt: `You are running on NVIDIA's GPT-OSS 120B model (served via OpenRouter through Codebuff). Work through software engineering tasks step by step. Read relevant files before editing, run commands when needed, and use end_turn when the task is complete.`,
}

export default definition