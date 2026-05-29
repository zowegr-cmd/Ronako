import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Agent, Team } from "@/types";
import { DEFAULT_AGENTS, CONSULTANT_AGENTS, ALPHA_TEAM } from "@/lib/agents/defaultTeam";
import { generateId } from "@/lib/utils";

interface AgentStore {
  agents: Agent[];
  teams: Team[];
  addAgent: (agent: Omit<Agent, "id">) => Agent;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;
  addTeam: (team: Omit<Team, "id">) => Team;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  getTeam: (id: string) => Team | undefined;
  getTeamAgents: (teamId: string) => Agent[];
  consultants: Agent[];
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      agents: DEFAULT_AGENTS,
      teams: [ALPHA_TEAM],
      consultants: CONSULTANT_AGENTS,

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
          agents: s.agents.filter((a) => a.id !== id || a.isSystem),
          teams: s.teams.map((t) => ({
            ...t,
            agentIds: t.agentIds.filter((aid) => aid !== id),
          })),
        })),

      getAgent: (id) => {
        const { agents, consultants } = get();
        return [...agents, ...consultants].find((a) => a.id === id);
      },

      addTeam: (data) => {
        const team: Team = { ...data, id: generateId() };
        set((s) => ({ teams: [...s.teams, team] }));
        return team;
      },

      updateTeam: (id, updates) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)),
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
    }),
    { name: "ronako-agents-v1" }
  )
);
