import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login — Vision" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Vision</h1>
          <p className="text-sm text-muted-foreground">
            Dein persönliches Life OS
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
