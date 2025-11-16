export type ProjectTaskStatus = "backlog" | "active" | "blocked" | "done";

export type ProjectTask = {
  id: string;
  title: string;
  status: ProjectTaskStatus;
  estimateMinutes?: number;
  loggedSeconds: number;
  owner?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectNote = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  summary: string;
  chips: string[];
  focusGoalMinutes?: number;
  updatedAt: string;
  tasks: ProjectTask[];
  notes: ProjectNote[];
};

export type FocusIntent = {
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  minutes: number;
  createdAt: string;
};

export const PROJECTS_STORAGE_KEY = "peopleCoreProjects_v1";
export const FOCUS_INTENT_KEY = "peopleCoreFocusIntent_v1";

function isProjectTask(value: unknown): value is ProjectTask {
  if (!value || typeof value !== "object") return false;
  const task = value as ProjectTask;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.status === "string" &&
    typeof task.loggedSeconds === "number" &&
    typeof task.createdAt === "string" &&
    typeof task.updatedAt === "string"
  );
}

function isProjectNote(value: unknown): value is ProjectNote {
  if (!value || typeof value !== "object") return false;
  const note = value as ProjectNote;
  return (
    typeof note.id === "string" &&
    typeof note.body === "string" &&
    typeof note.author === "string" &&
    typeof note.createdAt === "string"
  );
}

export function safeParseProjects(raw: string | null): ProjectRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((project) => project && typeof project === "object")
      .map((project) => project as ProjectRecord)
      .filter((project) =>
        typeof project.id === "string" &&
        typeof project.name === "string" &&
        typeof project.summary === "string" &&
        Array.isArray(project.chips) &&
        Array.isArray(project.tasks) &&
        Array.isArray(project.notes)
      )
      .map((project) => ({
        id: project.id,
        name: project.name,
        summary: project.summary,
        chips: project.chips.filter((chip) => typeof chip === "string"),
        focusGoalMinutes: project.focusGoalMinutes,
        updatedAt: project.updatedAt || new Date().toISOString(),
        tasks: project.tasks.filter(isProjectTask),
        notes: project.notes.filter(isProjectNote),
      }));
  } catch {
    return [];
  }
}

export function safeParseFocusIntent(raw: string | null): FocusIntent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as FocusIntent).projectId === "string" &&
      typeof (parsed as FocusIntent).projectName === "string" &&
      typeof (parsed as FocusIntent).taskId === "string" &&
      typeof (parsed as FocusIntent).taskTitle === "string" &&
      typeof (parsed as FocusIntent).minutes === "number"
    ) {
      return {
        projectId: (parsed as FocusIntent).projectId,
        projectName: (parsed as FocusIntent).projectName,
        taskId: (parsed as FocusIntent).taskId,
        taskTitle: (parsed as FocusIntent).taskTitle,
        minutes: Math.max(1, Math.round((parsed as FocusIntent).minutes)),
        createdAt:
          typeof (parsed as FocusIntent).createdAt === "string"
            ? (parsed as FocusIntent).createdAt
            : new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function generateProjectTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateProjectNoteId(): string {
  return `project_note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function seedProjects(): ProjectRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: "retro-cab",
      name: "Retro Cabinet",
      summary: "Ship the pixel-perfect cabinet UI and align milestones with the focus ritual.",
      chips: ["PIXEL", "UI"],
      focusGoalMinutes: 420,
      updatedAt: now,
      tasks: [
        {
          id: generateProjectTaskId(),
          title: "Map arcade layout to responsive frame",
          status: "active",
          estimateMinutes: 120,
          loggedSeconds: 45 * 60,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateProjectTaskId(),
          title: "Review accessibility hotspots",
          status: "backlog",
          estimateMinutes: 60,
          loggedSeconds: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      notes: [
        {
          id: generateProjectNoteId(),
          body: "Need green-light from UX council before QA push.",
          author: "PM",
          createdAt: now,
        },
      ],
    },
    {
      id: "beans-lab",
      name: "Beans Lab",
      summary: "Operationalize caffeine research sprints and publish blends roadmap.",
      chips: ["RESEARCH", "CAFFEINE"],
      focusGoalMinutes: 360,
      updatedAt: now,
      tasks: [
        {
          id: generateProjectTaskId(),
          title: "Compile lab insights deck",
          status: "active",
          estimateMinutes: 180,
          loggedSeconds: 70 * 60,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateProjectTaskId(),
          title: "Schedule tasting council",
          status: "blocked",
          estimateMinutes: 45,
          loggedSeconds: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      notes: [
        {
          id: generateProjectNoteId(),
          body: "Blocked until supplier samples land.",
          author: "PM",
          createdAt: now,
        },
      ],
    },
    {
      id: "brew-sync",
      name: "Brew Sync",
      summary: "Align the mobile companion app with rituals and deliver first pilot.",
      chips: ["SYNC", "MOBILE"],
      focusGoalMinutes: 300,
      updatedAt: now,
      tasks: [
        {
          id: generateProjectTaskId(),
          title: "Define onboarding narrative",
          status: "active",
          estimateMinutes: 90,
          loggedSeconds: 25 * 60,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: generateProjectTaskId(),
          title: "Draft notification system",
          status: "backlog",
          estimateMinutes: 75,
          loggedSeconds: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      notes: [
        {
          id: generateProjectNoteId(),
          body: "Pilot cohort confirmed for Q1.",
          author: "PM",
          createdAt: now,
        },
      ],
    },
  ];
}

export function addSecondsToProjectTask(
  projects: ProjectRecord[],
  projectId: string,
  taskId: string,
  seconds: number
): ProjectRecord[] {
  const delta = Math.max(0, Math.round(seconds));
  if (delta <= 0) return projects;

  let didChange = false;
  const timestamp = new Date().toISOString();

  const nextProjects = projects.map((project) => {
    if (project.id !== projectId) return project;

    let touchedTask = false;
    const nextTasks = project.tasks.map((task) => {
      if (task.id !== taskId) return task;
      touchedTask = true;
      didChange = true;
      return {
        ...task,
        loggedSeconds: Math.max(0, task.loggedSeconds + delta),
        updatedAt: timestamp,
      };
    });

    if (!touchedTask) return project;
    return {
      ...project,
      tasks: nextTasks,
      updatedAt: timestamp,
    };
  });

  return didChange ? nextProjects : projects;
}
