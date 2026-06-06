export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type SearchUser = {
  id: number;
  username: string;
  avatarUrl: string;
  relationStatus: "none" | "outgoing_pending" | "incoming_pending" | "friend";
};

export type PendingRequest = {
  requestId: number;
  senderId: number;
  username: string;
  createdAt: string; // sérialisé par oRPC → string, pas Date
};

export type Friend = {
  id: number;
  username: string;
  avatarUrl: string;
};

export default {} as const;
