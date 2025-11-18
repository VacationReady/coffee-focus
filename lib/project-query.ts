export const projectInclude = {
  tasks: {
    orderBy: { createdAt: "asc" as const },
  },
  notes: {
    orderBy: { createdAt: "desc" as const },
  },
  stickyNotes: {
    orderBy: { createdAt: "desc" as const },
  },
};
