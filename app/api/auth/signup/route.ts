import { NextResponse } from "next/server";
import { createLocalUser } from "@/lib/local-db";
import { sanitizeText } from "@/lib/sanitize";

type Payload = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const name = sanitizeText(String(payload.name ?? ""), 120);
  const email = sanitizeText(String(payload.email ?? ""), 180).toLowerCase();
  const password = String(payload.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const created = await createLocalUser({ name, email, password, role: "sales" });
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 409 });
  }

  return NextResponse.json(
    {
      success: true,
      user: {
        name: created.user.name,
        email: created.user.email,
        role: created.user.role,
      },
    },
    { status: 201 },
  );
}
