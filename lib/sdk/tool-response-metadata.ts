"use client";

import { readOpenAIChannel, useOpenAIChannel } from "./openai-channel";

export function readToolResponseMetadata<
  T = Record<string, unknown>,
>(): T | null {
  return readOpenAIChannel<T>("toolResponseMetadata");
}

export function useToolResponseMetadata<
  T = Record<string, unknown>,
>(): T | null {
  return useOpenAIChannel<T>("toolResponseMetadata");
}
