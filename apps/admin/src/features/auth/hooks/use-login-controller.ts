import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { requestLoginOtp, signInWithOtp } from "../api";
import { loginFormSchema } from "../types";

import type { LoginFormValues } from "../types";

const developmentOtp = import.meta.env.VITE_DEV_FIXED_OTP ?? "";

export function useLoginController() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const requestOtp = useMutation({ mutationFn: requestLoginOtp });
  const signIn = useMutation({
    mutationFn: ({ email, otp }: LoginFormValues) => signInWithOtp(email, otp),
  });
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", otp: developmentOtp },
  });

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
          setStep("otp");
        },
      });
      return;
    }
    try {
      await signIn.mutateAsync(values);
      await navigate({ to: "/" });
    } catch {
      // useMutation conserva el error para FormFeedback.
    }
  }
  function changeEmail() {
    requestOtp.reset();
    signIn.reset();
    form.resetField("email");
    form.resetField("otp");
    setStep("email");
  }
  const activeMutation = step === "email" ? requestOtp : signIn;
  const busy = activeMutation.isPending;
  const error = activeMutation.error;
  return {
    busy,
    developmentOtp,
    error,
    form,
    step,
    submit,
    changeEmail,
  };
}
