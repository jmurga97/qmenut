import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

import { authClient } from "@lib/auth-client";
import { getErrorMessage } from "@lib/errors";

import type { FormEvent } from "react";

type LoginStep = "email" | "otp";

interface AuthErrorResult {
  error?: {
    message?: string;
    statusText?: string;
  } | null;
}

function assertAuthResult(result: AuthErrorResult) {
  if (!result.error) {
    return;
  }

  throw new Error(result.error.message ?? result.error.statusText ?? "Autenticación rechazada.");
}

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (session) {
      redirect({ to: "/", throw: true });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const emailInputId = useId();
  const otpInputId = useId();
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });

      assertAuthResult(result);
      setOtp("");
      setStep("otp");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp,
      });

      assertAuthResult(result);
      await navigate({ to: "/" });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel" aria-labelledby="login-title">
        <div className="admin-page-header admin-login-header">
          <div className="admin-kicker">QMenut Admin</div>
          <h2 id="login-title">Acceso privado.</h2>
          <p>
            {step === "email"
              ? "Introduce tu email para solicitar un código de un solo uso. Solo se enviará si el correo está autorizado."
              : `Si ${email} está autorizado, recibirás un código de 6 dígitos para completar el acceso.`}
          </p>
        </div>

        {step === "email" ? (
          <form
            className="admin-login-form"
            onSubmit={(event) => {
              void handleEmailSubmit(event);
            }}
          >
            <label className="admin-login-field" htmlFor={emailInputId}>
              <span>Email</span>
              <input
                autoComplete="email"
                disabled={isSubmitting}
                id={emailInputId}
                onChange={(event) => {
                  setEmail(event.currentTarget.value);
                }}
                placeholder="nombre@turestaurante.com"
                required
                type="email"
                value={email}
              />
            </label>

            {error ? (
              <p className="admin-login-error" role="alert">
                {error}
              </p>
            ) : null}

            <button className="admin-login-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Solicitando..." : "Solicitar código"}
            </button>
          </form>
        ) : (
          <form
            className="admin-login-form"
            onSubmit={(event) => {
              void handleOtpSubmit(event);
            }}
          >
            <label className="admin-login-field" htmlFor={otpInputId}>
              <span>Código OTP</span>
              <input
                autoComplete="one-time-code"
                disabled={isSubmitting}
                id={otpInputId}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => {
                  setOtp(event.currentTarget.value.replace(/\D/g, "").slice(0, 6));
                }}
                pattern="[0-9]*"
                placeholder="000000"
                required
                type="text"
                value={otp}
              />
            </label>

            {error ? (
              <p className="admin-login-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="admin-login-actions">
              <button className="admin-login-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Verificando..." : "Entrar"}
              </button>
              <button
                className="admin-login-secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setOtp("");
                  setStep("email");
                }}
                type="button"
              >
                Cambiar email
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
