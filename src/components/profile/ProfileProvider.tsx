"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
export interface Profile { id: string; full_name?: string | null; role?: string; demo?: boolean; }
const ProfileContext = createContext<{ profile: Profile | null; refresh: () => void }>({ profile: null, refresh: () => {} });
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const refresh = useCallback(() => {
    fetch("/api/profile", { cache: "no-store" }).then(async r => {
      if (!r.ok) { setProfile(null); return; }
      setProfile(await r.json());
    }).catch(() => setProfile(null));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <ProfileContext.Provider value={{ profile, refresh }}>{children}</ProfileContext.Provider>;
}
export const useProfile = () => useContext(ProfileContext);
