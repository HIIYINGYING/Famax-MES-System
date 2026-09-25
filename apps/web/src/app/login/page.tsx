"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@famax/auth/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "create-account">("sign-in");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    try {
      if (mode === "create-account") {
        const name = String(form.get("name")).trim();
        if (password !== String(form.get("confirmPassword"))) {
          setError("The passwords do not match.");
          return;
        }
        const result = await authClient.signUp.email({ name, email, password, callbackURL: "/dashboard" });
        if (result.error) {
          setError(result.error.message ?? "Unable to create your account. Check the details and try again.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
        if (result.error) {
          setError(result.error.message ?? "Unable to sign in. Check your details and try again.");
          return;
        }
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("The account service is unavailable. Check that the database is connected and try again.");
    } finally {
      setPending(false);
    }
  }

  const creating = mode === "create-account";
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark">FM</span><span><strong>FAMAX</strong><small>MANUFACTURING SYSTEMS</small></span></div>
        <div className="login-intro"><span className="eyebrow">MES WORKSPACE</span><h1>{creating ? "Create your account" : "Welcome back"}</h1><p>{creating ? "Create an account to access your manufacturing workspace." : "Sign in to your manufacturing operations workspace."}</p></div>
        <form className="login-form" onSubmit={submit}>
          {creating && <label>Full name<input autoComplete="name" name="name" type="text" placeholder="Your name" minLength={2} required/></label>}
          <label>Email address<input autoComplete="email" name="email" type="email" placeholder="you@company.com" required/></label>
          <label>Password<input autoComplete={creating ? "new-password" : "current-password"} name="password" type="password" placeholder={creating ? "At least 8 characters" : "Enter your password"} minLength={8} required/></label>
          {creating && <label>Confirm password<input autoComplete="new-password" name="confirmPassword" type="password" placeholder="Enter the password again" minLength={8} required/></label>}
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="button login-submit" disabled={pending}>{pending ? (creating ? "Creating account…" : "Signing in…") : (creating ? "Create account" : "Sign in")}</button>
        </form>
        <p className="login-account-switch">{creating ? "Already have an account?" : "Need an account?"} <button type="button" onClick={() => { setError(""); setMode(creating ? "sign-in" : "create-account"); }}>{creating ? "Sign in" : "Create account"}</button></p>
        <p className="login-foot">New accounts receive the Operator role. Ask your system administrator if you need different access.</p>
      </section>
      <div className="login-side"><div className="login-side-copy"><span>BUILT FOR THE FLOOR</span><h2>One clear view<br/>of every operation.</h2><p>Connect customer demand, production, supply chain and quality in a single reliable workspace.</p></div><div className="login-side-foot">FAMAX Manufacturing Execution System</div></div>
    </main>
  );
}
