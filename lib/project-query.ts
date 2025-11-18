export const projectInclude = {
  tasks: {
    orderBy: { createdAt: "asc" as const },
    include: {
      assignee: true,
    },
  },
  notes: {
    orderBy: { createdAt: "desc" as const },
  },
  stickyNotes: {
    orderBy: { createdAt: "desc" as const },
  },
};
