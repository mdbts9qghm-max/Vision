"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from "@/server/session";

const loginSchema = z.object({
  passcode: z.string().min(1, "Bitte Passcode eingeben."),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    passcode: formData.get("passcode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const expected = process.env.PASSCODE;
  if (!expected) {
    return { error: "PASSCODE ist nicht konfiguriert — siehe .env.example." };
  }
  if (!timingSafeEqual(parsed.data.passcode, expected)) {
    return { error: "Falscher Passcode." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
