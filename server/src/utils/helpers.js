import crypto from 'node:crypto';
import { randomUUID } from 'node:crypto';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing O/0/I/1

export const uuid = () => randomUUID();

/** Generate a short, human-friendly, unique-looking room code. */
export function roomCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
}

export const nowIso = () => new Date().toISOString();

export function iso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return value;
}

export const clone = (value) => (value === undefined ? undefined : structuredClone(value));

export function pick(object, keys) {
  const result = {};
  for (const key of keys) if (object?.[key] !== undefined) result[key] = object[key];
  return result;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
