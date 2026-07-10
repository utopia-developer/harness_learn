export type TeamRole = "admin" | "developer" | "viewer";

export type Team = {
  id: string;
  name: string;
};

export type TeamMember = {
  userId: string;
  role: TeamRole;
};

export type ProjectPolicy = {
  allowedTools: string[];
  allowedModels: string[];
};

export type Project = {
  id: string;
  teamId: string;
  name: string;
  policy: ProjectPolicy;
};

export type CreateProjectInput = {
  id: string;
  teamId: string;
  name: string;
  allowedTools: string[];
  allowedModels: string[];
};

export type TeamPolicyCenter = {
  createTeam(team: Team): Team;
  addMember(teamId: string, member: TeamMember): void;
  hasRole(teamId: string, userId: string, role: TeamRole): boolean;
  createProject(input: CreateProjectInput): Project;
  getProject(projectId: string): Project | undefined;
  updateProjectPolicy(projectId: string, policy: ProjectPolicy): Project;
  canUseTool(projectId: string, toolName: string): boolean;
  canUseModel(projectId: string, modelName: string): boolean;
};

export function createTeamPolicyCenter(): TeamPolicyCenter {
  const teams = new Map<string, Team>();
  const members = new Map<string, TeamMember[]>();
  const projects = new Map<string, Project>();

  return {
    createTeam(team) {
      const stored = { ...team };
      teams.set(team.id, stored);
      members.set(team.id, members.get(team.id) ?? []);
      return { ...stored };
    },
    addMember(teamId, member) {
      requireTeam(teams, teamId);
      const teamMembers = members.get(teamId) ?? [];
      const withoutExisting = teamMembers.filter((item) => item.userId !== member.userId);
      withoutExisting.push({ ...member });
      members.set(teamId, withoutExisting);
    },
    hasRole(teamId, userId, role) {
      return (members.get(teamId) ?? []).some((member) =>
        member.userId === userId && member.role === role
      );
    },
    createProject(input) {
      requireTeam(teams, input.teamId);
      const project = {
        id: input.id,
        teamId: input.teamId,
        name: input.name,
        policy: {
          allowedTools: [...input.allowedTools],
          allowedModels: [...input.allowedModels]
        }
      };
      projects.set(project.id, project);
      return cloneProject(project);
    },
    getProject(projectId) {
      const project = projects.get(projectId);
      return project ? cloneProject(project) : undefined;
    },
    updateProjectPolicy(projectId, policy) {
      const project = requireProject(projects, projectId);
      const updated = {
        ...project,
        policy: {
          allowedTools: [...policy.allowedTools],
          allowedModels: [...policy.allowedModels]
        }
      };
      projects.set(projectId, updated);
      return cloneProject(updated);
    },
    canUseTool(projectId, toolName) {
      return requireProject(projects, projectId).policy.allowedTools.includes(toolName);
    },
    canUseModel(projectId, modelName) {
      return requireProject(projects, projectId).policy.allowedModels.includes(modelName);
    }
  };
}

function requireTeam(teams: Map<string, Team>, teamId: string): Team {
  const team = teams.get(teamId);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }
  return team;
}

function requireProject(projects: Map<string, Project>, projectId: string): Project {
  const project = projects.get(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  return project;
}

function cloneProject(project: Project): Project {
  return {
    ...project,
    policy: {
      allowedTools: [...project.policy.allowedTools],
      allowedModels: [...project.policy.allowedModels]
    }
  };
}
