import mongoose from "mongoose";

import { env } from "./env.js";

let connected = false;

export async function connectDatabase(): Promise<boolean> {
  if (connected) return true;

  try {
    await mongoose.connect(env.MONGODB_URI);
    connected = true;
    console.info("[DB] MongoDB connected");
    return true;
  } catch (err) {
    console.warn(
      "[DB] MongoDB unavailable — API runs without persistence:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isDatabaseConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}
