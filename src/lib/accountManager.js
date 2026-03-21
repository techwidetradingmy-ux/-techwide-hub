// Account Manager - Manages multiple Techwide Hub accounts

const STORAGE_KEY = "tw_accounts";
const ACTIVE_KEY = "tw_active_account";

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function getActiveAccountId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

function setActiveId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

/**
 * Save/update an account with its session tokens and profile data.
 * @param {object} session  – Supabase session (access_token, refresh_token)
 * @param {object} profile  – Profile row (id, email, name, avatar, avatar_url, is_admin)
 */
export function upsertAccount(session, profile) {
  const accounts = loadAccounts();
  const id = profile.id;
  const idx = accounts.findIndex((a) => a.id === id);
  const initials = (profile.name || profile.email || "").slice(0, 2).toUpperCase() || "??";
  const entry = {
    id,
    authEmail: session?.user?.email || "",
    email: profile.email || "",
    name: profile.name || profile.email?.split("@")[0] || "",
    nickname: profile.nickname || null,
    avatar_url: profile.avatar_url || null,
    avatar: profile.avatar || initials,
    is_admin: !!profile.is_admin,
    access_token: session?.access_token || null,
    refresh_token: session?.refresh_token || null,
    lastUsed: Date.now(),
  };
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...entry };
  else accounts.push(entry);
  saveAccounts(accounts);
  setActiveId(id);
  return accounts;
}

/**
 * Return all saved accounts with profile info (tokens stripped out).
 */
export function getSavedAccounts() {
  return loadAccounts().map(({ access_token, refresh_token, ...rest }) => rest);
}

/**
 * Return stored session tokens for a given account ID (for seamless switch).
 */
export function getAccountSession(accountId) {
  const accounts = loadAccounts();
  const acct = accounts.find((a) => a.id === accountId);
  if (!acct) return null;
  return { access_token: acct.access_token, refresh_token: acct.refresh_token };
}

export function removeAccount(id) {
  const accounts = loadAccounts().filter((a) => a.id !== id);
  saveAccounts(accounts);
  if (getActiveAccountId() === id) setActiveId(accounts[0]?.id || null);
  return accounts;
}

export function getAccountsSorted() {
  return loadAccounts()
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    .map(({ access_token, refresh_token, ...rest }) => rest);
}

/**
 * Switch to a saved account — sets it as active and returns stored tokens.
 * Caller is responsible for calling supabase.auth.setSession(tokens).
 */
export function switchToAccount(accountId) {
  const tokens = getAccountSession(accountId);
  if (!tokens?.access_token || !tokens?.refresh_token) {
    throw new Error("No stored session for this account");
  }
  setActiveId(accountId);
  return tokens;
}

export default {
  getSavedAccounts,
  getActiveAccountId,
  upsertAccount,
  removeAccount,
  getAccountSession,
  getAccountsSorted,
  switchToAccount,
};
