import { useRouteContext } from "@tanstack/react-router";

export function useAppTrpc() {
  return useRouteContext({
    from: "__root__",
    select: (context) => context.trpc,
  });
}
