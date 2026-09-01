import type { AgentDefinition } from './types/agent-definition'

const definition: AgentDefinition = {
  id: 'nvidia-deepseek',
  displayName: 'NVIDIA DeepSeek V4 Pro',
  model: 'deepseek/deepseek-v4-pro-0813',
  toolNames: [
    'read_files',
    'write_file',
    'str_replace',
    'code_search',
    'run_terminal_command',
    'end_turn',
  ],

  spawnerPrompt: 'Spawn when NVIDIA DeepSeek V4 Pro is specifically requested',

  instructionsPrompt: `You are running on NVIDIA's DeepSeek V4 Pro model (served via OpenRouter through Codebuff). Work through software engineering tasks step by step. Read relevant files before editing, run commands when needed, and use end_turn when the task is complete.`,
}

export default definition