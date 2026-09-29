import { useEffect, useRef } from "react";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormOtpInput } from "~/shared/components/forms/adapters/form-otp-input";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormActions } from "~/shared/components/forms/form-actions";

import { useLoginController } from "../hooks/use-login-controller";
import { loginFormSchema } from "../types";

import type { LoginFormValues } from "../types";
import type { SyntheticEvent } from "react";

interface LoginCopyInput {
  developmentOtp: string;
  email: string;
  emailStep: boolean;
}

function getLoginCopy({ developmentOtp, email, emailStep }: LoginCopyInput) {
  if (!emailStep) {
    return {
      busyLabel: i18n.t("auth___Verificando…"),
      instructions: developmentOtp
        ? i18n.t("auth___Development usa el código fijo {{code}}.", { code: developmentOtp })
        : i18n.t("auth___Introduce el código enviado a {{email}}.", { email }),
      submitLabel: i18n.t("auth___Entrar"),
    };
  }

  if (developmentOtp) {
    return {
      busyLabel: i18n.t("auth___Preparando…"),
      instructions: i18n.t("auth___Introduce el email de una cuenta provisionada."),
      submitLabel: i18n.t("auth___Continuar"),
    };
  }

  return {
    busyLabel: i18n.t("auth___Solicitando…"),
    instructions: i18n.t("auth___Solicita un código de acceso."),
    submitLabel: i18n.t("auth___Solicitar código"),
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
  const formRef = useRef<HTMLFormElement>(null);
  const focusSubmit = () => formRef.current?.querySelector<HTMLButtonElement>("button[type=submit]")?.focus();
  const { busy, form, step } = controller;
  // The submit button remounts when `busy` flips, so move focus once the OTP step is idle and already filled.
  useEffect(() => {
    if (step === "otp" && !busy && loginFormSchema.shape.otp.safeParse(form.getValues("otp")).success) focusSubmit();
  }, [busy, form, step]);
  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void controller.submit();
  }
  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel" aria-labelledby={"login-title"}>
        <div className={"admin-page-header admin-login-header"}>
          <h1 id={"login-title"}>{i18n.t("auth___QMenut Admin")}</h1>
          <p>{instructions}</p>
        </div>
        <FormProvider {...controller.form}>
          <form className="admin-login-form" noValidate onSubmit={handleFormSubmit} ref={formRef}>
            {emailStep ? (
              <FormTextInput<LoginFormValues>
                autocomplete={"email"}
                disabled={controller.busy}
                inputMode={"email"}
                label={i18n.t("auth___Email")}
                name={"email"}
                placeholder={i18n.t("auth___nombre@turestaurante.com")}
                type={"email"}
              />
            ) : (
              <FormOtpInput<LoginFormValues>
                disabled={controller.busy}
                label={i18n.t("auth___Código OTP")}
                length={6}
                name={"otp"}
                onComplete={focusSubmit}
              />
            )}
            {emailStep ? null : (
              <div className="admin-login-resend">
                <span>{i18n.t("auth___¿No te llegó el código?")}</span>
                <button
                  disabled={controller.resending || controller.resendCountdown > 0}
                  onClick={controller.resendOtp}
                  type={"button"}
                >
                  {controller.resendCountdown > 0
                    ? i18n.t("auth___Reenviar en {{seconds}}s", { seconds: controller.resendCountdown })
                    : i18n.t("auth___Reenviar código")}
                </button>
              </div>
            )}
            <FormActions
              busy={controller.busy}
              busyLabel={busyLabel}
              onCancel={emailStep ? undefined : controller.changeEmail}
              onSubmit={() => void controller.submit()}
              submitLabel={submitLabel}
              submitType={"submit"}
            />
          </form>
        </FormProvider>
      </section>
    </main>
  );
}
