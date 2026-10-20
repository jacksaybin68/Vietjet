/**
 * Cấu hình NVIDIA NIM cho Coding Pi.
 *
 * Biến môi trường (server-only):
 *   NVIDIA_API_KEY          bắt buộc — khoá `nvapi-…` của NVIDIA
 *   NVIDIA_BASE_URL         mặc định https://integrate.api.nvidia.com/v1
 *   CODING_PI_MODEL         mặc định nvidia/nemotron-3.5-super-vl-120b-a12b
 *   CODING_PI_MAX_TOKENS    mặc định 16384
 *   CODING_PI_TEMPERATURE   mặc định 1
 *   CODING_PI_TOP_P         mặc định 0.95
 *   CODING_PI_SEED          mặc định 42
 *   CODING_PI_THINKING      'false' để tắt enable_thinking (mặc định bật)
 *   CODING_PI_TIMEOUT_MS    mặc định 300000 (5 phút)
 */

import type { CodingPiDefaults } from './protocol';

export type EnvLike = Record<string, string | undefined>;

export const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const DEFAULT_CODING_PI_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
export const DEFAULT_CODING_PI_MAX_TOKENS = 16_384;
export const DEFAULT_CODING_PI_TEMPERATURE = 1;
export const DEFAULT_CODING_PI_TOP_P = 0.95;
export const DEFAULT_CODING_PI_SEED = 42;
export const DEFAULT_CODING_PI_TIMEOUT_MS = 300_000;

export interface CodingPiConfig extends CodingPiDefaults {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number((raw ?? '').trim());
  return Number.isFinite(value) && value > 0 && Number.isInteger(value) ? value : fallback;
}

function readNonNegativeInt(raw: string | undefined, fallback: number): number {
  const text = (raw ?? '').trim();
  if (!text) return fallback;
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readRatio(raw: string | undefined, fallback: number, min: number, max: number): number {
  const text = (raw ?? '').trim();
  if (!text) return fallback;
  const value = Number(text);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function readBoolean(raw: string | undefined, fallback: boolean): boolean {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

/**
 * Chấp nhận cả `https://host/v1`, `host/v1` và URL đầy đủ tới
 * `/chat/completions`; luôn trả về gốc để route tự ghép một lần.
 */
export function normalizeNvidiaBaseUrl(raw: string | undefined): string {
  let value = (raw ?? '').trim();
  if (!value) return DEFAULT_NVIDIA_BASE_URL;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  value = value.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
  return value;
}

export function getCodingPiConfig(env: EnvLike = process.env): CodingPiConfig {
  const maxTokens = readPositiveInt(env.CODING_PI_MAX_TOKENS, DEFAULT_CODING_PI_MAX_TOKENS);

  return {
    apiKey: (env.NVIDIA_API_KEY ?? env.CODING_PI_API_KEY ?? '').trim(),
    baseUrl: normalizeNvidiaBaseUrl(env.NVIDIA_BASE_URL || env.CODING_PI_BASE_URL),
    model: (env.CODING_PI_MODEL ?? '').trim() || DEFAULT_CODING_PI_MODEL,
    maxTokens: Math.min(maxTokens, 32_768),
    temperature: readRatio(env.CODING_PI_TEMPERATURE, DEFAULT_CODING_PI_TEMPERATURE, 0, 2),
    topP: readRatio(env.CODING_PI_TOP_P, DEFAULT_CODING_PI_TOP_P, 0, 1),
    seed: readNonNegativeInt(env.CODING_PI_SEED, DEFAULT_CODING_PI_SEED),
    enableThinking: readBoolean(env.CODING_PI_THINKING, true),
    timeoutMs: readPositiveInt(env.CODING_PI_TIMEOUT_MS, DEFAULT_CODING_PI_TIMEOUT_MS),
  };
}

/** Chỉ coi Coding Pi là đã cấu hình khi có khoá — không đoán từ model/base URL. */
export function isCodingPiConfigured(env: EnvLike = process.env): boolean {
  return Boolean((env.NVIDIA_API_KEY ?? env.CODING_PI_API_KEY ?? '').trim());
}
