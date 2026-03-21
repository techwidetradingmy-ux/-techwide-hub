const ACCOUNTS_KEY = "techwide_accounts";
const ACTIVE_KEY = "techwide_active_account";

export function upsertAccount(session, profile) {
  if (!session?.user?.id) return;
  const accounts = getAllAccounts();
  const id = session.user.id;
  accounts[id] = {
    id,
    email: session.user.email || profile?.email || "",
    name: profile?.display_name || profile?.full_name || session.user.email || "",
    avatar_url: profile?.avatar_url || "",
    access_token: session.access_token || "",
    refresh_token: session.refresh_token || "",
    updated_at: Date.now()
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem(ACTIVE_KEY, id);
}

function getAllAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getSavedAccounts() {
  const accounts = getAllAccounts();
  return Object.values(accounts).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}

export function getAccountSession(accountId) {
  const accounts = getAllAccounts();
  const acct = accounts[accountId];
  if (!acct || !acct.access_token || !acct.refresh_token) return null;
  return { access_token: acct.access_token, refresh_token: acct.refresh_token };
}

export function removeAccount(accountId) {
  const accounts = getAllAccounts();
  delete accounts[accountId];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  const active = localStorage.getItem(ACTIVE_KEY);
  if (active === accountId) {
    const remaining = Object.keys(accounts);
    localStorage.setItem(ACTIVE_KEY, remaining.length > 0 ? remaining[0] : "");
  }
}

export function getActiveAccountId() {
  return localStorage.getItem(ACTIVE_KEY) || "";
}
