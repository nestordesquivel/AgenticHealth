import Anthropic from "@anthropic-ai/sdk";

// One provider, one key (PRD §8). Reads ANTHROPIC_API_KEY from the environment.
export const claude = new Anthropic();

export const MODEL = "claude-opus-5";

// PRD §7: retry once, then let the caller fall back.
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}
