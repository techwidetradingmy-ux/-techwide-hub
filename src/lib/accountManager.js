// Account Manager - Manages multiple Techwide Hub accounts
import { supabase } from "../supabaseClient";

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

function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

function setActiveId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function getSavedAccounts() {
  return loadAccounts();
}

export function getActiveAccountId() {
  return getActiveId();
}

export function upsertAccount({ id, email, name, avatar, is_admin }) {
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  const entry = {
    id,
    email: email || "",
    name: name || email?.split("@")[0] || "",
    avatar: avatar || (email || "").split("@")[0].slice(0, 2).toUpperCase(),
    is_admin: !!is_admin,
    lastUsed: Date.now(),
  };
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...entry };
  else accounts.push(entry);
  saveAccounts(accounts);
  setActiveId(id);
  return accounts;
}

export function removeAccount(id) {
  const accounts = loadAccounts().filter((a) => a.id !== id);
  saveAccounts(accounts);
  if (getActiveId() === id) setActiveId(accounts[0]?.id || null);
  return accounts;
}

export async function switchToAccount(targetId) {
  const accounts = loadAccounts();
  const target = accounts.find((a) => a.id === targetId);
  if (!target) throw new Error("Account not found");
  await supabase.auth.signOut();
  setActiveId(targetId);
  target.lastUsed = Date.now();
  saveAccounts(accounts);
  return target;
}

export async function loginToAccount(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutAccount(removeFromList = false) {
  const currentId = getActiveId();
  await supabase.auth.signOut();
  if (removeFromList && currentId) removeAccount(currentId);
  else setActiveId(null);
}

export function getAccountsSorted() {
  return loadAccounts().sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
}

export default {
  getSavedAccounts,
  getActiveAccountId,
  upsertAccount,
  removeAccount,
  switchToAccount,
  loginToAccount,
  signOutAccount,
  getAccountsSorted,
};
