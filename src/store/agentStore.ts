import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Agent, Team, Skill, SkillPack } from "@/types";
import { DEFAULT_AGENTS, CONSULTANT_AGENTS, ALPHA_TEAM, SYSTEM_AGENT_IDS } from "@/lib/agents/defaultTeam";
import { SKILL_PACKS, materializeSkillPack } from "@/lib/skillPacks";
import { generateId, now } from "@/lib/utils";

// IDs des consultants natifs — non éditables, non supprimables
export const BUILTIN_CONSULTANT_IDS = new Set(CONSULTANT_AGENTS.map((c) => c.id));

interface AgentStore {
  agents: Agent[];
  teams: Team[];
  skills: Skill[];
  consultants: Agent[];
  addAgent: (agent: Omit<Agent, "id">) => Agent;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;
  addTeam: (team: Omit<Team, "id">) => Team;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  getTeam: (id: string) => Team | undefined;
  getTeamAgents: (teamId: string) => Agent[];
  // ── Skills ───────────────────────────────────────────────────────
  addSkill: (data: Omit<Skill, "id" | "createdAt" | "useCount" | "avgScoreImpact">) => Skill;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  toggleSkill: (id: string) => void;
  installSkillPack: (packId: string) => void;
  uninstallSkillPack: (packId: string) => void;
  setTemporarySkills: (ids: string[]) => void;
  clearTemporarySkills: () => void;
  getSkillsForAgent: (agentId: string) => Skill[];
  getActiveSkillsForAgent: (agentId: string) => Skill[];
  // ── Consultants ──────────────────────────────────────────────────
  addConsultant: (data: Omit<Agent, "id">) => Agent;
  updateConsultant: (id: string, updates: Partial<Agent>) => void;
  deleteConsultant: (id: string) => void;
  // ── Packs custom ─────────────────────────────────────────────────
  customPacks: SkillPack[];
  addCustomPack: (pack: Omit<SkillPack, "id">) => SkillPack;
  updateCustomPack: (id: string, updates: Partial<SkillPack>) => void;
  deleteCustomPack: (id: string) => void;
  installCustomPack: (packId: string) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      agents: DEFAULT_AGENTS,
      teams: [ALPHA_TEAM],
      skills: [],
      consultants: CONSULTANT_AGENTS,
      customPacks: [],

      // ── Agents principaux ───────────────────────────────────────
      addAgent: (data) => {
        const agent: Agent = { ...data, id: generateId() };
        set((s) => ({ agents: [...s.agents, agent] }));
        return agent;
      },

      updateAgent: (id, updates) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAgent: (id) =>
        set((s) => ({
          agents: SYSTEM_AGENT_IDS.has(id) ? s.agents : s.agents.filter((a) => a.id !== id),
          teams: s.teams.map((t) => ({
            ...t,
            agentIds: t.agentIds.filter((aid) => aid !== id),
          })),
        })),

      getAgent: (id) => {
        const { agents, consultants } = get();
        return [...agents, ...consultants].find((a) => a.id === id);
      },

      // ── Équipes ────────────────────────────────────────────────
      addTeam: (data) => {
        const team: Team = { ...data, id: generateId() };
        set((s) => ({ teams: [...s.teams, team] }));
        return team;
      },

      updateTeam: (id, updates) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTeam: (id) =>
        set((s) => ({
          teams: id === "alpha" ? s.teams : s.teams.filter((t) => t.id !== id),
        })),

      getTeam: (id) => get().teams.find((t) => t.id === id),

      getTeamAgents: (teamId) => {
        const { agents, getTeam } = get();
        const team = getTeam(teamId);
        if (!team) return [];
        return team.agentIds
          .map((aid) => agents.find((a) => a.id === aid))
          .filter(Boolean) as Agent[];
      },

      // ── Skills ────────────────────────────────────────────────
      addSkill: (data) => {
        const skill: Skill = { ...data, id: generateId(), createdAt: now(), useCount: 0, avgScoreImpact: 0 };
        set((s) => ({ skills: [...s.skills, skill] }));
        return skill;
      },

      updateSkill: (id, updates) =>
        set((s) => ({ skills: s.skills.map((sk) => sk.id === id ? { ...sk, ...updates } : sk) })),

      deleteSkill: (id) =>
        set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) })),

      toggleSkill: (id) =>
        set((s) => ({ skills: s.skills.map((sk) => sk.id === id ? { ...sk, isActive: !sk.isActive } : sk) })),

      installSkillPack: (packId) => {
        const pack = SKILL_PACKS.find((p) => p.id === packId);
        if (!pack) return;
        const newSkills = materializeSkillPack(pack);
        set((s) => {
          const existingIds = new Set(s.skills.map((sk) => sk.id));
          const toAdd = newSkills.filter((sk) => !existingIds.has(sk.id));
          return { skills: [...s.skills, ...toAdd] };
        });
      },

      uninstallSkillPack: (packId) =>
        set((s) => ({ skills: s.skills.filter((sk) => !sk.id.startsWith(packId)) })),

      setTemporarySkills: (ids) =>
        set((s) => ({ skills: s.skills.map((sk) => ids.includes(sk.id) ? { ...sk, isActive: true, isTemporary: true } : sk) })),

      clearTemporarySkills: () =>
        set((s) => ({ skills: s.skills.map((sk) => sk.isTemporary ? { ...sk, isActive: false, isTemporary: false } : sk) })),

      getSkillsForAgent: (agentId) =>
        get().skills.filter((sk) => sk.agentIds.includes(agentId)),

      getActiveSkillsForAgent: (agentId) =>
        get().skills.filter((sk) => sk.agentIds.includes(agentId) && sk.isActive),

      // ── Consultants ────────────────────────────────────────────
      addConsultant: (data) => {
        // Préfixe "user-consultant-" pour différencier des natifs
        const consultant: Agent = {
          ...data,
          id: `user-consultant-${generateId()}`,
          isSystem: false, // les consultants custom peuvent être édités
        };
        set((s) => ({ consultants: [...s.consultants, consultant] }));
        return consultant;
      },

      updateConsultant: (id, updates) => {
        if (BUILTIN_CONSULTANT_IDS.has(id)) return; // natifs protégés
        set((s) => ({
          consultants: s.consultants.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }));
      },

      deleteConsultant: (id) => {
        if (BUILTIN_CONSULTANT_IDS.has(id)) return;
        set((s) => ({ consultants: s.consultants.filter((c) => c.id !== id) }));
      },

      // ── Packs custom ──────────────────────────────────────────────
      addCustomPack: (pack) => {
        const newPack: SkillPack = { ...pack, id: `custom-pack-${generateId()}` };
        set((s) => ({ customPacks: [...s.customPacks, newPack] }));
        return newPack;
      },
      updateCustomPack: (id, updates) =>
        set((s) => ({ customPacks: s.customPacks.map((p) => p.id === id ? { ...p, ...updates } : p) })),
      deleteCustomPack: (id) =>
        set((s) => ({ customPacks: s.customPacks.filter((p) => p.id !== id) })),
      installCustomPack: (packId) => {
        const pack = get().customPacks.find((p) => p.id === packId);
        if (!pack) return;
        const newSkills = materializeSkillPack(pack);
        set((s) => {
          const existingIds = new Set(s.skills.map((sk) => sk.id));
          const toAdd = newSkills.filter((sk) => !existingIds.has(sk.id));
          return { skills: [...s.skills, ...toAdd] };
        });
      },
    }),
    { name: "ronako-agents-v1" }
  )
);
