"use client";

import type { ModelId } from "./pricing";

export interface SharedMoment {
  id: string;
  title: string;
  response: string;
  model: ModelId;
  sharedAt: string;
}

export interface ChatMsg {
  role: "user" | "ai";
  text: string;
  model?: ModelId;
  saved?: number;
  latency?: string;
}

export interface UsageStats {
  requests: number;
  savedDollars: number;
}

const SHARED_KEY = "pool.demo.shared.v1";
const SAVED_KEY = "pool.demo.saved.v1";
const CHAT_KEY = "pool.demo.chat.v1";
const MODEL_KEY = "pool.demo.model.v1";
const USAGE_KEY = "pool.demo.usage.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage-restricted browsers keep the session in memory only.
  }
}

export function getSharedMoments(): SharedMoment[] {
  return readJson<SharedMoment[]>(SHARED_KEY, []);
}

export function shareMoment(moment: Omit<SharedMoment, "id" | "sharedAt">): SharedMoment {
  const shared: SharedMoment = {
    ...moment,
    id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sharedAt: "just now",
  };
  const moments = [shared, ...getSharedMoments()].slice(0, 12);
  writeJson(SHARED_KEY, moments);
  try {
    window.dispatchEvent(new Event("pool:shared"));
  } catch {
    // no-op outside browser
  }
  return shared;
}

export function getSessionSavings(): number {
  return readJson<number>(SAVED_KEY, 0);
}

export function setStoredSavings(value: number) {
  writeJson(SAVED_KEY, value);
}

export function getChatHistory(): ChatMsg[] | null {
  return readJson<ChatMsg[] | null>(CHAT_KEY, null);
}

export function setChatHistory(msgs: ChatMsg[]) {
  writeJson(CHAT_KEY, msgs.slice(-40));
}

export function getStoredModel<T extends string>(fallback: T): T {
  return readJson<T>(MODEL_KEY, fallback);
}

export function setStoredModel(value: string) {
  writeJson(MODEL_KEY, value);
}

export function getUsage(): UsageStats {
  return readJson<UsageStats>(USAGE_KEY, { requests: 0, savedDollars: 0 });
}

export function recordUsage(savedDollars: number): UsageStats {
  const next: UsageStats = {
    requests: getUsage().requests + 1,
    savedDollars: getUsage().savedDollars + savedDollars,
  };
  writeJson(USAGE_KEY, next);
  return next;
}

export function clearDemoData() {
  try {
    [SHARED_KEY, SAVED_KEY, CHAT_KEY, MODEL_KEY, USAGE_KEY].forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // no-op
  }
}
