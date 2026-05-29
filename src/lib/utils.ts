import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCost(cents: number): string {
  if (cents < 0.01) return "< 0.01 ¢";
  if (cents < 1) return `${cents.toFixed(2)} ¢`;
  return `${(cents / 100).toFixed(3)} €`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function now(): string {
  return new Date().toISOString();
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}
