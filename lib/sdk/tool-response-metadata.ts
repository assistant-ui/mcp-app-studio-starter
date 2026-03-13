"use client";

import { readOpenAIChannel } from "./openai-channel";

export function readToolResponseMetadata<
  T = Record<string, unknown>,
>(): T | null {
  return readOpenAIChannel<T>("toolResponseMetadata");
}
