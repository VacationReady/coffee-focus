type FocusSessionStatus = "running" | "completed" | "cancelled";

type ProjectTaskModel = {
  id: string;
  projectId: string;
  title: string;
  status: "backlog" | "active" | "blocked" | "done";
  estimateMinutes: number | null;
  loggedSeconds: number;
  owner: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProjectNoteModel = {
  id: string;
  projectId: string;
  body: string;
  author: string;
  createdAt: Date;
};

type ProjectModel = {
  id: string;
  name: string;
  summary: string;
  chips: string[];
  focusGoalMinutes: number | null;
  objective: string | null;
  ownerName: string | null;
  priority: string | null;
  startDate: Date | null;
  targetLaunchDate: Date | null;
  successCriteria: string | null;
  budget: string | null;
  stakeholders: string[];
  createdAt: Date;
  updatedAt: Date;
  tasks: ProjectTaskModel[];
  notes: ProjectNoteModel[];
};

type StickyNoteModel = {
  id: string;
  userId: string | null;
  text: string | null;
  x: number;
  y: number;
  completed: boolean;
  createdAt: Date;
  completedAt: Date | null;
  projectId: string | null;
};

type FocusSessionModel = {
  id: string;
  durationSeconds: number;
  status: FocusSessionStatus;
  note: string | null;
  startedAt: Date;
  completedAt: Date | null;
  projectId: string | null;
  project?: { id: string; name: string } | null;
  projectTaskId: string | null;
  task?: { id: string; title: string } | null;
};

export type ProjectTaskDTO = {
  id: string;
  projectId: string;
  title: string;
  status: ProjectTaskModel["status"];
  estimateMinutes?: number;
  loggedSeconds: number;
  owner?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectNoteDTO = {
  id: string;
  projectId: string;
  body: string;
  author: string;
  createdAt: string;
};

export type ProjectDTO = {
  id: string;
  name: string;
  summary: string;
  chips: string[];
  focusGoalMinutes?: number;
  objective?: string;
  owner?: string;
  priority?: string;
  startDate?: string;
  targetLaunchDate?: string;
  successCriteria?: string;
  budget?: string;
  stakeholders: string[];
  createdAt: string;
  updatedAt: string;
  tasks: ProjectTaskDTO[];
  notes: ProjectNoteDTO[];
};

export type StickyNoteDTO = {
  id: string;
  userId?: string;
  text: string;
  x: number;
  y: number;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  projectId?: string;
};

export type FocusSessionDTO = {
  id: string;
  durationSeconds: number;
  status: FocusSessionStatus;
  note?: string;
  startedAt: string;
  completedAt?: string;
  projectId?: string;
  projectName?: string;
  projectTaskId?: string;
  projectTaskTitle?: string;
};

export function serializeProjectTask(task: ProjectTaskModel): ProjectTaskDTO {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    estimateMinutes: task.estimateMinutes ?? undefined,
    loggedSeconds: task.loggedSeconds,
    owner: task.owner ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializeProjectNote(note: ProjectNoteModel): ProjectNoteDTO {
  return {
    id: note.id,
    projectId: note.projectId,
    body: note.body,
    author: note.author,
    createdAt: note.createdAt.toISOString(),
  };
}

export function serializeProject(project: ProjectModel): ProjectDTO {
  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    chips: project.chips,
    focusGoalMinutes: project.focusGoalMinutes ?? undefined,
    objective: project.objective ?? undefined,
    owner: project.ownerName ?? undefined,
    priority: project.priority ?? undefined,
    startDate: project.startDate?.toISOString(),
    targetLaunchDate: project.targetLaunchDate?.toISOString(),
    successCriteria: project.successCriteria ?? undefined,
    budget: project.budget ?? undefined,
    stakeholders: project.stakeholders ?? [],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    tasks: project.tasks
      .slice()
      .sort((a: ProjectTaskModel, b: ProjectTaskModel) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(serializeProjectTask),
    notes: project.notes
      .slice()
      .sort((a: ProjectNoteModel, b: ProjectNoteModel) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(serializeProjectNote),
  };
}

export function serializeStickyNote(note: StickyNoteModel): StickyNoteDTO {
  return {
    id: note.id,
    userId: note.userId ?? undefined,
    text: note.text ?? "",
    x: note.x,
    y: note.y,
    completed: note.completed,
    createdAt: note.createdAt.toISOString(),
    completedAt: note.completedAt?.toISOString(),
    projectId: note.projectId ?? undefined,
  };
}

export function serializeFocusSession(session: FocusSessionModel): FocusSessionDTO {
  return {
    id: session.id,
    durationSeconds: session.durationSeconds,
    status: session.status,
    note: session.note ?? undefined,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString(),
    projectId: session.projectId ?? undefined,
    projectName: session.project?.name ?? undefined,
    projectTaskId: session.projectTaskId ?? undefined,
    projectTaskTitle: session.task?.title ?? undefined,
  };
}
