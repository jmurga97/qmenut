import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import * as api from "~/features/notifications/api";
import * as services from "~/features/notifications/services";
import { trpc } from "~/lib/trpc";

export type PushDeviceStatus = "loading" | "unsupported" | "iosInstall" | "unavailable" | "denied" | "off" | "on";

/** Push state of this browser for the signed-in member, and the actions of the "this device" control. */
export function usePushDevice() {
  const queryClient = useQueryClient();
  const support = services.getPushSupport();
  const [subscription, setSubscription] = useState<PushSubscription | null | undefined>(
    support === "supported" ? undefined : null,
  );
  const [denied, setDenied] = useState(() => support === "supported" && Notification.permission === "denied");
  const configQuery = useQuery({ ...api.getPushConfigQueryOptions({ trpc }), enabled: support === "supported" });
  const deviceQuery = useQuery({
    ...api.getPushDeviceQueryOptions({ endpoint: subscription?.endpoint ?? "", trpc }),
    enabled: Boolean(subscription),
  });
  const options = api.getNotificationMutationOptions({ queryClient, trpc });
  const saveDevice = useMutation(options.saveDevice);
  const removeDevice = useMutation(options.removeDevice);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (support === "supported") void services.getCurrentSubscription().then(setSubscription);
  }, [support]);

  async function turnOn(branchIds: string[]) {
    const publicKey = configQuery.data?.publicKey;
    if (!publicKey) return;
    setWorking(true);
    try {
      const next = await services.subscribeToPush(publicKey);
      if (!next) {
        setDenied(Notification.permission === "denied");
        return;
      }
      await saveDevice.mutateAsync({
        ...services.getSubscriptionKeys(next),
        branchIds,
        language: services.getAdminLanguage(),
      });
      setSubscription(next);
    } finally {
      setWorking(false);
    }
  }

  async function updateBranches(branchIds: string[]) {
    if (!subscription) return;
    await saveDevice.mutateAsync({
      ...services.getSubscriptionKeys(subscription),
      branchIds,
      language: services.getAdminLanguage(),
    });
  }

  async function turnOff() {
    if (!subscription) return;
    setWorking(true);
    try {
      await removeDevice.mutateAsync({ endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      setSubscription(null);
    } finally {
      setWorking(false);
    }
  }

  function getStatus(): PushDeviceStatus {
    if (support !== "supported") return support;
    if (configQuery.isPending || subscription === undefined || (subscription && deviceQuery.isPending)) {
      return "loading";
    }
    if (!configQuery.data?.publicKey) return "unavailable";
    if (denied) return "denied";
    // A subscription another member registered on this browser counts as off for this member.
    return deviceQuery.data?.branchIds ? "on" : "off";
  }

  return {
    busy: working || saveDevice.isPending || removeDevice.isPending,
    followedBranchIds: deviceQuery.data?.branchIds ?? null,
    status: getStatus(),
    turnOff,
    turnOn,
    updateBranches,
  };
}
