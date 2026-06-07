import { useMutation, useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ORPCUtils } from "./orpc-types";

export function relationLabel(relationStatus: string) {
  switch (relationStatus) {
    case "self":
      return "Ton profil";
    case "friend":
      return "Ami";
    case "incoming_pending":
      return "Demande reçue";
    case "outgoing_pending":
      return "Demande envoyée";
    default:
      return "Profil public";
  }
}

export type UserProfileHookDeps = {
  orpc: ORPCUtils;
  queryClient: QueryClient;
  profileUserId: number;
  onRemoved?: () => void;
};

export function useUserProfile({
  orpc,
  queryClient,
  profileUserId,
  onRemoved,
}: UserProfileHookDeps) {
  const hasValidId = Number.isInteger(profileUserId) && profileUserId > 0;

  const profileQuery = useQuery({
    ...orpc.user.profile.queryOptions({ input: { userId: hasValidId ? profileUserId : 1 } }),
    enabled: hasValidId,
  });

  const profile = hasValidId ? profileQuery.data ?? null : null;

  const removeFriend = useMutation(
    orpc.user.removeFriend.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.user.friends.queryKey() });
        await queryClient.invalidateQueries({
          queryKey: orpc.user.profile.queryKey({ input: { userId: profileUserId } }),
        });
        onRemoved?.();
      },
    }),
  );

  function removeCurrentFriend() {
    if (!profile) return;
    removeFriend.mutate({ userId: profile.id });
  }

  return { hasValidId, profileQuery, profile, removeFriend, removeCurrentFriend };
}