/** Human-like random delay between actions (ms). */
export async function humanDelay(minMs = 400, maxMs = 1200): Promise<void> {
  const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
  await new Promise((r) => setTimeout(r, ms));
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
