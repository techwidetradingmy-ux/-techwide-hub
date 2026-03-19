import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore,formatContact}from"./constants";

// ── GIFT POINTS ───────────────────────────────────────────────────────
function GiftPointsTab({allProfiles,onGift}){
  const [toId,setToId]=useState("");
  const [points,setPoints]=useState(100);
  const [reason,setReason]=useState("");
  const [sending,setSending]=useState(false);
  const send=async()=>{
    if(!toId||!points||!reason.trim())return;
    setSending(true);
    await onGift(toId,+points,reason);
    setToId("");setPoints(100);setReason("");setSending(false);
  };
  return(
    <div>
      <div style={{background:`${ORG}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ORG,lineHeight:1.7,fontWeight:500}}>
        🎁 Gift points to any staff member. An announcement will be auto-posted and the recipient will be notified instantly.
      </div>
      <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Select Staff Member</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto"}}>
            {allProfiles.map(p=>(
              <button key={p.id} onClick={()=>setToId(p.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",background:toId===p.id?`${ACC}14`:"rgba(0,0,0,.04)",border:toId===p.id?`1.5px solid ${ACC}`:"1.5px solid transparent",borderRadius:10,cursor:"pointer",fontFamily:SF,textAlign:"left"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:p.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
                  {!p.avatar_url&&(p.avatar||"?")}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,color:LBL,fontWeight:toId===p.id?600:400}}>{p.name}</div>
                  <div style={{fontSize:12,color:LB3}}>{p.role} · {(p.xp||0).toLocaleString()} pts</div>
                </div>
                {toId===p.id&&<span style={{color:ACC,fontSize:16,fontWeight:700}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Points to Gift</div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {[50,100,200,500].map(p=>(
              <button key={p} onClick={()=>setPoints(p)}
                style={{flex:1,padding:"9px",background:points===p?ACC:"rgba(0,0,0,.06)",color:points===p?"#fff":LB2,border:"none",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                {p}
              </button>
            ))}
          </div>
          <input value={points} onChange={e=>setPoints(e.target.value)} placeholder="Custom amount" type="number"
            style={{width:"100%",background:"rgba(0,0,0,.04)",border:"none",outline:"none",fontSize:16,color:LBL,fontFamily:SF,borderRadius:9,padding:"10px 12px"}}/>
        </div>
        <div style={{padding:"11px 16px"}}>
          <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Reason for Gift</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)}
            placeholder="e.g. Outstanding performance! Happy Birthday! Thank you…"
            rows={3} style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:16,color:LBL,resize:"none",lineHeight:1.5,fontFamily:SF}}/>
        </div>
      </div>
      <button onClick={send} disabled={!toId||!points||!reason.trim()||sending}
        style={{width:"100%",background:(!toId||!points||!reason.trim()||sending)?"#e5e5ea":ORG,color:(!toId||!points||!reason.trim()||sending)?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {sending&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
        {sending?"Sending Gift…":`🎁 Gift ${points} pts`}
      </button>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
function DashTab({allProfiles,submissions,totalPending,pendingVerif,today,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF,getTier,calcScore}){
  const checkedIn=allProfiles.filter(p=>p.last_checkin===today).length;
  const Avatar=({p,size=42})=>(
    <div style={{width:size,height:size,borderRadius:"50%",background:p?.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.3,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {!p?.avatar_url&&(p?.avatar||"?")}
    </div>
  );
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        {[
          {l:"Total Staff",    v:allProfiles.length,           i:"👥",c:ACC},
          {l:"Checked In",     v:`${checkedIn}/${allProfiles.length}`,i:"✅",c:"#34c759"},
          {l:"Pending Actions",v:totalPending,                 i:"⚠️",c:"#ff9500"},
          {l:"Verifications",  v:pendingVerif,                 i:"🔒",c:"#ff3b30"},
        ].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:13,padding:"16px"}}>
            <div style={{fontSize:24,marginBottom:8}}>{s.i}</div>
            <div style={{fontSize:28,fontWeight:700,color:s.c,letterSpacing:"-1px",lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:13,color:LB3,marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>🏆 Top Performers</div>
      <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
        {allProfiles.slice(0,5).map((s,i)=>{
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<4?`1px solid ${SEP}`:"none"}}>
              <div style={{fontWeight:700,fontSize:i<3?18:14,color:i<3?ORG:"#8e8e93",width:26,textAlign:"center",flexShrink:0}}>{["🥇","🥈","🥉"][i]||`#${i+1}`}</div>
              <Avatar p={s} size={38}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{fontSize:15,color:LBL,fontWeight:500}}>{s.nickname||s.name}</div>
                  <span style={{fontSize:12}}>{sTier.emoji}</span>
                </div>
                <div style={{fontSize:12,color:LB3}}>{s.role}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                <div style={{fontSize:10,color:LB3}}>pts</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>📅 Today's Attendance</div>
      <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
        {allProfiles.map((s,i)=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:s.last_checkin===today?"#34c759":"#e5e5ea",flexShrink:0}}/>
            <Avatar p={s} size={32}/>
            <div style={{flex:1}}>
              <div style={{fontSize:15,color:LBL}}>{s.name}</div>
              <div style={{fontSize:12,color:LB3}}>{s.role}</div>
            </div>
            <div style={{fontSize:13,color:s.last_checkin===today?"#34c759":"#ff3b30",fontWeight:500}}>{s.last_checkin===today?"✓ Present":"Absent"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STAFF ─────────────────────────────────────────────────────────────
function StaffTab({allProfiles,today,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF,getTier,calcScore,formatContact}){
  const [view,setView]=useState("list");
  const [selected,setSelected]=useState(null);
  const fmtDate=iso=>{if(!iso)return"N/A";const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
  const Avatar=({p,size=42})=>(
    <div style={{width:size,height:size,borderRadius:"50%",background:p?.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.3,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {!p?.avatar_url&&(p?.avatar||"?")}
    </div>
  );
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"flex",gap:8,marginBottom:14}}>
        {[["list","Staff List"],["private","Private Info"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)}
            style={{flex:1,padding:"10px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:view===id?600:400,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>
      {selected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:BG,borderRadius:"20px 20px 0 0",padding:"20px 16px 40px",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:LBL}}>{selected.name}</div>
              <button onClick={()=>setSelected(null)} style={{background:"rgba(0,0,0,.07)",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,fontFamily:SF}}>✕</button>
            </div>
            <div style={{height:80,background:selected.banner_url?`url(${selected.banner_url}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:12,marginBottom:-28}}/>
            <div style={{display:"flex",alignItems:"flex-end",gap:12,marginBottom:16,paddingTop:4}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:selected.avatar_url?`url(${selected.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,border:`3px solid ${BG}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,color:ACC,overflow:"hidden",flexShrink:0}}>
                {!selected.avatar_url&&(selected.avatar||"?")}
              </div>
              <div style={{paddingBottom:4}}>
                <div style={{fontSize:16,color:LBL,fontWeight:600}}>{selected.name}</div>
                <div style={{fontSize:13,color:ACC,fontWeight:600}}>{(selected.xp||0).toLocaleString()} pts · 🔥{selected.streak||0}</div>
              </div>
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:10}}>
              {[["💼 Role",selected.role],["📧 Email",selected.email],["📱 Contact",selected.contact_number?formatContact(selected.contact_number):null],["🎂 Birthday",selected.birthday_verified?fmtDate(selected.birthday):null],["📅 Joined",selected.joined_date_verified?fmtDate(selected.joined_date):null],["⚧ Gender",selected.gender],["🏠 Hometown",selected.hometown],["🎮 Hobby",selected.hobby],["🍜 Fav Food",selected.favorite_food]].filter(([,v])=>v).map(([label,value],i,a)=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:14,color:LB3}}>{label}</div>
                  <div style={{fontSize:14,color:LBL,textAlign:"right",maxWidth:"60%"}}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:12,color:ACC,fontWeight:700,marginBottom:10}}>🔒 PRIVATE (Admin Only)</div>
              {[["IC Number",selected.ic_number,selected.ic_verified],["EPF Number",selected.epf_number,selected.epf_verified],["Bank Account",selected.bank_account,selected.bank_verified],["Bank Type",selected.bank_type,null]].map(([label,value,verified])=>(
                <div key={label} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div style={{fontSize:12,color:LB3}}>{label}</div>
                    {verified!==null&&<span style={{fontSize:10,color:verified?"#34c759":"#ff9500",fontWeight:600,background:(verified?"#34c759":"#ff9500")+"18",padding:"1px 6px",borderRadius:99}}>{verified?"✓ Verified":"⏳ Pending"}</span>}
                  </div>
                  <div style={{fontSize:14,color:value?LBL:LB3,marginTop:2}}>{value||"Not provided"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {view==="list"&&(
        <>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>All Staff ({allProfiles.length})</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {allProfiles.map((s,i)=>{
              const sTier=getTier(calcScore(s.joined_date,0));
              return(
                <div key={s.id} onClick={()=>setSelected(s)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none",cursor:"pointer",background:BG2}}>
                  <Avatar p={s} size={44}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{fontSize:16,color:LBL,fontWeight:500}}>{s.name}</div>
                      <span>{sTier.emoji}</span>
                    </div>
                    <div style={{fontSize:13,color:LB3}}>{s.role}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                    <div style={{fontSize:11,color:s.last_checkin===today?"#34c759":"#ff3b30",marginTop:2}}>{s.last_checkin===today?"✓ In":"— Out"}</div>
                  </div>
                  <div style={{color:LB3,fontSize:18}}>›</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {view==="private"&&(
        <>
          <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC}}>🔒 Strictly confidential.</div>
          {allProfiles.map(s=>(
            <div key={s.id} style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${SEP}`}}>
                <Avatar p={s} size={36}/>
                <div><div style={{fontSize:16,color:LBL,fontWeight:500}}>{s.name}</div><div style={{fontSize:13,color:LB3}}>{s.role}</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["IC",s.ic_number,s.ic_verified],["EPF",s.epf_number,s.epf_verified],["Bank",s.bank_account,s.bank_verified],["Bank Type",s.bank_type,null],["Contact",s.contact_number?formatContact(s.contact_number):null,null],["Birthday",s.birthday_verified?fmtDate(s.birthday):null,null]].map(([label,val,verified])=>(
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

// ── APPROVALS ─────────────────────────────────────────────────────────
function ApprovalsTab({submissions,redemptions,verifReqs,onApproveSubmission,onApproveRedemption,onApproveVerification,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF}){
  const [sec,setSec]=useState("missions");
  const pending=submissions.filter(s=>s.status==="Pending");
  const reviewed=submissions.filter(s=>s.status!=="Pending");
  const pendReds=redemptions.filter(r=>r.status==="Pending");
  const doneReds=redemptions.filter(r=>r.status!=="Pending");
  const pendVerif=verifReqs.filter(v=>v.status==="Pending");
  const doneVerif=verifReqs.filter(v=>v.status!=="Pending");
  const StatusBadge=({status})=>{
    const c=status==="Pending"?"#ff9500":status==="Approved"?"#34c759":"#ff3b30";
    return<div style={{background:c+"18",color:c,fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99,flexShrink:0,whiteSpace:"nowrap"}}>{status}</div>;
  };
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {[["missions","Submissions",pending.length],["redemptions","Redemptions",pendReds.length],["verif","Verifications",pendVerif.length]].map(([id,label,count])=>(
          <button key={id} onClick={()=>setSec(id)}
            style={{flexShrink:0,padding:"9px 14px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF,position:"relative"}}>
            {label}{count>0&&<span style={{marginLeft:5,background:sec===id?"rgba(255,255,255,.3)":ORG,color:"#fff",fontSize:10,padding:"1px 5px",borderRadius:99,fontWeight:700}}>{count}</span>}
          </button>
        ))}
      </div>
      {sec==="missions"&&(
        <>
          {pending.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:LB3,fontSize:15}}>All clear! 🎉</div>}
          {pending.map(sub=>(
            <div key={sub.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,marginRight:10}}>
                  <div style={{fontSize:13,color:LB3,marginBottom:3}}>{sub.profiles?.name}</div>
                  <div style={{fontSize:17,color:LBL,fontWeight:500}}>{sub.missions?.title}</div>
                </div>
                <div style={{background:`${ACC}14`,borderRadius:9,padding:"5px 10px",textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:700,color:ACC}}>+{sub.missions?.xp||100}</div>
                  <div style={{fontSize:10,color:LB3}}>pts</div>
                </div>
              </div>
              {sub.submission_text&&<div style={{background:"#f2f2f7",borderRadius:10,padding:"10px 12px",fontSize:14,color:LB2,lineHeight:1.55,marginBottom:10,whiteSpace:"pre-wrap"}}>{sub.submission_text}</div>}
              {sub.submission_image&&<img src={sub.submission_image} alt="proof" style={{width:"100%",borderRadius:10,marginBottom:10,maxHeight:220,objectFit:"cover"}}/>}
              <div style={{fontSize:11,color:LB3,marginBottom:12}}>{new Date(sub.submitted_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onApproveSubmission(sub,false)} style={{flex:1,padding:"11px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Reject</button>
                <button onClick={()=>onApproveSubmission(sub,true)} style={{flex:2,padding:"11px",background:"#34c759",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Approve ✓</button>
              </div>
            </div>
          ))}
          {reviewed.length>0&&(
            <>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>Previously Reviewed</div>
              <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
                {reviewed.slice(0,8).map((s,i,a)=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:15,color:LBL}}>{s.profiles?.name}</div><div style={{fontSize:12,color:LB3}}>{s.missions?.title}</div></div>
                    <StatusBadge status={s.status}/>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {sec==="redemptions"&&(
        <>
          {pendReds.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:LB3,fontSize:15}}>No pending redemptions 🎉</div>}
          {pendReds.map(r=>(
            <div key={r.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div><div style={{fontSize:13,color:LB3,marginBottom:3}}>{r.profiles?.name}</div><div style={{fontSize:17,color:LBL,fontWeight:500}}>{r.prize_name}</div></div>
                <StatusBadge status={r.status}/>
              </div>
              <div style={{fontSize:12,color:LB3,marginBottom:12}}>{new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short"})}</div>
              <button onClick={()=>onApproveRedemption(r.id)} style={{width:"100%",padding:"11px",background:ACC,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Mark Delivered ✓</button>
            </div>
          ))}
          {doneReds.length>0&&(
            <>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>Delivered</div>
              <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
                {doneReds.slice(0,8).map((r,i,a)=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:15,color:LBL}}>{r.profiles?.name}</div><div style={{fontSize:12,color:LB3}}>{r.prize_name}</div></div>
                    <StatusBadge status={r.status}/>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {sec==="verif"&&(
        <>
          {pendVerif.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:LB3,fontSize:15}}>No pending verifications 🎉</div>}
          {pendVerif.map(req=>(
            <div key={req.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,color:LB3,marginBottom:3}}>{req.profiles?.name} · {req.profiles?.role}</div>
                  <div style={{fontSize:16,color:LBL,fontWeight:500}}>
                    {req.field_name==="ic_number"?"IC Number":req.field_name==="epf_number"?"EPF Number":req.field_name==="bank_account"?"Bank Account":req.field_name==="position"?"Position":req.field_name==="joined_date"?"Joining Date":req.field_name==="birthday"?"Birthday":"Information"}
                  </div>
                </div>
                <div style={{background:"#ff950018",color:"#ff9500",fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99}}>Pending</div>
              </div>
              <div style={{background:"#f2f2f7",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <div style={{fontSize:15,color:LBL,fontWeight:500}}>{req.field_value}</div>
                {req.extra_value&&<div style={{fontSize:13,color:LB3,marginTop:2}}>{req.extra_value}</div>}
              </div>
              <div style={{fontSize:11,color:LB3,marginBottom:12}}>{new Date(req.submitted_at).toLocaleDateString("en-MY",{day:"numeric",month:"short"})}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onApproveVerification(req,false)} style={{flex:1,padding:"11px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Reject</button>
                <button onClick={()=>onApproveVerification(req,true)} style={{flex:2,padding:"11px",background:"#34c759",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Verify ✓</button>
              </div>
            </div>
          ))}
          {doneVerif.length>0&&(
            <>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>Previously Reviewed</div>
              <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
                {doneVerif.slice(0,8).map((v,i,a)=>(
                  <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:15,color:LBL}}>{v.profiles?.name}</div><div style={{fontSize:12,color:LB3}}>{v.field_name.replace(/_/g," ")}</div></div>
                    <div style={{background:v.status==="Approved"?"#34c75918":"#ff3b3018",color:v.status==="Approved"?"#34c759":"#ff3b30",fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99}}>{v.status}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── CONTENT ───────────────────────────────────────────────────────────
function ContentTab({missions,announcements,prizes,allProfiles,onAddMission,onDeleteMission,onAddAnn,onDeleteAnn,onTogglePin,onAddPrize,onGift,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF}){
  const [sec,setSec]=useState("missions");
  const [mForm,setMForm]=useState({title:"",description:"",xp:150,category:"Sales",difficulty:"Medium",period:"Daily",due_date:""});
  const [aForm,setAForm]=useState({title:"",body:"",pinned:false});
  const [pForm,setPForm]=useState({name:"",cost:500,stock:10,icon:"🎁",category:"Cash",desc:""});

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {[["missions","Missions"],["announcements","Announcements"],["prizes","Prizes"],["gifts","🎁 Gift Points"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSec(id)}
            style={{flexShrink:0,padding:"8px 14px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      {sec==="missions"&&(
        <>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>➕ Add Campaign Mission</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Title</div>
              <input value={mForm.title} onChange={e=>setMForm(p=>({...p,title:e.target.value}))} placeholder="Mission title"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Description</div>
              <textarea value={mForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="What needs to be done" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF}}/>
            </div>
            {/* Due Date */}
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Due Date <span style={{color:"#ff3b30"}}>*</span></div>
              <input value={mForm.due_date} onChange={e=>setMForm(p=>({...p,due_date:e.target.value}))} type="date"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`,borderRight:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Points</div>
                <input value={mForm.xp} onChange={e=>setMForm(p=>({...p,xp:e.target.value}))} placeholder="150" type="number"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
              </div>
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Category</div>
                <input value={mForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))} placeholder="Sales"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{padding:"11px 16px",borderRight:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Difficulty</div>
                <input value={mForm.difficulty} onChange={e=>setMForm(p=>({...p,difficulty:e.target.value}))} placeholder="Easy/Medium/Hard"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
              </div>
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Period</div>
                <input value={mForm.period} onChange={e=>setMForm(p=>({...p,period:e.target.value}))} placeholder="Daily/Weekly"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
              </div>
            </div>
          </div>
          <button onClick={()=>{if(mForm.title.trim()&&mForm.due_date){onAddMission(mForm);setMForm({title:"",description:"",xp:150,category:"Sales",difficulty:"Medium",period:"Daily",due_date:""});}}}
            style={{width:"100%",background:ACC,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,marginBottom:16}}>
            Post Campaign Mission
          </button>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>Active Missions</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {missions.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No missions yet</div>}
            {missions.map((m,i)=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<missions.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,color:LBL,fontWeight:500}}>{m.title}</div>
                  <div style={{fontSize:12,color:LB3}}>{m.category} · {m.difficulty} · {m.xp} pts{m.due_date?` · Due ${m.due_date}`:""}</div>
                </div>
                <button onClick={()=>onDeleteMission(m.id)} style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF}}>Remove</button>
              </div>
            ))}
          </div>
        </>
      )}

      {sec==="announcements"&&(
        <>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>📢 Post Announcement</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Title</div>
              <input value={aForm.title} onChange={e=>setAForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Body</div>
              <textarea value={aForm.body} onChange={e=>setAForm(p=>({...p,body:e.target.value}))} placeholder="Write your announcement…" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:17,color:LBL}}>Pin to top</div>
                <div onClick={()=>setAForm(p=>({...p,pinned:!p.pinned}))}
                  style={{width:50,height:30,borderRadius:99,background:aForm.pinned?ACC:"#e5e5ea",position:"relative",cursor:"pointer",transition:"background .2s"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:aForm.pinned?22:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
                </div>
              </div>
            </div>
          </div>
          <button onClick={()=>{if(aForm.title.trim()){onAddAnn(aForm);setAForm({title:"",body:"",pinned:false});}}}
            style={{width:"100%",background:ACC,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,marginBottom:16}}>
            Post Announcement
          </button>
          {announcements.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:LB3}}>No announcements yet</div>}
          {announcements.map(a=>(
            <div key={a.id} style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:a.pinned?`3px solid ${ORG}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{flex:1,marginRight:10}}>
                  {a.pinned&&<div style={{fontSize:11,color:ORG,fontWeight:700,marginBottom:4}}>📌 Pinned</div>}
                  <div style={{fontSize:16,color:LBL,fontWeight:500}}>{a.title}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>onTogglePin(a)} style={{background:`${ORG}18`,color:ORG,border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF}}>{a.pinned?"Unpin":"Pin"}</button>
                  <button onClick={()=>onDeleteAnn(a.id)} style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF}}>Delete</button>
                </div>
              </div>
              {a.body&&<div style={{fontSize:14,color:LB3,lineHeight:1.5}}>{a.body}</div>}
            </div>
          ))}
        </>
      )}

      {sec==="prizes"&&(
        <>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>🎁 Add Prize</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Prize Name</div>
              <input value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Bubble Tea Voucher"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Description</div>
              <input value={pForm.desc} onChange={e=>setPForm(p=>({...p,desc:e.target.value}))} placeholder="Short description"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
              {[{label:"Pts",k:"cost",type:"number"},{label:"Stock",k:"stock",type:"number"},{label:"Icon",k:"icon"}].map(({label,k,type="text"},i,a)=>(
                <div key={k} style={{padding:"11px 16px",borderRight:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>
                  <input value={pForm[k]} onChange={e=>setPForm(p=>({...p,[k]:e.target.value}))} type={type}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                </div>
              ))}
            </div>
          </div>
          <button onClick={()=>{if(pForm.name.trim()){onAddPrize(pForm);setPForm({name:"",cost:500,stock:10,icon:"🎁",category:"Cash",desc:""});}}}
            style={{width:"100%",background:ACC,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,marginBottom:16}}>
            Add Prize
          </button>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>Active Prizes</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {prizes.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No prizes yet</div>}
            {prizes.map((p,i)=>(
              <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<prizes.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:26}}>{p.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:15,color:LBL,fontWeight:500}}>{p.name}</div><div style={{fontSize:12,color:LB3}}>{p.stock??0} left · {(p.pts||p.cost)?.toLocaleString()} pts</div></div>
              </div>
            ))}
          </div>
        </>
      )}

      {sec==="gifts"&&<GiftPointsTab allProfiles={allProfiles} onGift={onGift}/>}
    </div>
  );
}

// ── COMMUNITY ─────────────────────────────────────────────────────────
function CommunityTab({profile,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF}){
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{
    loadMsgs();
    const iv=setInterval(loadMsgs,4000);
    return()=>clearInterval(iv);
  },[]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const loadMsgs=async()=>{
    const{data}=await supabase.from("messages").select("*").eq("is_dm",false).order("created_at",{ascending:true}).limit(100);
    if(data)setMessages(data);
  };
  const send=async()=>{
    if(!text.trim()||sending)return;
    setSending(true);
    await supabase.from("messages").insert({user_id:profile.id,sender_name:profile.nickname||profile.name,sender_avatar:profile.avatar||"AD",sender_avatar_url:profile.avatar_url||"",content:text.trim(),is_dm:false});
    setText("");await loadMsgs();setSending(false);
  };
  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 170px)"}}>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No messages yet 👋</div>}
        {messages.map(msg=>{
          const me=msg.user_id===profile.id;
          if(msg.is_system)return(
            <div key={msg.id} style={{textAlign:"center"}}>
              <div style={{display:"inline-block",background:`${ACC}10`,borderRadius:12,padding:"8px 14px",fontSize:13,color:ACC,lineHeight:1.55,maxWidth:"88%",whiteSpace:"pre-line"}}>{msg.content}</div>
            </div>
          );
          return(
            <div key={msg.id} style={{display:"flex",flexDirection:me?"row-reverse":"row",alignItems:"flex-end",gap:8}}>
              {!me&&(
                <div style={{width:32,height:32,borderRadius:"50%",background:msg.sender_avatar_url?`url(${msg.sender_avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden"}}>
                  {!msg.sender_avatar_url&&(msg.sender_avatar||"?")}
                </div>
              )}
              <div style={{maxWidth:"72%"}}>
                {!me&&<div style={{fontSize:11,color:LB3,marginBottom:3,paddingLeft:4}}>{msg.sender_name}</div>}
                <div style={{background:me?ACC:BG2,borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <div style={{fontSize:15,color:me?"#fff":LBL,lineHeight:1.45,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                </div>
                <div style={{fontSize:10,color:LB3,marginTop:3,textAlign:me?"right":"left"}}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"8px 16px",background:BG2,borderTop:`1px solid ${SEP}`,display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Message the team…"
          style={{flex:1,background:"#f2f2f7",border:"none",outline:"none",borderRadius:22,padding:"10px 16px",fontSize:16,color:LBL,fontFamily:SF}}/>
        <button onClick={send} disabled={!text.trim()||sending}
          style={{width:40,height:40,borderRadius:"50%",background:text.trim()?ACC:"#e5e5ea",border:"none",cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",flexShrink:0}}>
          {sending?"…":"▶"}
        </button>
      </div>
    </div>
  );
}

// ── MAIN ADMIN APP ────────────────────────────────────────────────────
export default function AdminApp({profile,onProfileUpdate}){
  const [tab,setTab]=useState("dash");
  const [allProfiles,setAllProfiles]=useState([]);
  const [missions,setMissions]=useState([]);
  const [submissions,setSubmissions]=useState([]);
  const [prizes,setPrizes]=useState([]);
  const [announcements,setAnnouncements]=useState([]);
  const [redemptions,setRedemptions]=useState([]);
  const [verifReqs,setVerifReqs]=useState([]);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    loadAll();
    // Realtime subscriptions
    const ch=supabase.channel("admin_realtime")
      .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"mission_submissions"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"redemptions"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"verification_requests"},()=>loadAll())
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  const loadAll=async()=>{
    const[pr,mi,su,pz,an,re,vr]=await Promise.all([
      supabase.from("profiles").select("*").order("xp",{ascending:false}),
      supabase.from("missions").select("*").eq("active",true),
      supabase.from("mission_submissions").select("*, profiles(name,avatar,avatar_url), missions(title,xp)").order("submitted_at",{ascending:false}),
      supabase.from("prizes").select("*").eq("active",true),
      supabase.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}),
      supabase.from("redemptions").select("*, profiles(name)").order("redeemed_at",{ascending:false}),
      supabase.from("verification_requests").select("*, profiles(name,role)").order("submitted_at",{ascending:false}),
    ]);
    if(pr.data)setAllProfiles(pr.data);
    if(mi.data)setMissions(mi.data);
    if(su.data)setSubmissions(su.data);
    if(pz.data)setPrizes(pz.data.length>0?pz.data:PRIZES.map(x=>({...x,cost:x.pts,category:x.cat})));
    if(an.data)setAnnouncements(an.data);
    if(re.data)setRedemptions(re.data);
    if(vr.data)setVerifReqs(vr.data);
  };

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2800);};

  const today=new Date().toISOString().split("T")[0];
  const pendingSubs=submissions.filter(s=>s.status==="Pending").length;
  const pendingReds=redemptions.filter(r=>r.status==="Pending").length;
  const pendingVerifCount=verifReqs.filter(v=>v.status==="Pending").length;
  const totalPending=pendingSubs+pendingReds+pendingVerifCount;

  // ── Notify all users ──
  const notifyAll=async(title,body,type="info")=>{
    const{data:profiles}=await supabase.from("profiles").select("id").eq("is_admin",false);
    if(!profiles)return;
    await supabase.from("notifications").insert(profiles.map(p=>({user_id:p.id,title,body,type})));
  };

  // ── Actions ──
  const approveSubmission=async(sub,approve)=>{
    const status=approve?"Approved":"Rejected";
    setSubmissions(p=>p.map(s=>s.id===sub.id?{...s,status}:s));
    await supabase.from("mission_submissions").update({status,reviewed_at:new Date().toISOString()}).eq("id",sub.id);
    if(approve){
      await supabase.from("mission_claims").update({completed:true}).eq("id",sub.claim_id);
      const prof=allProfiles.find(p=>p.id===sub.user_id);
      const pts=sub.missions?.xp||100;
      const newXp=(prof?.xp||0)+pts;
      if(prof){
        setAllProfiles(p=>p.map(x=>x.id===sub.user_id?{...x,xp:newXp}:x));
        await supabase.from("profiles").update({xp:newXp}).eq("id",sub.user_id);
        // Points history
        await supabase.from("points_history").insert({user_id:sub.user_id,amount:pts,reason:`Mission completed: ${sub.missions?.title}`,type:"credit"}).catch(()=>{});
      }
      // Auto-announcement to ALL users
      const annTitle=`🎯 ${prof?.nickname||prof?.name} completed a mission!`;
      const annBody=`${prof?.nickname||prof?.name} successfully completed "${sub.missions?.title}" and earned ${pts} pts!`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      // Notify all
      await notifyAll(`🎯 Mission Completed!`,annBody,"mission");
      // Notify user personally
      await supabase.from("notifications").insert({user_id:sub.user_id,title:"✅ Mission Approved!",body:`Your submission for "${sub.missions?.title}" was approved! +${pts} pts added.`,type:"approval"});
    } else {
      await supabase.from("notifications").insert({user_id:sub.user_id,title:"❌ Mission Rejected",body:`Your submission for "${sub.missions?.title}" was not approved. Please review and try again.`,type:"rejection"});
    }
    showToast(approve?"✅ Approved! Points awarded.":"❌ Rejected.");
  };

  const approveRedemption=async id=>{
    setRedemptions(p=>p.map(r=>r.id===id?{...r,status:"Approved"}:r));
    const red=redemptions.find(r=>r.id===id);
    await supabase.from("redemptions").update({status:"Approved"}).eq("id",id);
    if(red){
      // Notify recipient
      await supabase.from("notifications").insert({user_id:red.user_id,title:"🎁 Prize Delivered!",body:`Your "${red.prize_name}" has been delivered. Enjoy!`,type:"redemption"});
      // Announce to all
      const prof=allProfiles.find(p=>p.id===red.user_id);
      const annTitle=`🎁 ${prof?.nickname||prof?.name} redeemed a prize!`;
      const annBody=`${prof?.nickname||prof?.name} just received their "${red.prize_name}". Congratulations! 🎉`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      await notifyAll(annTitle,annBody,"redemption");
    }
    showToast("✅ Prize delivered!");
  };

  const approveVerification=async(req,approve)=>{
    setVerifReqs(p=>p.map(v=>v.id===req.id?{...v,status:approve?"Approved":"Rejected"}:v));
    await supabase.from("verification_requests").update({status:approve?"Approved":"Rejected",reviewed_at:new Date().toISOString()}).eq("id",req.id);
    if(approve){
      const update={[req.field_name]:req.field_value};
      if(req.field_name==="bank_account"){update.bank_type=req.extra_value;update.bank_verified=true;}
      else if(req.field_name==="ic_number")update.ic_verified=true;
      else if(req.field_name==="epf_number")update.epf_verified=true;
      else if(req.field_name==="position"){update.position=req.field_value;update.position_verified=true;update.role=req.field_value;}
      else if(req.field_name==="joined_date")update.joined_date_verified=true;
      else if(req.field_name==="birthday")update.birthday_verified=true;
      setAllProfiles(p=>p.map(x=>x.id===req.user_id?{...x,...update}:x));
      await supabase.from("profiles").update(update).eq("id",req.user_id);
      await supabase.from("notifications").insert({user_id:req.user_id,title:"✅ Information Verified!",body:`Your ${req.field_name.replace(/_/g," ")} has been verified successfully.`,type:"verification"});
    } else {
      await supabase.from("notifications").insert({user_id:req.user_id,title:"❌ Verification Rejected",body:`Your ${req.field_name.replace(/_/g," ")} could not be verified. Please contact admin.`,type:"rejection"});
    }
    showToast(approve?"✅ Verified!":"❌ Rejected.");
  };

  const giftPoints=async(toId,points,reason)=>{
    const recipient=allProfiles.find(p=>p.id===toId);
    if(!recipient)return;
    const newXp=(recipient.xp||0)+points;
    setAllProfiles(p=>p.map(x=>x.id===toId?{...x,xp:newXp}:x));
    await supabase.from("profiles").update({xp:newXp}).eq("id",toId);
    await supabase.from("points_history").insert({user_id:toId,amount:points,reason:`Gift from admin: ${reason}`,type:"credit"}).catch(()=>{});
    await supabase.from("point_gifts").insert({from_id:profile.id,to_id:toId,points,reason}).catch(()=>{});
    const annTitle=`🎁 ${recipient.nickname||recipient.name} received a gift!`;
    const annBody=`${recipient.nickname||recipient.name} has been gifted ${points.toLocaleString()} pts by admin.\n\nReason: ${reason}`;
    const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"Admin"}).select().single();
    if(newAnn)setAnnouncements(p=>[newAnn,...p]);
    await supabase.from("notifications").insert({user_id:toId,title:"🎁 You received a gift!",body:`You've been gifted ${points.toLocaleString()} pts!\n\nReason: ${reason}`,type:"gift"});
    await notifyAll(annTitle,annBody,"gift");
    showToast(`🎁 Gifted ${points} pts to ${recipient.name}!`);
  };

  const addMission=async(mForm)=>{
    const{data}=await supabase.from("missions").insert({...mForm,xp:+mForm.xp,active:true}).select().single();
    if(data){
      setMissions(p=>[...p,data]);
      // Announce new mission to all
      const annTitle=`🎯 New Mission: ${mForm.title}`;
      const annBody=`A new campaign mission has been posted! Complete "${mForm.title}" to earn ${mForm.xp} pts.\nDue: ${mForm.due_date||"No deadline"}`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      await notifyAll(annTitle,annBody,"mission");
    }
    showToast("Mission posted ✅");
  };

  const deleteMission=async id=>{
    setMissions(p=>p.filter(m=>m.id!==id));
    await supabase.from("missions").update({active:false}).eq("id",id);
    showToast("Mission removed");
  };

  const addAnn=async(aForm)=>{
    const{data}=await supabase.from("announcements").insert({...aForm,author:"Admin"}).select().single();
    if(data){
      setAnnouncements(p=>[data,...p]);
      // Notify all users
      await notifyAll(`📢 ${aForm.title}`,aForm.body||"","announcement");
    }
    showToast("Announcement posted ✅");
  };

  const deleteAnn=async id=>{
    setAnnouncements(p=>p.filter(a=>a.id!==id));
    await supabase.from("announcements").delete().eq("id",id);
    showToast("Deleted");
  };

  const togglePin=async ann=>{
    const pinned=!ann.pinned;
    setAnnouncements(p=>p.map(a=>a.id===ann.id?{...a,pinned}:a));
    await supabase.from("announcements").update({pinned}).eq("id",ann.id);
  };

  const addPrize=async(pForm)=>{
    const{data}=await supabase.from("prizes").insert({...pForm,cost:+pForm.cost,stock:+pForm.stock,active:true}).select().single();
    if(data)setPrizes(p=>[...p,data]);
    showToast("Prize added ✅");
  };

  const TABS=[
    {id:"dash",      label:"Dashboard", emoji:"📊"},
    {id:"staff",     label:"Staff",     emoji:"👥"},
    {id:"approvals", label:"Approvals", emoji:"📋",badge:totalPending},
    {id:"content",   label:"Content",   emoji:"✏️"},
    {id:"community", label:"Community", emoji:"💬"},
  ];

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:"rgba(242,242,247,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"12px 16px 10px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:30,height:30,borderRadius:7,objectFit:"cover"}}/>
            <div style={{fontSize:17,fontWeight:600,color:LBL,letterSpacing:"-.3px"}}>Admin Panel</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:13,color:LB3}}>👋 {profile.name?.split(" ")[0]}</div>
            <button onClick={()=>supabase.auth.signOut()} style={{fontSize:13,color:"#ff3b30",fontWeight:500,background:"rgba(255,59,48,.1)",padding:"4px 9px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:SF}}>Sign Out</button>
          </div>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginTop:6}}>
          {tab==="dash"&&"Dashboard 📊"}{tab==="staff"&&"Staff 👥"}{tab==="approvals"&&"Approvals 📋"}
          {tab==="content"&&"Content ✏️"}{tab==="community"&&"Community 💬"}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 0 90px"}}>
        {tab==="dash"&&<DashTab allProfiles={allProfiles} submissions={submissions} totalPending={totalPending} pendingVerif={pendingVerifCount} today={today} ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF} getTier={getTier} calcScore={calcScore}/>}
        {tab==="staff"&&<StaffTab allProfiles={allProfiles} today={today} ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF} getTier={getTier} calcScore={calcScore} formatContact={formatContact}/>}
        {tab==="approvals"&&<ApprovalsTab submissions={submissions} redemptions={redemptions} verifReqs={verifReqs} onApproveSubmission={approveSubmission} onApproveRedemption={approveRedemption} onApproveVerification={approveVerification} ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}/>}
        {tab==="content"&&<ContentTab missions={missions} announcements={announcements} prizes={prizes} allProfiles={allProfiles} onAddMission={addMission} onDeleteMission={deleteMission} onAddAnn={addAnn} onDeleteAnn={deleteAnn} onTogglePin={togglePin} onAddPrize={addPrize} onGift={giftPoints} ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}/>}
        {tab==="community"&&<CommunityTab profile={profile} ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(249,249,249,.94)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,.1)",display:"flex",zIndex:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"7px 2px 11px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
            <div style={{fontSize:tab===t.id?21:17,lineHeight:1,filter:tab===t.id?"none":"grayscale(1) opacity(.35)",transition:"font-size .15s"}}>{t.emoji}</div>
            <div style={{fontSize:9,fontWeight:tab===t.id?600:400,color:tab===t.id?ACC:"#8e8e93",fontFamily:SF}}>{t.label}</div>
            {t.badge>0&&<div style={{position:"absolute",top:4,right:"10%",minWidth:16,height:16,background:"#ff3b30",borderRadius:99,fontSize:9,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{t.badge}</div>}
          </button>
        ))}
      </div>
      {toast&&<div className="toast-in" style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.78)",backdropFilter:"blur(16px)",borderRadius:99,padding:"10px 20px",fontSize:14,color:"#fff",fontWeight:500,whiteSpace:"nowrap",zIndex:50,pointerEvents:"none",maxWidth:"85vw",textAlign:"center"}}>{toast}</div>}
    </div>
  );
}
