import { useState } from "react";
import {
  getSavedAccounts,
  getActiveAccountId,
  removeAccount,
} from "../lib/accountManager";
import { BG, BG2, SEP, LBL, LB2, LB3, ACC, SF } from "../constants";

/**
 * AccountSwitcher — iOS-style bottom sheet for switching between
 * saved Techwide Hub accounts.
 *
 * Props:
 *   show        – boolean, whether the sheet is visible
 *   onClose     – callback to close the sheet
 *   onSwitch    – (accountId) => void — called when user picks a different account
 *   onAddNew    – () => void — called when user taps "Add Another Account"
 */
export default function AccountSwitcher({ show, onClose, onSwitch, onAddNew }) {
  const [removing, setRemoving] = useState(null);
  const [switching, setSwitching] = useState(null);

  if (!show) return null;

  const accounts = getSavedAccounts();
  const activeId = getActiveAccountId();

  const handleSwitch = (acct) => {
    if (acct.id === activeId || switching) return;
    setSwitching(acct.id);
    onSwitch(acct.id);
  };

  const handleRemove = (id) => {
    removeAccount(id);
    setRemoving(null);
    if (accounts.length <= 1) onClose();
  };

  // ── Styles ───────────────────────────────────────────────────────
  const overlay = {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "fadeUp .2s ease both",
    fontFamily: SF,
  };

  const sheet = {
    background: BG, borderRadius: "20px 20px 0 0",
    width: "100%", maxWidth: 430,
    padding: "12px 0 env(safe-area-inset-bottom, 20px)",
    maxHeight: "70vh", overflowY: "auto",
    animation: "fadeUp .25s cubic-bezier(.4,0,.2,1) both",
  };

  const handle = {
    width: 36, height: 5, borderRadius: 99,
    background: SEP, margin: "0 auto 14px",
  };

  const row = (isActive) => ({
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 20px", cursor: "pointer",
    background: isActive ? ACC + "0D" : "transparent",
    transition: "background .15s",
  });

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={sheet}>
        <div style={handle} />
        <div style={{ padding: "0 20px 10px", fontSize: 18, fontWeight: 700, color: LBL }}>
          Switch Account
        </div>

        {accounts.map((acct) => {
          const isActive = acct.id === activeId;
          const isSwitching = switching === acct.id;
          const initials = (acct.name || acct.email || "?").slice(0, 2).toUpperCase();

          return (
            <div key={acct.id} style={row(isActive)} onClick={() => handleSwitch(acct)}>
              {/* Avatar: photo or initial */}
              {acct.avatar_url ? (
                <img
                  src={acct.avatar_url}
                  alt={initials}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    objectFit: "cover", flexShrink: 0,
                    border: isActive ? `2px solid ${ACC}` : "2px solid transparent",
                  }}
                />
              ) : (
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: ACC, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, flexShrink: 0,
                  border: isActive ? `2px solid ${ACC}` : "2px solid transparent",
                }}>
                  {initials}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16, fontWeight: 600, color: LBL,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {acct.name || acct.email?.split("@")[0] || "Unknown"}
                  {isActive && (
                    <span style={{
                      fontSize: 10, color: "#fff", fontWeight: 700,
                      background: ACC, borderRadius: 99,
                      padding: "1px 7px", letterSpacing: ".3px",
                    }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: LB3, marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {acct.email}
                  {acct.is_admin && " · Admin"}
                </div>
              </div>

              {isSwitching && (
                <div style={{
                  width: 20, height: 20,
                  border: "2px solid " + ACC + "44",
                  borderTop: "2px solid " + ACC,
                  borderRadius: "50%",
                  animation: "spin .7s linear infinite",
                  flexShrink: 0,
                }} />
              )}

              {!isActive && !isSwitching && (
                <button
                  onClick={(e) => { e.stopPropagation(); setRemoving(acct.id); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 18, color: LB3, padding: "4px 8px", flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: SEP, margin: "8px 20px" }} />

        {/* Add account button */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px", cursor: "pointer",
          }}
          onClick={() => { onClose(); onAddNew(); }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            border: "2px dashed " + SEP,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: LB3,
          }}>
            +
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: ACC }}>
            Add Another Account
          </div>
        </div>

        {/* Remove confirmation */}
        {removing && (
          <div style={{
            margin: "8px 20px", padding: "14px 16px",
            background: "#ff3b3010", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ flex: 1, fontSize: 14, color: "#ff3b30", fontWeight: 500 }}>
              Remove this account from the list?
            </div>
            <button
              onClick={() => handleRemove(removing)}
              style={{
                background: "#ff3b30", color: "#fff", border: "none",
                borderRadius: 8, padding: "7px 14px", fontSize: 14,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              Remove
            </button>
            <button
              onClick={() => setRemoving(null)}
              style={{
                background: BG2, color: LBL, border: "none",
                borderRadius: 8, padding: "7px 14px", fontSize: 14,
                fontWeight: 500, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
