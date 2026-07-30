import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { requestLoginOtp, signInWithOtp } from "../api";
import { loginFormSchema } from "../types";

import type { LoginFormValues } from "../types";

export function useLoginController() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const requestOtp = useMutation({ mutationFn: requestLoginOtp });
  const signIn = useMutation({
    mutationFn: ({ email, otp }: LoginFormValues) => signInWithOtp(email, otp),
  });
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", otp: "" },
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
    signIn.mutate(values, { onSuccess: () => void navigate({ to: "/" }) });
  }
  function changeEmail() {
    requestOtp.reset();
    signIn.reset();
    form.resetField("otp");
    setStep("email");
  }
  const mutation = step === "email" ? requestOtp : signIn;
  return { busy: mutation.isPending, error: mutation.error, form, step, submit, changeEmail };
}
