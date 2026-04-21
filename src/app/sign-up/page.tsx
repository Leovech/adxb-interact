import Header from "@/components/Header";
import SignUpForm from "@/components/auth/SignUpForm";
import { UserPlus } from "lucide-react";

export const metadata = {
  title: "Sign up · ADXBInteract",
};

export default function SignUpPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-lg shadow-black/10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <UserPlus className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Create your account</h1>
              <p className="text-xs text-muted">
                Track recommendations, save projects, and tune the AI to your style
              </p>
            </div>
          </div>
          <SignUpForm />
        </div>
      </main>
    </>
  );
}
