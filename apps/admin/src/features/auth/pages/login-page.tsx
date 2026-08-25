import { FormProvider } from "react-hook-form";

import { FormOtpInput } from "~/shared/components/forms/adapters/form-otp-input";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormActions } from "~/shared/components/forms/form-actions";
import { FormFeedback } from "~/shared/components/forms/form-feedback";

import { useLoginController } from "../hooks/use-login-controller";

import type { LoginFormValues } from "../types";

interface LoginCopyInput {
  developmentOtp: string;
  email: string;
  emailStep: boolean;
}

function getLoginCopy({ developmentOtp, email, emailStep }: LoginCopyInput) {
  if (!emailStep) {
    return {
      busyLabel: "Verificando...",
      instructions: developmentOtp
        ? `Development usa el código fijo ${developmentOtp}.`
        : `Introduce el código enviado a ${email}.`,
      submitLabel: "Entrar",
    };
  }

  if (developmentOtp) {
    return {
      busyLabel: "Preparando...",
      instructions: "Introduce el email de una cuenta provisionada.",
      submitLabel: "Continuar",
    };
  }

  return {
    busyLabel: "Solicitando...",
    instructions: "Solicita un código de acceso.",
    submitLabel: "Solicitar código",
  };
}

export function LoginPage() {
  const controller = useLoginController();
  const emailStep = controller.step === "email";
  const email = controller.form.watch("email");
  const { busyLabel, instructions, submitLabel } = getLoginCopy({
    developmentOtp: controller.developmentOtp,
    email,
    emailStep,
  });
  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel" aria-labelledby="login-title">
        <div className="admin-page-header admin-login-header">
          <h2 id="login-title">QMenut Admin</h2>
          <p>{instructions}</p>
        </div>
        <FormProvider {...controller.form}>
          <div className="admin-login-form">
            {emailStep ? (
              <FormTextInput<LoginFormValues>
                autocomplete="email"
                disabled={controller.busy}
                inputMode="email"
                label="Email"
                name="email"
                placeholder="nombre@turestaurante.com"
                type="email"
              />
            ) : (
              <FormOtpInput<LoginFormValues> disabled={controller.busy} label="Código OTP" length={6} name="otp" />
            )}
            <FormFeedback error={controller.error} />
            <FormActions
              busy={controller.busy}
              busyLabel={busyLabel}
              onCancel={emailStep ? undefined : controller.changeEmail}
              onSubmit={() => void controller.submit()}
              submitLabel={submitLabel}
            />
          </div>
        </FormProvider>
      </section>
    </main>
  );
}
