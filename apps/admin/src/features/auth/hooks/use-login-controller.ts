import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { requestLoginOtp, signInWithOtp } from "../api";
import { loginFormSchema } from "../types";

import type { LoginFormValues } from "../types";

const developmentOtp = import.meta.env.VITE_DEV_FIXED_OTP ?? "";
const RESEND_COOLDOWN_SECONDS = 30;

export function useLoginController() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [resendCountdown, setResendCountdown] = useState(0);
  const requestOtp = useMutation({ mutationFn: requestLoginOtp });
  const resendOtpMutation = useMutation({ mutationFn: requestLoginOtp });
  const signIn = useMutation({
    mutationFn: ({ email, otp }: LoginFormValues) => signInWithOtp(email, otp),
  });
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", otp: developmentOtp },
  });

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((seconds) => seconds - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  async function submit() {
    if (!(await form.trigger(step))) {
      return;
    }
    const values = form.getValues();
    values.email = values.email.trim();
    if (step === "email") {
      requestOtp.mutate(values.email, {
        onSuccess: () => {
          form.resetField("otp");
          setResendCountdown(RESEND_COOLDOWN_SECONDS);
          setStep("otp");
        },
      });
      return;
    }
    try {
      await signIn.mutateAsync(values);
      await navigate({ to: "/" });
    } catch {
      // MutationCache already reports the error through Sonner.
    }
  }
  function resendOtp() {
    const email = form.getValues("email").trim();
    if (!email || resendOtpMutation.isPending || resendCountdown > 0) {
      return;
    }
    resendOtpMutation.mutate(email, {
      onSuccess: () => {
        setResendCountdown(RESEND_COOLDOWN_SECONDS);
      },
    });
  }
  function changeEmail() {
    requestOtp.reset();
    resendOtpMutation.reset();
    signIn.reset();
    form.resetField("email");
    form.resetField("otp");
    setResendCountdown(0);
    setStep("email");
  }
  const activeMutation = step === "email" ? requestOtp : signIn;
  const busy = activeMutation.isPending;
  return {
    busy,
    developmentOtp,
    form,
    resendCountdown,
    resending: resendOtpMutation.isPending,
    step,
    submit,
    resendOtp,
    changeEmail,
  };
}
