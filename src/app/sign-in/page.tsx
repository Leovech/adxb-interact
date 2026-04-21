import Header from "@/components/Header";
import SignInForm from "@/components/auth/SignInForm";
import { LogIn } from "lucide-react";

export const metadata = {
  title: "Sign in · ADXBInteract",
};

export default function SignInPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-lg shadow-black/10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <LogIn className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Welcome back</h1>
              <p className="text-xs text-muted">Sign in to unlock your account</p>
            </div>
          </div>
          <SignInForm />
        </div>
      </main>
    </>
  );
}
