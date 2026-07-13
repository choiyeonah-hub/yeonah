export type StoredIdentity = {
  familyId: string;
  familyName: string;
  familyCode: string;
  memberId: string;
  nickname: string;
  role: "parent" | "child";
};

const KEY = "habruta.identity";

export function loadIdentity(): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredIdentity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: StoredIdentity) {
  window.localStorage.setItem(KEY, JSON.stringify(identity));
}

export function clearIdentity() {
  window.localStorage.removeItem(KEY);
}
