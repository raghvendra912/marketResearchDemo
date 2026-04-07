import { NextResponse } from "next/server";
import { listLocalUsers } from "@/lib/local-db";

export async function GET() {
  const users = await listLocalUsers();
  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      password: user.password,
    })),
  });
}
