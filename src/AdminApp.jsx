function StaffTab(){
  const [view,setView]=useState("list");
  const [selected,setSelected]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [confirmReset,setConfirmReset]=useState(null);
  const [actionLoading,setActionLoading]=useState(false);

  const handleReset=async user=>{
    setActionLoading(true);
    // Reset onboarding — clears profile data
    await supabase.from("profiles").update({
      onboarded:false,name:"",nickname:"",bio:"",hobby:"",favorite_food:"",
      birthday:null,joined_date:null,contact_number:"",avatar_url:"",banner_url:"",
      ic_number:"",epf_number:"",bank_account:"",bank_type:"",
      ic_verified:false,epf_verified:false,bank_verified:false,
      xp:0,streak:0,last_checkin:null,contribution_score:0,badges:[]
    }).eq("id",user.id);
    // Delete old verification requests
    await supabase.from("verification_requests").delete().eq("user_id",user.id);
    // Delete old messages
    await supabase.from("messages").delete().eq("user_id",user.id);
    await loadAll();
    setConfirmReset(null);
    setSelected(null);
    setActionLoading(false);
    showToast("✅ User reset — they'll go through onboarding again");
  };

  const handleDelete=async user=>{
    setActionLoading(true);
    // Delete all related data first
    await supabase.from("mission_claims").delete().eq("user_id",user.id);
    await supabase.from("mission_submissions").delete().eq("user_id",user.id);
    await supabase.from("redemptions").delete().eq("user_id",user.id);
    await supabase.from("verification_requests").delete().eq("user_id",user.id);
    await supabase.from("messages").delete().eq("user_id",user.id);
    await supabase.from("profiles").delete().eq("id",user.id);
    // Delete from auth (requires service role — will fail silently if not set up)
    await supabase.auth.admin?.deleteUser(user.id);
    await loadAll();
    setConfirmDelete(null);
    setSelected(null);
    setActionLoading(false);
    showToast("🗑️ User deleted successfully");
  };

  return(
    <div style={{padding:"0 16px 12px"}}>

      {/* Confirm Reset Modal */}
      {confirmReset&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:BG2,borderRadius:20,padding:28,width:"100%",maxWidth:340,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🔄</div>
            <div style={{fontSize:18,fontWeight:700,color:LBL,marginBottom:8}}>Reset Onboarding?</div>
            <div style={{fontSize:15,color:LB3,lineHeight:1.6,marginBottom:24}}>
              This will clear <strong>{confirmReset.name||confirmReset.email}</strong>'s profile data and send them through onboarding again. Their points will also reset.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmReset(null)} style={{flex:1,padding:"13px",background:"rgba(0,0,0,.06)",border:"none",borderRadius:12,fontSize:16,color:LBL,cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>handleReset(confirmReset)} disabled={actionLoading}
                style={{flex:1,padding:"13px",background:"#ff9500",border:"none",borderRadius:12,fontSize:16,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {actionLoading&&<div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {actionLoading?"Resetting…":"Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:BG2,borderRadius:20,padding:28,width:"100%",maxWidth:340,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
            <div style={{fontSize:18,fontWeight:700,color:"#ff3b30",marginBottom:8}}>Delete User?</div>
            <div style={{fontSize:15,color:LB3,lineHeight:1.6,marginBottom:24}}>
              This will permanently delete <strong>{confirmDelete.name||confirmDelete.email}</strong> and all their data. This cannot be undone.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,padding:"13px",background:"rgba(0,0,0,.06)",border:"none",borderRadius:12,fontSize:16,color:LBL,cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>handleDelete(confirmDelete)} disabled={actionLoading}
                style={{flex:1,padding:"13px",background:"#ff3b30",border:"none",borderRadius:12,fontSize:16,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {actionLoading&&<div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {actionLoading?"Deleting…":"Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fade" style={{display:"flex",gap:8,marginBottom:14}}>
        {[["list","Staff List"],["private","Private Info"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"10px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:view===id?600:400,cursor:"pointer",fontFamily:SF}}>{label}</button>
        ))}
      </div>

      {/* Staff detail modal */}
      {selected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:BG,borderRadius:"20px 20px 0 0",padding:"20px 16px 40px",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:LBL}}>{selected.name||"New User"}</div>
              <button onClick={()=>setSelected(null)} style={{background:"rgba(0,0,0,.07)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:16}}>✕</button>
            </div>

            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:selected.avatar_url?`url(${selected.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>{!selected.avatar_url&&(selected.avatar||"?")}</div>
              <div>
                <div style={{fontSize:17,color:LBL,fontWeight:500}}>{selected.name||"Incomplete Profile"}</div>
                {selected.nickname&&<div style={{fontSize:14,color:LB3}}>"{selected.nickname}"</div>}
                <div style={{fontSize:14,color:LB3}}>{selected.role}</div>
                <div style={{fontSize:13,color:ACC,fontWeight:600}}>{(selected.xp||0).toLocaleString()} pts · {selected.streak||0}🔥</div>
              </div>
            </div>

            {/* Info */}
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:14}}>
              {[
                ["📧 Email",   selected.email||"N/A"],
                ["📱 Contact", selected.contact_number?formatContact(selected.contact_number):"N/A"],
                ["🎂 Birthday",selected.birthday?new Date(selected.birthday).toLocaleDateString("en-MY",{day:"numeric",month:"long",year:"numeric"}):"N/A"],
                ["📅 Joined",  selected.joined_date?new Date(selected.joined_date).toLocaleDateString("en-MY",{day:"numeric",month:"long",year:"numeric"}):"N/A"],
                ["🎮 Hobby",   selected.hobby||"N/A"],
                ["🍜 Fav Food",selected.favorite_food||"N/A"],
                ["✅ Onboarded",selected.onboarded?"Yes":"Pending onboarding"],
              ].map(([label,value],i,a)=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:14,color:LB3}}>{label}</div>
                  <div style={{fontSize:14,color:LBL,textAlign:"right",maxWidth:"60%"}}>{value}</div>
                </div>
              ))}
            </div>

            {/* Admin Actions */}
            <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Admin Actions</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{setConfirmReset(selected);}}
                style={{width:"100%",padding:"14px",background:"#ff950015",color:"#ff9500",border:"1px solid #ff950030",borderRadius:12,fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                🔄 Reset & Redo Onboarding
              </button>
              <button onClick={()=>{setConfirmDelete(selected);}}
                style={{width:"100%",padding:"14px",background:"#ff3b3015",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:12,fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                🗑️ Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {view==="list"&&(
        <>
          <SHead t={`All Staff (${allProfiles.length})`}/>
          <Section>
            {allProfiles.map((s,i)=>{
              const sTier=getTier(calcScore(s.joined_date,0));
              return(
                <div key={s.id} onClick={()=>setSelected(s)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none",cursor:"pointer"}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0,overflow:"hidden"}}>{!s.avatar_url&&(s.avatar||"?")}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{fontSize:16,color:LBL,fontWeight:500}}>{s.name||"Incomplete Profile"}</div>
                      <span style={{fontSize:13}}>{sTier.emoji}</span>
                      {!s.onboarded&&<span style={{fontSize:10,color:"#ff9500",background:"#ff950018",padding:"1px 6px",borderRadius:99,fontWeight:600}}>Setup Pending</span>}
                    </div>
                    <div style={{fontSize:13,color:LB3}}>{s.role} · {s.last_checkin===today?"✓ In":"— Out"}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                    <div style={{fontSize:10,color:LB3}}>pts ›</div>
                  </div>
                </div>
              );
            })}
          </Section>
        </>
      )}

      {view==="private"&&(
        <>
          <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC,lineHeight:1.6}}>🔒 Strictly confidential. Only visible to admin.</div>
          {allProfiles.map(s=>(
            <div key={s.id} style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${SEP}`}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",overflow:"hidden"}}>{!s.avatar_url&&(s.avatar||"?")}</div>
                <div>
                  <div style={{fontSize:16,color:LBL,fontWeight:500}}>{s.name||"Incomplete Profile"}</div>
                  <div style={{fontSize:13,color:LB3}}>{s.role}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["IC",s.ic_number,s.ic_verified],["EPF",s.epf_number,s.epf_verified],["Bank",s.bank_account,s.bank_verified],["Bank Type",s.bank_type,null],["Contact",s.contact_number?formatContact(s.contact_number):null,null],["Birthday",s.birthday?new Date(s.birthday).toLocaleDateString("en-MY",{day:"numeric",month:"short"}):null,null]].map(([label,val,verified])=>(
                  <div key={label}>
                    <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:2}}>
                      <div style={{fontSize:11,color:LB3}}>{label}</div>
                      {verified!==null&&<span style={{fontSize:9,color:verified?"#34c759":"#ff9500",fontWeight:700}}>{verified?"✓":"?"}</span>}
                    </div>
                    <div style={{fontSize:13,color:val?LBL:LB3}}>{val||"N/A"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
