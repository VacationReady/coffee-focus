import { redirect } from "next/navigation";

import { FocusBoard } from "@/components/focus/focus-board";
import { getServerAuthSession } from "@/lib/auth";
import { projectInclude } from "@/lib/project-query";
import { prisma } from "@/lib/prisma";
import { serializeProject, serializeStickyNote } from "@/lib/serializers";

export default async function HomePage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [projects, stickyNotes] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.user.id },
      include: projectInclude,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.stickyNote.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <FocusBoard
      initialProjects={projects.map(serializeProject)}
      initialStickyNotes={stickyNotes.map(serializeStickyNote)}
      userName={session.user.name}
    />
  );
}
