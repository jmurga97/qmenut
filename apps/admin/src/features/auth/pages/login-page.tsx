import { FormProvider } from "react-hook-form";

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
            <FormTextInput<LoginFormValues>
              autocomplete={emailStep ? "email" : "one-time-code"}
              disabled={controller.busy}
              inputMode={emailStep ? "email" : "numeric"}
              key={emailStep ? "email" : "otp"}
              label={emailStep ? "Email" : "Código OTP"}
              maxLength={emailStep ? undefined : 6}
              name={emailStep ? "email" : "otp"}
              placeholder={emailStep ? "nombre@turestaurante.com" : "000000"}
              type={emailStep ? "email" : "text"}
            />
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
