import { useState } from "react";
import { getSavedAccounts, getActiveAccountId, removeAccount } from "../lib/accountManager";

export default function AccountSwitcher({ show, onClose, onSwitch, onAddNew }) {
  const [accounts, setAccounts] = useState([]);
  const activeId = getActiveAccountId();

  if (!show) return null;

  const refreshAccounts = () => setAccounts(getSavedAccounts());
  if (accounts.length === 0 && show) {
    const saved = getSavedAccounts();
    if (saved.length > 0 && accounts.length === 0) {
      setTimeout(() => setAccounts(saved), 0);
    }
  }

  const handleRemove = (e, id) => {
    e.stopPropagation();
    if (id === activeId) return;
    removeAccount(id);
    setAccounts(getSavedAccounts());
  };

  const getInitial = (name, email) => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    if (email && email.length > 0) return email.charAt(0).toUpperCase();
    return "?";
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onClose}>
      <div style={{
        background: "#1a1a2e", borderRadius: 16, padding: 24,
        width: "90%", maxWidth: 360, maxHeight: "80vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 20
        }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: 18 }}>Switch Account</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#888", fontSize: 22,
            cursor: "pointer", padding: 4
          }}>&times;</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accounts.map(acct => (
            <div key={acct.id} onClick={() => {
              if (acct.id !== activeId) onSwitch(acct.id);
            }} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderRadius: 12, cursor: acct.id === activeId ? "default" : "pointer",
              background: acct.id === activeId ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
              border: acct.id === activeId ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
              transition: "background 0.2s"
            }}>
              {acct.avatar_url ? (
                <img src={acct.avatar_url} alt="" style={{
                  width: 40, height: 40, borderRadius: "50%", objectFit: "cover"
                }} />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 16
                }}>{getInitial(acct.name, acct.email)}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: "#fff", fontWeight: 600, fontSize: 14,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>{acct.name || "User"}</div>
                <div style={{
                  color: "#9ca3af", fontSize: 12,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>{acct.email}</div>
              </div>
              {acct.id === activeId ? (
                <span style={{
                  fontSize: 11, color: "#6366f1", fontWeight: 600,
                  padding: "2px 8px", borderRadius: 8,
                  background: "rgba(99,102,241,0.15)"
                }}>Active</span>
              ) : (
                <button onClick={(e) => handleRemove(e, acct.id)} style={{
                  background: "none", border: "none", color: "#666",
                  fontSize: 16, cursor: "pointer", padding: "2px 6px"
                }}>&times;</button>
              )}
            </div>
          ))}
        </div>

        <button onClick={onAddNew} style={{
          width: "100%", marginTop: 16, padding: "12px 0",
          background: "rgba(99,102,241,0.1)", border: "1px dashed rgba(99,102,241,0.4)",
          borderRadius: 12, color: "#6366f1", fontWeight: 600,
          fontSize: 14, cursor: "pointer", transition: "background 0.2s"
        }}>+ Add Another Account</button>
      </div>
    </div>
  );
}
