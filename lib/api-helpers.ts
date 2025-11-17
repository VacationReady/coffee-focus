import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";

export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export async function requireUser() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  return { session, userId: session.user.id };
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export function withRouteErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
  return (async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  });
}
