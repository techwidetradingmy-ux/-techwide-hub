import{useState,useEffect,useRef}from"react";
import DatePicker from"react-datepicker";
import"react-datepicker/dist/react-datepicker.css";
import{supabase}from"./supabaseClient";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore,formatContact}from"./constants";

const MISSION_CATS=["Sales","Teamwork","Admin","Creativity","KOL","Content","Live Hosting","Others"];
const fmtDate=iso=>{if(!iso)return"N/A";const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};

function addRipple(e){
  const el=e.currentTarget;if(!el)return;
  const rect=el.getBoundingClientRect();
  const dot=document.createElement("div");
  dot.className="ripple-dot";
  dot.style.left=(e.clientX-rect.left)+"px";
  dot.style.top=(e.clientY-rect.top)+"px";
  el.appendChild(dot);setTimeout(()=>dot.remove(),500);
}

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
    setToId("");setPoints(100);setReason("");
    setSending(false);
  };

  return(
    <div>
      <div style={{background:`${ORG}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ORG,lineHeight:1.7,fontWeight:500}}>
        🎁 Points are sent instantly. The recipient will receive a live notification immediately.
      </div>
      <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
        <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Select Staff Member</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:240,overflowY:"auto"}}>
            {allProfiles.map(p=>(
              <button key={p.id} onClick={()=>setToId(p.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",background:toId===p.id?`${ACC}14`:"rgba(0,0,0,.04)",border:toId===p.id?`1.5px solid ${ACC}`:"1.5px solid transparent",borderRadius:10,cursor:"pointer",fontFamily:SF,textAlign:"left",transition:"all .15s"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:p.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
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
                style={{flex:1,padding:"9px",background:points===p?ACC:"rgba(0,0,0,.06)",color:points===p?"#fff":LB2,border:"none",borderRadius:9,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF,transition:"all .12s"}}>
                {p}
              </button>
            ))}
          </div>
          <input value={points} onChange={e=>setPoints(e.target.value)} placeholder="Custom amount" type="number"
            style={{width:"100%",background:"rgba(0,0,0,.04)",border:"none",outline:"none",fontSize:16,color:LBL,fontFamily:SF,borderRadius:9,padding:"10px 12px"}}/>
        </div>
        <div style={{padding:"11px 16px"}}>
          <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Reason</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)}
            placeholder="e.g. Outstanding performance! Happy Birthday! Thank you for your hard work…" rows={3}
            style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:16,color:LBL,resize:"none",lineHeight:1.5,fontFamily:SF}}/>
        </div>
      </div>
      <button onClick={send} disabled={!toId||!points||!reason.trim()||sending}
        className="btn-primary ripple-container" onPointerDown={addRipple}
        style={{width:"100%",background:(!toId||!points||!reason.trim()||sending)?"#e5e5ea":ORG,color:(!toId||!points||!reason.trim()||sending)?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {sending&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
        {sending?"Sending Gift…":`🎁 Gift ${points} pts`}
      </button>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
function DashTab({allProfiles,totalPending,pendingVerif,today,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF,getTier,calcScore}){
  const staff=allProfiles.filter(p=>!p.is_admin);
  const checkedIn=staff.filter(p=>p.last_checkin===today).length;
  const Av=({p,size=38})=>(
    <div style={{width:size,height:size,borderRadius:"50%",background:p?.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.3,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {!p?.avatar_url&&(p?.avatar||"?")}
    </div>
  );
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        {[
          {l:"Total Staff",    v:staff.length,                       i:"👥",c:ACC},
          {l:"Checked In",     v:`${checkedIn}/${staff.length}`,     i:"✅",c:"#34c759"},
          {l:"Pending Actions",v:totalPending,                       i:"⚠️",c:"#ff9500"},
          {l:"Verifications",  v:pendingVerif,                       i:"🔒",c:"#ff3b30"},
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
        {staff.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No staff yet</div>}
        {staff.slice(0,5).map((s,i)=>{
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<Math.min(staff.length,5)-1?`1px solid ${SEP}`:"none"}}>
              <div style={{fontWeight:700,fontSize:i<3?18:14,color:i<3?ORG:"#8e8e93",width:26,textAlign:"center",flexShrink:0}}>{["🥇","🥈","🥉"][i]||`#${i+1}`}</div>
              <Av p={s}/>
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
        {staff.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No staff yet</div>}
        {staff.map((s,i)=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<staff.length-1?`1px solid ${SEP}`:"none"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:s.last_checkin===today?"#34c759":"#e5e5ea",flexShrink:0}}/>
            <Av p={s} size={32}/>
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
  const staff=allProfiles.filter(p=>!p.is_admin);
  const Av=({p,size=44})=>(
    <div style={{width:size,height:size,borderRadius:"50%",background:p?.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.3,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {!p?.avatar_url&&(p?.avatar||"?")}
    </div>
  );

  if(selected){
    const age=selected.birthday_verified&&selected.birthday?new Date().getFullYear()-new Date(selected.birthday).getFullYear():null;
    const days=selected.joined_date_verified&&selected.joined_date?Math.floor((Date.now()-new Date(selected.joined_date))/86400000):null;
    return(
      <div className="page-enter-forward" style={{position:"fixed",inset:0,background:BG,zIndex:100,overflowY:"auto",fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
        <div style={{background:"rgba(242,242,247,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"12px 16px",position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSelected(null)} className="btn" style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:ACC,fontWeight:600,padding:0,fontFamily:SF}}>← Back</button>
          <div style={{flex:1,fontSize:17,fontWeight:600,color:LBL}}>{selected.name}</div>
        </div>
        <div style={{height:120,background:selected.banner_url?`url(${selected.banner_url}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`}}/>
        <div style={{padding:"0 16px",marginTop:-46,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div style={{width:84,height:84,borderRadius:"50%",border:`3px solid ${BG}`,background:selected.avatar_url?`url(${selected.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:26,color:ACC,overflow:"hidden",flexShrink:0}}>
            {!selected.avatar_url&&(selected.avatar||"?")}
          </div>
          <div style={{background:getTier(calcScore(selected.joined_date,0)).color+"18",borderRadius:99,padding:"5px 12px",display:"inline-flex",alignItems:"center",gap:5,marginBottom:4}}>
            <span>{getTier(calcScore(selected.joined_date,0)).emoji}</span>
            <span style={{fontSize:12,color:getTier(calcScore(selected.joined_date,0)).color,fontWeight:700}}>{getTier(calcScore(selected.joined_date,0)).name}</span>
          </div>
        </div>
        <div style={{padding:"0 16px 32px"}}>
          <div style={{fontSize:22,fontWeight:700,color:LBL}}>{selected.name}</div>
          {selected.nickname&&<div style={{fontSize:14,color:LB3,marginTop:1}}>"{selected.nickname}"</div>}
          <div style={{fontSize:14,color:ACC,fontWeight:500,marginTop:4}}>{selected.role}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14,marginBottom:16}}>
            {[{l:"Points",v:(selected.xp||0).toLocaleString(),e:"⚡"},{l:"Streak",v:`${selected.streak||0}d`,e:"🔥"},{l:"Check-In",v:selected.last_checkin===today?"Today":"—",e:"✅"}].map((s,i)=>(
              <div key={i} style={{background:BG2,borderRadius:13,padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontSize:18,marginBottom:3}}>{s.e}</div>
                <div style={{fontSize:15,fontWeight:700,color:ACC}}>{s.v}</div>
                <div style={{fontSize:10,color:LB3,marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Public Info</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:14}}>
            {[
              ["💼 Position",selected.role||selected.position],
              ["📧 Email",selected.email],
              ["📱 Contact",selected.contact_number?formatContact(selected.contact_number):null],
              ["⚧ Gender",selected.gender],
              ["🏠 Hometown",selected.hometown],
              ["🎂 Birthday",selected.birthday_verified?fmtDate(selected.birthday):null],
              ["📅 Joined",selected.joined_date_verified?fmtDate(selected.joined_date):null],
              ["⏳ Working",days!==null?`${days.toLocaleString()} days`:null],
              ["🎮 Hobby",selected.hobby],
              ["🍜 Fav Food",selected.favorite_food],
              ["📝 Bio",selected.bio],
            ].filter(([,v])=>v).map(([label,value],i,a)=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:14,color:LB3,flexShrink:0,marginRight:12}}>{label}</div>
                <div style={{fontSize:14,color:LBL,textAlign:"right",maxWidth:"60%",lineHeight:1.4}}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>🔒 Private (Admin Only)</div>
          <div style={{background:`${ACC}08`,borderRadius:13,overflow:"hidden"}}>
            {[
              {label:"IC Number",value:selected.ic_number,verified:selected.ic_verified},
              {label:"EPF Number",value:selected.epf_number,verified:selected.epf_verified},
              {label:"Bank Account",value:selected.bank_account,verified:selected.bank_verified},
              {label:"Bank Type",value:selected.bank_type,verified:null},
            ].map(({label,value,verified},i,a)=>(
              <div key={label} style={{padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}33`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{fontSize:12,color:LB3,fontWeight:600}}>{label}</div>
                  {verified!==null&&<span style={{fontSize:10,color:verified?"#34c759":"#ff9500",fontWeight:700,background:(verified?"#34c759":"#ff9500")+"18",padding:"2px 7px",borderRadius:99}}>{verified?"✓ Verified":"⏳ Pending"}</span>}
                </div>
                <div style={{fontSize:15,color:value?LBL:LB3}}>{value||"Not provided"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"flex",gap:8,marginBottom:14}}>
        {[["list","Staff List"],["private","Private Info"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} className="btn"
            style={{flex:1,padding:"10px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:view===id?600:400,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>
      {view==="list"&&(
        <>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>All Staff ({staff.length})</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {staff.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No staff yet</div>}
            {staff.map((s,i)=>{
              const sTier=getTier(calcScore(s.joined_date,0));
              return(
                <div key={s.id} onClick={()=>setSelected(s)} className="card-press"
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<staff.length-1?`1px solid ${SEP}`:"none",cursor:"pointer"}}>
                  <Av p={s}/>
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
          <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC}}>🔒 Strictly confidential. Tap a staff member to view full details.</div>
          {staff.map(s=>(
            <div key={s.id} onClick={()=>setSelected(s)} className="card-press"
              style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${SEP}`}}>
                <Av p={s} size={36}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,color:LBL,fontWeight:500}}>{s.name}</div>
                  <div style={{fontSize:13,color:LB3}}>{s.role}</div>
                </div>
                <div style={{color:LB3,fontSize:18}}>›</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["IC",s.ic_number,s.ic_verified],["EPF",s.epf_number,s.epf_verified],["Bank",s.bank_account,s.bank_verified],["Bank Type",s.bank_type,null]].map(([label,val,verified])=>(
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

  const Sb=({status})=>{
    const c=status==="Pending"?"#ff9500":status==="Approved"?"#34c759":"#ff3b30";
    return<div style={{background:c+"18",color:c,fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99,flexShrink:0,whiteSpace:"nowrap"}}>{status}</div>;
  };

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {[["missions","Submissions",pending.length],["redemptions","Redemptions",pendReds.length],["verif","Verifications",pendVerif.length]].map(([id,label,count])=>(
          <button key={id} onClick={()=>setSec(id)} className="btn"
            style={{flexShrink:0,padding:"9px 14px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF,position:"relative"}}>
            {label}
            {count>0&&<span style={{marginLeft:5,background:sec===id?"rgba(255,255,255,.3)":ORG,color:"#fff",fontSize:10,padding:"1px 5px",borderRadius:99,fontWeight:700}}>{count}</span>}
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
                <button onClick={()=>onApproveSubmission(sub,false)} className="btn"
                  style={{flex:1,padding:"11px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  Reject
                </button>
                <button onClick={()=>onApproveSubmission(sub,true)} className="btn-primary ripple-container" onPointerDown={addRipple}
                  style={{flex:2,padding:"11px",background:"#34c759",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  Approve ✓
                </button>
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
                    <Sb status={s.status}/>
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
                <Sb status={r.status}/>
              </div>
              <div style={{fontSize:12,color:LB3,marginBottom:12}}>{new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short"})}</div>
              <button onClick={()=>onApproveRedemption(r.id)} className="btn-primary ripple-container" onPointerDown={addRipple}
                style={{width:"100%",padding:"11px",background:ACC,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                Mark Delivered ✓
              </button>
            </div>
          ))}
          {doneReds.length>0&&(
            <>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>Delivered</div>
              <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
                {doneReds.slice(0,8).map((r,i,a)=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:15,color:LBL}}>{r.profiles?.name}</div><div style={{fontSize:12,color:LB3}}>{r.prize_name}</div></div>
                    <Sb status={r.status}/>
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
                    {{"ic_number":"IC Number","epf_number":"EPF Number","bank_account":"Bank Account","position":"Position","joined_date":"Joining Date","birthday":"Birthday"}[req.field_name]||"Information"}
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
                <button onClick={()=>onApproveVerification(req,false)} className="btn"
                  style={{flex:1,padding:"11px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  Reject
                </button>
                <button onClick={()=>onApproveVerification(req,true)} className="btn-primary ripple-container" onPointerDown={addRipple}
                  style={{flex:2,padding:"11px",background:"#34c759",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  Verify ✓
                </button>
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
  const [mForm,setMForm]=useState({title:"",description:"",xp:150,category:"",due_date:null});
  const [aForm,setAForm]=useState({title:"",body:"",pinned:false});
  const [pForm,setPForm]=useState({name:"",cost:500,stock:10,icon:"🎁",category:"Cash",desc:""});

  const canAddMission=mForm.title.trim()&&mForm.category&&mForm.due_date;

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
        {[["missions","Missions"],["announcements","Announcements"],["prizes","Prizes"],["gifts","🎁 Gift Points"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSec(id)} className="btn"
            style={{flexShrink:0,padding:"8px 14px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── MISSIONS ── */}
      {sec==="missions"&&(
        <>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>➕ Post Campaign Mission</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Title <span style={{color:"#ff3b30"}}>*</span></div>
              <input value={mForm.title} onChange={e=>setMForm(p=>({...p,title:e.target.value}))} placeholder="Mission title"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Description</div>
              <textarea value={mForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="What needs to be done…" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Category <span style={{color:"#ff3b30"}}>*</span></div>
              <div style={{position:"relative"}}>
                <select value={mForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))}
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:mForm.category?LBL:LB3,appearance:"none",WebkitAppearance:"none",paddingRight:24,cursor:"pointer",fontFamily:SF}}>
                  <option value="" disabled>-- Please Select --</option>
                  {MISSION_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",fontSize:14,color:LB3,pointerEvents:"none"}}>▾</div>
              </div>
            </div>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Reward Points</div>
              <input value={mForm.xp} onChange={e=>setMForm(p=>({...p,xp:e.target.value}))} placeholder="150" type="number"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"11px 16px"}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Due Date <span style={{color:"#ff3b30"}}>*</span></div>
              <DatePicker
                selected={mForm.due_date}
                onChange={date=>setMForm(p=>({...p,due_date:date}))}
                dateFormat="dd/MM/yyyy" placeholderText="DD/MM/YYYY"
                minDate={new Date()} showMonthDropdown showYearDropdown dropdownMode="select"
                customInput={<input readOnly placeholder="DD/MM/YYYY" style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,cursor:"pointer",fontFamily:SF}}/>}
              />
              {mForm.due_date&&<div style={{fontSize:12,color:ACC,marginTop:4,fontWeight:500}}>📅 Due: {mForm.due_date.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>}
            </div>
          </div>
          <button onClick={()=>{
            if(!canAddMission)return;
            const dueDateISO=mForm.due_date?mForm.due_date.toISOString().split("T")[0]:null;
            onAddMission({title:mForm.title,description:mForm.description,xp:+mForm.xp,category:mForm.category,due_date:dueDateISO});
            setMForm({title:"",description:"",xp:150,category:"",due_date:null});
          }}
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",background:canAddMission?ACC:"#e5e5ea",color:canAddMission?"#fff":LB3,border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:canAddMission?"pointer":"default",fontFamily:SF,marginBottom:8}}>
            Post Campaign Mission
          </button>
          {!canAddMission&&(mForm.title||mForm.category||mForm.due_date)&&(
            <div style={{fontSize:12,color:"#ff9500",textAlign:"center",marginBottom:12,fontWeight:500}}>⚠️ Please fill in Title, Category and Due Date</div>
          )}
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"8px 4px 8px"}}>Active Missions</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {missions.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No missions yet</div>}
            {missions.map((m,i)=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<missions.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,color:LBL,fontWeight:500}}>{m.title}</div>
                  <div style={{fontSize:12,color:LB3}}>{m.category} · {m.xp} pts{m.due_date?` · Due ${fmtDate(m.due_date)}`:""}</div>
                </div>
                <button onClick={()=>onDeleteMission(m.id)} className="btn"
                  style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF,flexShrink:0}}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── ANNOUNCEMENTS ── */}
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
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",background:aForm.title.trim()?ACC:"#e5e5ea",color:aForm.title.trim()?"#fff":LB3,border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:aForm.title.trim()?"pointer":"default",fontFamily:SF,marginBottom:16}}>
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
                  <button onClick={()=>onTogglePin(a)} className="btn" style={{background:`${ORG}18`,color:ORG,border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF}}>{a.pinned?"Unpin":"Pin"}</button>
                  <button onClick={()=>onDeleteAnn(a.id)} className="btn" style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF}}>Delete</button>
                </div>
              </div>
              {a.body&&<div style={{fontSize:14,color:LB3,lineHeight:1.5,whiteSpace:"pre-line"}}>{a.body}</div>}
            </div>
          ))}
        </>
      )}

      {/* ── PRIZES ── */}
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
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",background:pForm.name.trim()?ACC:"#e5e5ea",color:pForm.name.trim()?"#fff":LB3,border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:pForm.name.trim()?"pointer":"default",fontFamily:SF,marginBottom:16}}>
            Add Prize
          </button>
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>Active Prizes</div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            {prizes.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No prizes yet</div>}
            {prizes.map((p,i)=>(
              <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<prizes.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:26}}>{p.icon||"🎁"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,color:LBL,fontWeight:500}}>{p.name}</div>
                  <div style={{fontSize:12,color:LB3}}>{p.stock??0} left · {(p.pts||p.cost)?.toLocaleString()} pts</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {sec==="gifts"&&<GiftPointsTab allProfiles={allProfiles} onGift={onGift}/>}
    </div>
  );
}

// ── COMMUNITY (Monitor) ───────────────────────────────────────────────
function CommunityTab({profile,ACC,ORG,BG,BG2,SEP,LBL,LB2,LB3,SF}){
  const [messages,setMessages]=useState([]);
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

  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 170px)"}}>
      <div style={{background:`${ACC}10`,borderRadius:10,padding:"10px 14px",margin:"0 16px 8px",fontSize:13,color:ACC,fontWeight:500,flexShrink:0}}>
        👁️ Monitor Mode — Admins can view but not send messages in group chat
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px 12px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No messages yet 👋</div>}
        {messages.map(msg=>{
          if(msg.is_system)return(
            <div key={msg.id} style={{textAlign:"center"}}>
              <div style={{display:"inline-block",background:`${ACC}10`,borderRadius:12,padding:"8px 14px",fontSize:13,color:ACC,lineHeight:1.55,maxWidth:"88%",whiteSpace:"pre-line"}}>{msg.content}</div>
            </div>
          );
          const avatarUrl=msg.sender_avatar_url||"";
          return(
            <div key={msg.id} style={{display:"flex",alignItems:"flex-end",gap:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:avatarUrl?`url(${avatarUrl}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden"}}>
                {!avatarUrl&&(msg.sender_avatar||"?")}
              </div>
              <div style={{maxWidth:"75%"}}>
                <div style={{fontSize:11,color:LB3,marginBottom:3,paddingLeft:4}}>{msg.sender_name}</div>
                <div style={{background:BG2,borderRadius:"18px 18px 18px 4px",padding:"10px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <div style={{fontSize:15,color:LBL,lineHeight:1.45,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                </div>
                <div style={{fontSize:10,color:LB3,marginTop:3,paddingLeft:4}}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
    </div>
  );
}

// ── MAIN ADMIN APP ────────────────────────────────────────────────────
export default function AdminApp({profile,onProfileUpdate}){
  const [tab,setTab]                    =useState("dash");
  const [allProfiles,setAllProfiles]    =useState([]);
  const [missions,setMissions]          =useState([]);
  const [submissions,setSubmissions]    =useState([]);
  const [prizes,setPrizes]              =useState([]);
  const [announcements,setAnnouncements]=useState([]);
  const [redemptions,setRedemptions]    =useState([]);
  const [verifReqs,setVerifReqs]        =useState([]);
  const [toast,setToast]                =useState(null);

  useEffect(()=>{
    loadAll();
    const ch=supabase.channel("admin_rt")
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

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),3000);};

  const today=new Date().toISOString().split("T")[0];
  const staff=allProfiles.filter(p=>!p.is_admin);
  const pendingSubs=submissions.filter(s=>s.status==="Pending").length;
  const pendingReds=redemptions.filter(r=>r.status==="Pending").length;
  const pendingVerifCount=verifReqs.filter(v=>v.status==="Pending").length;
  const totalPending=pendingSubs+pendingReds+pendingVerifCount;

  // ── Notify all staff ──
  const notifyAll=async(title,body,type="info")=>{
    const nonAdmins=allProfiles.filter(p=>!p.is_admin);
    if(nonAdmins.length===0)return;
    await supabase.from("notifications").insert(nonAdmins.map(p=>({user_id:p.id,title,body,type}))).catch(()=>{});
  };

  // ── Approve mission ──
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
        await supabase.from("points_history").insert({user_id:sub.user_id,amount:pts,reason:`Mission completed: ${sub.missions?.title}`,type:"credit"}).catch(()=>{});
      }
      const annTitle=`🎯 ${prof?.nickname||prof?.name} completed a mission!`;
      const annBody=`${prof?.nickname||prof?.name} successfully completed "${sub.missions?.title}" and earned ${pts} pts!`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      await notifyAll(annTitle,annBody,"mission");
      await supabase.from("notifications").insert({user_id:sub.user_id,title:"✅ Mission Approved!",body:`+${pts} pts added for completing "${sub.missions?.title}"`,type:"approval"});
    } else {
      await supabase.from("notifications").insert({user_id:sub.user_id,title:"❌ Mission Not Approved",body:`Your submission for "${sub.missions?.title}" was rejected. Please review and try again.`,type:"rejection"});
    }
    showToast(approve?"✅ Approved! Points awarded.":"❌ Rejected.");
  };

  // ── Approve redemption ──
  const approveRedemption=async id=>{
    setRedemptions(p=>p.map(r=>r.id===id?{...r,status:"Approved"}:r));
    const red=redemptions.find(r=>r.id===id);
    await supabase.from("redemptions").update({status:"Approved"}).eq("id",id);
    if(red){
      await supabase.from("notifications").insert({user_id:red.user_id,title:"🎁 Prize Delivered!",body:`Your "${red.prize_name}" has been delivered. Enjoy!`,type:"redemption"});
      const prof=allProfiles.find(p=>p.id===red.user_id);
      const annTitle=`🎁 ${prof?.nickname||prof?.name} redeemed a prize!`;
      const annBody=`${prof?.nickname||prof?.name} just received "${red.prize_name}". Congratulations! 🎉`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      await notifyAll(annTitle,annBody,"redemption");
    }
    showToast("✅ Prize delivered!");
  };

  // ── Approve verification ──
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
      const fieldLabel={"ic_number":"IC Number","epf_number":"EPF Number","bank_account":"Bank Account","position":"Position","joined_date":"Joining Date","birthday":"Birthday"}[req.field_name]||req.field_name;
      await supabase.from("notifications").insert({user_id:req.user_id,title:"✅ Information Verified!",body:`Your ${fieldLabel} has been verified and updated in your profile.`,type:"verification"});
    } else {
      const fieldLabel={"ic_number":"IC Number","epf_number":"EPF Number","bank_account":"Bank Account","position":"Position","joined_date":"Joining Date","birthday":"Birthday"}[req.field_name]||req.field_name;
      await supabase.from("notifications").insert({user_id:req.user_id,title:"❌ Verification Failed",body:`Your ${fieldLabel} could not be verified. Please check and resubmit.`,type:"rejection"});
    }
    showToast(approve?"✅ Verified!":"❌ Rejected.");
  };

  // ── Gift points — FIXED ──
  const giftPoints=async(toId,points,reason)=>{
    const recipient=allProfiles.find(p=>p.id===toId);
    if(!recipient){showToast("❌ Staff member not found");return;}
    try{
      const newXp=(recipient.xp||0)+points;
      // 1. Update DB
      const{error:updateErr}=await supabase.from("profiles").update({xp:newXp}).eq("id",toId);
      if(updateErr)throw updateErr;
      // 2. Update local state immediately
      setAllProfiles(p=>p.map(x=>x.id===toId?{...x,xp:newXp}:x));
      // 3. Points history
      await supabase.from("points_history").insert({user_id:toId,amount:points,reason:`Gift from admin: ${reason}`,type:"credit"}).catch(()=>{});
      // 4. Gift log
      await supabase.from("point_gifts").insert({from_id:profile.id,to_id:toId,points,reason}).catch(()=>{});
      // 5. Announcement
      const annTitle=`🎁 ${recipient.nickname||recipient.name} received a gift!`;
      const annBody=`${recipient.nickname||recipient.name} has been gifted ${points.toLocaleString()} pts!\n\nReason: ${reason}`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"Admin"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      // 6. Notify recipient (triggers live popup)
      await supabase.from("notifications").insert({user_id:toId,title:"🎁 You received a gift!",body:`You've been gifted ${points.toLocaleString()} pts!\n\nReason: ${reason}`,type:"gift"});
      // 7. Notify all other staff
      const others=allProfiles.filter(p=>!p.is_admin&&p.id!==toId);
      if(others.length>0){
        await supabase.from("notifications").insert(others.map(p=>({user_id:p.id,title:annTitle,body:annBody,type:"gift"}))).catch(()=>{});
      }
      showToast(`🎁 Gifted ${points} pts to ${recipient.name}!`);
    }catch(err){
      console.error("Gift points error:",err);
      showToast("❌ Failed to send gift — "+err.message);
    }
  };

  // ── Add mission ──
  const addMission=async(mForm)=>{
    const{data}=await supabase.from("missions").insert({...mForm,xp:+mForm.xp,active:true}).select().single();
    if(data){
      setMissions(p=>[...p,data]);
      const annTitle=`🎯 New Mission: ${mForm.title}`;
      const annBody=`A new campaign mission is live! Complete "${mForm.title}" and earn ${mForm.xp} pts.\nDue: ${fmtDate(mForm.due_date)}`;
      const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();
      if(newAnn)setAnnouncements(p=>[newAnn,...p]);
      await notifyAll(annTitle,annBody,"mission");
    }
    showToast("Campaign mission posted ✅");
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
    {id:"dash",      label:"Dashboard",emoji:"📊"},
    {id:"staff",     label:"Staff",    emoji:"👥"},
    {id:"approvals", label:"Approvals",emoji:"📋",badge:totalPending},
    {id:"content",   label:"Content",  emoji:"✏️"},
    {id:"community", label:"Community",emoji:"💬"},
  ];

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:"rgba(242,242,247,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"12px 16px 10px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:30,height:30,borderRadius:7,objectFit:"cover"}}/>
            <div style={{fontSize:17,fontWeight:600,color:LBL,letterSpacing:"-.3px"}}>Admin Panel</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:13,color:LB3}}>👋 {profile.name?.split(" ")[0]}</div>
            <button onClick={()=>supabase.auth.signOut()} className="btn"
              style={{fontSize:13,color:"#ff3b30",fontWeight:500,background:"rgba(255,59,48,.1)",padding:"4px 9px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:SF}}>
              Sign Out
            </button>
          </div>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginTop:6}}>
          {tab==="dash"&&"Dashboard 📊"}{tab==="staff"&&"Staff 👥"}{tab==="approvals"&&"Approvals 📋"}
          {tab==="content"&&"Content ✏️"}{tab==="community"&&"Community 💬"}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 0 90px"}}>
        {tab==="dash"&&(
          <DashTab allProfiles={allProfiles} totalPending={totalPending} pendingVerif={pendingVerifCount}
            today={today} ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}
            getTier={getTier} calcScore={calcScore}/>
        )}
        {tab==="staff"&&(
          <StaffTab allProfiles={allProfiles} today={today}
            ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}
            getTier={getTier} calcScore={calcScore} formatContact={formatContact}/>
        )}
        {tab==="approvals"&&(
          <ApprovalsTab submissions={submissions} redemptions={redemptions} verifReqs={verifReqs}
            onApproveSubmission={approveSubmission} onApproveRedemption={approveRedemption} onApproveVerification={approveVerification}
            ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}/>
        )}
        {tab==="content"&&(
          <ContentTab missions={missions} announcements={announcements} prizes={prizes} allProfiles={staff}
            onAddMission={addMission} onDeleteMission={deleteMission} onAddAnn={addAnn}
            onDeleteAnn={deleteAnn} onTogglePin={togglePin} onAddPrize={addPrize} onGift={giftPoints}
            ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}/>
        )}
        {tab==="community"&&(
          <CommunityTab profile={profile}
            ACC={ACC} ORG={ORG} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} SF={SF}/>
        )}
      </div>

      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(249,249,249,.94)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,.1)",display:"flex",zIndex:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="tab-btn"
            style={{flex:1,padding:"7px 2px 11px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
            <div style={{fontSize:tab===t.id?21:17,lineHeight:1,filter:tab===t.id?"none":"grayscale(1) opacity(.35)",transition:"font-size .2s cubic-bezier(.34,1.56,.64,1)"}}>{t.emoji}</div>
            <div style={{fontSize:9,fontWeight:tab===t.id?600:400,color:tab===t.id?ACC:"#8e8e93",fontFamily:SF,transition:"color .15s"}}>{t.label}</div>
            {t.badge>0&&<div style={{position:"absolute",top:4,right:"10%",minWidth:16,height:16,background:"#ff3b30",borderRadius:99,fontSize:9,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{t.badge}</div>}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast&&(
        <div className="toast-in" style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.78)",backdropFilter:"blur(16px)",borderRadius:99,padding:"10px 20px",fontSize:14,color:"#fff",fontWeight:500,whiteSpace:"nowrap",zIndex:50,pointerEvents:"none",maxWidth:"85vw",textAlign:"center"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
