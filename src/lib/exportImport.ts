import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import type { Agent, Team, Skill } from "@/types";
import { now } from "@/lib/utils";

// ─── Types des formats d'export ──────────────────────────────────────────────
export interface RonakoAgentFile {
  version: "1.0";
  type: "agent";
  exportedAt: string;
  checksum: string;
  agent: Omit<Agent, "id"> & { skills?: Omit<Skill, "id"|"createdAt"|"useCount"|"avgScoreImpact">[] };
}

export interface RonakoTeamFile {
  version: "1.0";
  type: "team";
  exportedAt: string;
  checksum: string;
  team: Omit<Team, "id"> & { name: string };
  agents: Array<Omit<Agent, "id">>;
  skills: Array<Omit<Skill, "id"|"createdAt"|"useCount"|"avgScoreImpact">>;
  requiredConnectors: string[];
}

export interface RonakoPackFile {
  version: "1.0";
  type: "pack";
  exportedAt: string;
  checksum: string;
  name: string;
  description: string;
  readme: string;
  agents: Array<Omit<Agent, "id">>;
  teams: Array<Omit<Team, "id">>;
  skills: Array<Omit<Skill, "id"|"createdAt"|"useCount"|"avgScoreImpact">>;
  requiredConnectors: string[];
}

export type RonakoFile = RonakoAgentFile | RonakoTeamFile | RonakoPackFile;

// ─── Checksum SHA-256 via Web Crypto ─────────────────────────────────────────
async function computeChecksum(data: Record<string, unknown>): Promise<string> {
  const { checksum: _, ...rest } = data as Record<string, unknown>;
  const json = JSON.stringify(rest, Object.keys(rest).sort());
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyChecksum(data: RonakoFile): Promise<boolean> {
  const expected = await computeChecksum(data as unknown as Record<string, unknown>);
  return expected === data.checksum;
}

// ─── Sanitizer — retire les clés API ─────────────────────────────────────────
function sanitizeAgent(agent: Agent): Omit<Agent, "id"> {
  const { id: _id, ...rest } = agent;
  return { ...rest }; // les clés API ne sont jamais dans Agent
}

// ─── Export Agent ─────────────────────────────────────────────────────────────
export async function exportAgent(agent: Agent, agentSkills: Skill[]): Promise<void> {
  const payload = {
    version: "1.0" as const,
    type: "agent" as const,
    exportedAt: now(),
    checksum: "",
    agent: {
      ...sanitizeAgent(agent),
      skills: agentSkills.map(({ id: _id, createdAt: _c, useCount: _u, avgScoreImpact: _a, ...s }) => s),
    },
  };
  payload.checksum = await computeChecksum(payload as unknown as Record<string, unknown>);
  const content = payload;

  const filename = `${agent.name.toLowerCase().replace(/\s+/g, "-")}.ronako-agent`;
  const path = await save({ defaultPath: filename, filters: [{ name: "Agent Ronako", extensions: ["ronako-agent"] }] });
  if (path) await writeTextFile(path, JSON.stringify(content, null, 2));
}

// ─── Export Équipe ────────────────────────────────────────────────────────────
export async function exportTeam(team: Team, agents: Agent[], skills: Skill[]): Promise<void> {
  const requiredConnectors = [...new Set(agents.flatMap((a) => a.connectors ?? []))];
  const payload = {
    version: "1.0" as const,
    type: "team" as const,
    exportedAt: now(),
    checksum: "",
    team: { name: team.name, agentIds: team.agentIds, enableChefOption: team.enableChefOption },
    agents: agents.map(sanitizeAgent),
    skills: skills.map(({ id: _id, createdAt: _c, useCount: _u, avgScoreImpact: _a, ...s }) => s),
    requiredConnectors,
  };
  payload.checksum = await computeChecksum(payload as unknown as Record<string, unknown>);
  const content = payload;

  const filename = `${team.name.toLowerCase().replace(/\s+/g, "-")}.ronako-team`;
  const path = await save({ defaultPath: filename, filters: [{ name: "Équipe Ronako", extensions: ["ronako-team"] }] });
  if (path) await writeTextFile(path, JSON.stringify(content, null, 2));
}

// ─── Export Pack custom ───────────────────────────────────────────────────────
export async function exportCustomPack(pack: import("@/types").SkillPack): Promise<void> {
  const payload = {
    version: "1.0" as const,
    type: "pack" as const,
    exportedAt: now(),
    checksum: "",
    name: pack.name,
    description: pack.description,
    readme: `# ${pack.name}\n\n${pack.description}\n\nPack créé avec Ronako.`,
    agents: [],
    teams: [],
    skills: pack.skills.map(({ id: _id, ...s }) => s),
    requiredConnectors: [],
  };
  payload.checksum = await computeChecksum(payload as unknown as Record<string, unknown>);
  const filename = `${pack.name.toLowerCase().replace(/\s+/g, "-")}.ronako-pack`;
  const p = await save({
    defaultPath: filename,
    filters: [{ name: "Ronako Pack", extensions: ["ronako-pack"] }],
  });
  if (p) {
    await writeTextFile(p, JSON.stringify(payload, null, 2));
  }
}

// ─── Import ────────────────────────────────────────────────────────────────────
export async function importRonakoFile(): Promise<{
  file: RonakoFile;
  valid: boolean;
  missingConnectors: string[];
} | null> {
  const selected = await open({
    filters: [{ name: "Fichiers Ronako", extensions: ["ronako-agent", "ronako-team", "ronako-pack"] }],
  });
  if (!selected || typeof selected !== "string") return null;

  const content = await readTextFile(selected);
  const file = JSON.parse(content) as RonakoFile;

  const valid = await verifyChecksum(file);
  const requiredConnectors = "requiredConnectors" in file ? file.requiredConnectors : [];

  return { file, valid, missingConnectors: requiredConnectors };
}
