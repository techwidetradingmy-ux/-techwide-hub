import{useState}from"react";
import{getSavedAccounts,getActiveAccountId,removeAccount}from"../lib/accountManager";
import{supabase}from"../supabaseClient";
import{BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,SF}from"../constants";

/**
 * SettingsPage — full-screen settings overlay accessible from Profile tab.
 * Shows current user card, saved accounts (max 5), switch/add/remove account,
 * and sign out.
 *
 * Props:
 *   profile         – current user profile object
 *   onClose         – () => void, go back
 *   onSwitchAccount – (account) => void, called when switching to another account
 *   onAddAccount    – () => void, called when adding a new account
 */
export default function SettingsPage({profile,onClose,onSwitchAccount,onAddAccount}){
  const [removing,setRemoving]=useState(null);

  // Always read fresh from localStorage on each render
  const accounts=getSavedAccounts();
  const activeId=getActiveAccountId();

  const handleRemove=id=>{
    removeAccount(id);
    setRemoving(null);
  };

  const handleSignOut=()=>{
    supabase.auth.signOut();
  };

  const av=profile.avatar_url;

  return(
    <div style={{
      position:"fixed",inset:0,zIndex:100,
      background:BG,fontFamily:SF,
      maxWidth:430,margin:"0 auto",
      display:"flex",flexDirection:"column",
      overflowY:"auto",
    }}>
      {/* Header */}
      <div style={{
        background:"rgba(242,242,247,.97)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(0,0,0,.08)",
        padding:"14px 16px",
        display:"flex",alignItems:"center",gap:14,
        position:"sticky",top:0,zIndex:10,
        paddingTop:"max(14px, env(safe-area-inset-top))",
        flexShrink:0,
      }}>
        <button onClick={onClose} className="btn"
          style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ACC,padding:0,fontFamily:SF}}>
          ←
        </button>
        <div style={{fontSize:22,fontWeight:700,color:LBL,flex:1}}>⚙️ Settings</div>
      </div>

      <div style={{padding:"16px 16px 60px",flex:1}}>

        {/* Profile card */}
        <div style={{
          background:`linear-gradient(135deg,${ACC},#0e2140)`,
          borderRadius:20,padding:"20px",marginBottom:24,
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`${ORG}15`,pointerEvents:"none"}}/>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{
              width:64,height:64,borderRadius:"50%",
              background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:22,fontWeight:700,color:ACC,overflow:"hidden",flexShrink:0,
              border:"3px solid rgba(255,255,255,.2)",
            }}>
              {!av&&(profile.avatar||"?")}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.nickname||profile.name}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.6)",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.email}</div>
              {profile.is_admin&&<div style={{fontSize:12,color:ORG,fontWeight:700,marginTop:5,background:`${ORG}20`,borderRadius:99,padding:"2px 10px",display:"inline-block"}}>Admin</div>}
            </div>
          </div>
        </div>

        {/* Accounts section */}
        <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8,paddingLeft:4}}>
          Saved Accounts ({accounts.length}/5)
        </div>

        <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:12}}>
          {accounts.length===0&&(
            <div style={{padding:"20px 16px",fontSize:15,color:LB3,textAlign:"center"}}>
              No saved accounts yet.
            </div>
          )}
          {accounts.map((acct,i)=>{
            const isActive=acct.id===activeId;
            return(
              <div key={acct.id} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"14px 16px",
                borderBottom:i<accounts.length-1?`1px solid ${SEP}`:"none",
                background:isActive?ACC+"0D":"transparent",
              }}>
                {/* Avatar circle */}
                <div style={{
                  width:44,height:44,borderRadius:"50%",
                  background:isActive?`linear-gradient(145deg,${ORG},#ffb940)`:ACC,
                  color:isActive?ACC:"#fff",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:15,fontWeight:700,flexShrink:0,
                }}>
                  {acct.avatar||acct.name?.slice(0,2).toUpperCase()||"?"}
                </div>

                {/* Name + email */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:600,color:LBL,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {acct.name||"Unknown"}
                    {isActive&&<span style={{fontSize:11,color:ACC,fontWeight:700,marginLeft:8}}>ACTIVE</span>}
                  </div>
                  <div style={{fontSize:13,color:LB3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {acct.email}{acct.is_admin?" · Admin":""}
                  </div>
                </div>

                {/* Actions */}
                {!isActive&&(
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>onSwitchAccount(acct)} className="btn"
                      style={{background:ACC+"15",color:ACC,border:"none",borderRadius:10,padding:"7px 14px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                      Switch
                    </button>
                    <button onClick={()=>setRemoving(acct.id)}
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:LB3,padding:"4px 6px",flexShrink:0}}>
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Remove confirmation */}
        {removing&&(
          <div style={{background:"#ff3b3010",borderRadius:14,padding:"14px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,fontSize:14,color:"#ff3b30",fontWeight:500}}>Remove this account from the list?</div>
            <button onClick={()=>handleRemove(removing)} style={{background:"#ff3b30",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Remove</button>
            <button onClick={()=>setRemoving(null)} style={{background:BG2,color:LBL,border:"none",borderRadius:8,padding:"7px 14px",fontSize:14,fontWeight:500,cursor:"pointer"}}>Cancel</button>
          </div>
        )}

        {/* Add account (only if under 5) */}
        {accounts.length<5?(
          <button onClick={onAddAccount} className="btn"
            style={{
              width:"100%",padding:"15px",background:BG2,
              border:`1.5px dashed ${SEP}`,borderRadius:14,
              fontSize:16,fontWeight:600,color:ACC,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              marginBottom:24,fontFamily:SF,
            }}>
            + Add Another Account
          </button>
        ):(
          <div style={{background:`${ORG}10`,borderRadius:12,padding:"12px 14px",marginBottom:24,fontSize:14,color:ORG,lineHeight:1.6}}>
            ℹ️ Maximum 5 accounts reached. Remove one to add another.
          </div>
        )}

        {/* Divider */}
        <div style={{height:1,background:SEP,marginBottom:16}}/>

        {/* Sign Out */}
        <button onClick={handleSignOut} className="btn"
          style={{
            width:"100%",padding:"16px",background:"#ff3b3010",
            border:"none",borderRadius:14,
            fontSize:17,fontWeight:700,color:"#ff3b30",
            cursor:"pointer",fontFamily:SF,
          }}>
          Sign Out
        </button>

        <div style={{textAlign:"center",fontSize:12,color:LB3,marginTop:20,lineHeight:1.6}}>
          Techwide Hub · Account Settings<br/>
          You can stay logged in across up to 5 accounts.
        </div>
      </div>
    </div>
  );
}
