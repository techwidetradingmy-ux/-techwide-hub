import{useState,useEffect,useRef}from"react";
import DatePicker from"react-datepicker";
import"react-datepicker/dist/react-datepicker.css";
import{supabase}from"./supabaseClient";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore,formatContact}from"./constants";

const MISSION_CATS=["Sales","Teamwork","Admin","Creativity","KOL","Content","Live Hosting","Others"];
const fmtDate=iso=>{if(!iso)return"N/A";const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
function addRipple(e){const el=e.currentTarget;if(!el)return;const rect=el.getBoundingClientRect();const dot=document.createElement("div");dot.className="ripple-dot";dot.style.left=(e.clientX-rect.left)+"px";dot.style.top=(e.clientY-rect.top)+"px";el.appendChild(dot);setTimeout(()=>dot.remove(),500);}

const autoIcon=name=>{
  const n=(name||"").toLowerCase();
  if(n.includes("bubble")||n.includes("boba")||n.includes("teh"))return"🧋";
  if(n.includes("netflix")||n.includes("disney")||n.includes("movie"))return"🎬";
  if(n.includes("grab")&&!n.includes("food"))return"🚗";
  if(n.includes("food")||n.includes("makan")||n.includes("meal"))return"🍽️";
  if(n.includes("spotify")||n.includes("music"))return"🎵";
  if(n.includes("spa")||n.includes("massage"))return"💆";
  if(n.includes("leave")||n.includes("off day"))return"📅";
  if(n.includes("wfh")||n.includes("work from home"))return"🏠";
  if(n.includes("airpod")||n.includes("earphone")||n.includes("headphone"))return"🎧";
  if(n.includes("cash")||n.includes("money")||n.includes("rm")||n.includes("ringgit"))return"💰";
  if(n.includes("tng")||n.includes("touch n go")||n.includes("ewallet"))return"💳";
  if(n.includes("voucher")||n.includes("coupon"))return"🎫";
  if(n.includes("birthday")||n.includes("cake"))return"🎂";
  if(n.includes("coffee")||n.includes("kopi"))return"☕";
  if(n.includes("pizza")||n.includes("burger")||n.includes("mcd")||n.includes("kfc"))return"🍟";
  if(n.includes("book")||n.includes("read"))return"📚";
  if(n.includes("gym")||n.includes("fitness"))return"🏋️";
  if(n.includes("travel")||n.includes("flight"))return"✈️";
  if(n.includes("hotel")||n.includes("resort"))return"🏨";
  if(n.includes("shopee")||n.includes("lazada")||n.includes("shopping"))return"🛍️";
  if(n.includes("petrol")||n.includes("fuel"))return"⛽";
  if(n.includes("game")||n.includes("gaming"))return"🎮";
  if(n.includes("bundle")||n.includes("pack")||n.includes("set"))return"📦";
  if(n.includes("dinner")||n.includes("lunch")||n.includes("team"))return"🍽️";
  return"🎁";
};

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
    <div style={{paddingBottom:40}}>
      <div style={{background:`${ORG}10`,borderRadius:14,padding:"14px 16px",marginBottom:16,fontSize:15,color:ORG,lineHeight:1.7,fontWeight:500}}>
        🎁 Points are sent instantly with live in-app notification + sound.
      </div>
      <div style={{background:BG2,borderRadius:14,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:12}}>Select Staff Member</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:280,overflowY:"auto"}}>
            {allProfiles.map(p=>(
              <button key={p.id} onClick={()=>setToId(p.id)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px",background:toId===p.id?`${ACC}14`:"rgba(0,0,0,.04)",border:toId===p.id?`2px solid ${ACC}`:"2px solid transparent",borderRadius:12,cursor:"pointer",fontFamily:SF,textAlign:"left"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:p.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
                  {!p.avatar_url&&(p.avatar||"?")}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,color:LBL,fontWeight:toId===p.id?700:400}}>{p.name}</div>
                  <div style={{fontSize:13,color:LB3}}>{p.role} · {(p.xp||0).toLocaleString()} pts</div>
                </div>
                {toId===p.id&&<span style={{color:ACC,fontSize:20,fontWeight:700}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
          <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Points to Gift</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[50,100,200,500].map(p=>(
              <button key={p} onClick={()=>setPoints(p)}
                style={{flex:1,padding:"12px",background:points===p?ACC:"rgba(0,0,0,.06)",color:points===p?"#fff":LB2,border:"none",borderRadius:12,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                {p}
              </button>
            ))}
          </div>
          <input value={points} onChange={e=>setPoints(e.target.value)} placeholder="Custom amount" type="number"
            style={{width:"100%",background:"rgba(0,0,0,.04)",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF,borderRadius:12,padding:"12px 14px"}}/>
        </div>
        <div style={{padding:"14px 16px"}}>
          <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Reason</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Outstanding performance! Happy Birthday!…" rows={3}
            style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",lineHeight:1.6,fontFamily:SF}}/>
        </div>
      </div>
      <button onClick={send} disabled={!toId||!points||!reason.trim()||sending}
        className="btn-primary ripple-container" onPointerDown={addRipple}
        style={{width:"100%",background:(!toId||!points||!reason.trim()||sending)?"#e5e5ea":ORG,color:(!toId||!points||!reason.trim()||sending)?LB3:"#fff",border:"none",borderRadius:14,padding:"18px",fontSize:18,fontWeight:700,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        {sending&&<div style={{width:20,height:20,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
        {sending?"Sending Gift…":`🎁 Gift ${points} pts`}
      </button>
    </div>
  );
}

function DashTab({allProfiles,totalPending,pendingVerif,today}){
  const staff=allProfiles.filter(p=>!p.is_admin);
  const checkedIn=staff.filter(p=>p.last_checkin===today).length;
  const Av=({p,size=44})=>(
    <div style={{width:size,height:size,borderRadius:"50%",background:p?.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.32,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {!p?.avatar_url&&(p?.avatar||"?")}
    </div>
  );
  return(
    <div style={{padding:"0 16px 16px"}}>
      <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {[{l:"Total Staff",v:staff.length,i:"👥",c:ACC},{l:"Checked In",v:`${checkedIn}/${staff.length}`,i:"✅",c:"#34c759"},{l:"Pending Actions",v:totalPending,i:"⚠️",c:"#ff9500"},{l:"Verifications",v:pendingVerif,i:"🔒",c:"#ff3b30"}].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:16,padding:"18px"}}>
            <div style={{fontSize:30,marginBottom:10}}>{s.i}</div>
            <div style={{fontSize:32,fontWeight:700,color:s.c,letterSpacing:"-1px",lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:14,color:LB3,marginTop:5}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"18px 4px 10px"}}>🏆 Top Performers</div>
      <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
        {staff.length===0&&<div style={{padding:"16px",fontSize:16,color:LB3}}>No staff yet</div>}
        {staff.slice(0,5).map((s,i)=>{
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<Math.min(staff.length,5)-1?`1px solid ${SEP}`:"none"}}>
              <div style={{fontWeight:700,fontSize:i<3?22:16,color:i<3?ORG:"#8e8e93",width:30,textAlign:"center",flexShrink:0}}>{["🥇","🥈","🥉"][i]||`#${i+1}`}</div>
              <Av p={s}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{fontSize:17,color:LBL,fontWeight:600}}>{s.nickname||s.name}</div>
                  <span style={{fontSize:16}}>{sTier.emoji}</span>
                </div>
                <div style={{fontSize:14,color:LB3}}>{s.role}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:17,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                <div style={{fontSize:12,color:LB3}}>pts</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"18px 4px 10px"}}>📅 Today's Attendance</div>
      <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:40}}>
        {staff.map((s,i)=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:i<staff.length-1?`1px solid ${SEP}`:"none"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:s.last_checkin===today?"#34c759":"#e5e5ea",flexShrink:0}}/>
            <Av p={s} size={36}/>
            <div style={{flex:1}}><div style={{fontSize:16,color:LBL}}>{s.name}</div><div style={{fontSize:13,color:LB3}}>{s.role}</div></div>
            <div style={{fontSize:14,color:s.last_checkin===today?"#34c759":"#ff3b30",fontWeight:600}}>{s.last_checkin===today?"✓ Present":"Absent"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTab({allProfiles,today}){
  const [view,setView]=useState("list");
  const [selected,setSelected]=useState(null);
  const staff=allProfiles.filter(p=>!p.is_admin);
  const Av=({p,size=48})=>(
    <div style={{width:size,height:size,borderRadius:"50%",background:p?.avatar_url?`url(${p.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.32,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {!p?.avatar_url&&(p?.avatar||"?")}
    </div>
  );
  if(selected){
    const days=selected.joined_date_verified&&selected.joined_date?Math.floor((Date.now()-new Date(selected.joined_date))/86400000):null;
    return(
      <div className="page-enter-forward" style={{position:"fixed",inset:0,background:BG,zIndex:100,overflowY:"auto",fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
        <div style={{background:"rgba(242,242,247,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"14px 16px",position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSelected(null)} className="btn" style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:ACC,fontWeight:700,padding:0,fontFamily:SF}}>← Back</button>
          <div style={{flex:1,fontSize:18,fontWeight:700,color:LBL}}>{selected.name}</div>
        </div>
        <div style={{height:130,background:selected.banner_url?`url(${selected.banner_url}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`}}/>
        <div style={{padding:"0 16px",marginTop:-50,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div style={{width:92,height:92,borderRadius:"50%",border:`3px solid ${BG}`,background:selected.avatar_url?`url(${selected.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:28,color:ACC,overflow:"hidden",flexShrink:0}}>
            {!selected.avatar_url&&(selected.avatar||"?")}
          </div>
        </div>
        <div style={{padding:"0 16px 40px"}}>
          <div style={{fontSize:24,fontWeight:700,color:LBL}}>{selected.name}</div>
          {selected.nickname&&<div style={{fontSize:16,color:LB3,marginTop:2}}>"{selected.nickname}"</div>}
          <div style={{fontSize:16,color:ACC,fontWeight:600,marginTop:5}}>{selected.role}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:16,marginBottom:18}}>
            {[{l:"Points",v:(selected.xp||0).toLocaleString(),e:"⚡"},{l:"Streak",v:`${selected.streak||0}d`,e:"🔥"},{l:"Status",v:selected.last_checkin===today?"In":"Out",e:"✅"}].map((s,i)=>(
              <div key={i} style={{background:BG2,borderRadius:14,padding:"14px 8px",textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:5}}>{s.e}</div>
                <div style={{fontSize:17,fontWeight:700,color:ACC}}>{s.v}</div>
                <div style={{fontSize:12,color:LB3,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:16}}>
            {[["💼 Position",selected.role||selected.position],["📧 Email",selected.email],["📱 Contact",selected.contact_number?formatContact(selected.contact_number):null],["⚧ Gender",selected.gender],["🏠 Hometown",selected.hometown],["🎂 Birthday",selected.birthday_verified?fmtDate(selected.birthday):null],["📅 Joined",selected.joined_date_verified?fmtDate(selected.joined_date):null],["⏳ Working",days!==null?`${days.toLocaleString()} days`:null],["🎮 Hobby",selected.hobby],["🍜 Fav Food",selected.favorite_food]].filter(([,v])=>v).map(([label,value],i,a)=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:15,color:LB3,flexShrink:0,marginRight:12}}>{label}</div>
                <div style={{fontSize:15,color:LBL,textAlign:"right",maxWidth:"60%",lineHeight:1.4}}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>🔒 Private</div>
          <div style={{background:`${ACC}08`,borderRadius:16,overflow:"hidden"}}>
            {[{label:"IC Number",value:selected.ic_number,verified:selected.ic_verified},{label:"EPF Number",value:selected.epf_number,verified:selected.epf_verified},{label:"Bank Account",value:selected.bank_account,verified:selected.bank_verified},{label:"Bank Type",value:selected.bank_type,verified:null}].map(({label,value,verified},i,a)=>(
              <div key={label} style={{padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}33`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:14,color:LB3,fontWeight:600}}>{label}</div>
                  {verified!==null&&<span style={{fontSize:12,color:verified?"#34c759":"#ff9500",fontWeight:700,background:(verified?"#34c759":"#ff9500")+"18",padding:"3px 8px",borderRadius:99}}>{verified?"✓ Verified":"⏳ Pending"}</span>}
                </div>
                <div style={{fontSize:16,color:value?LBL:LB3}}>{value||"Not provided"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return(
    <div style={{padding:"0 16px 40px"}}>
      <div className="fade" style={{display:"flex",gap:10,marginBottom:16}}>
        {[["list","Staff List"],["private","Private Info"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} className="btn"
            style={{flex:1,padding:"13px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:14,fontSize:16,fontWeight:view===id?700:400,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>
      {view==="list"&&(
        <div style={{background:BG2,borderRadius:16,overflow:"hidden"}}>
          {staff.length===0&&<div style={{padding:"16px",fontSize:16,color:LB3}}>No staff yet</div>}
          {staff.map((s,i)=>{
            const sTier=getTier(calcScore(s.joined_date,0));
            return(
              <div key={s.id} onClick={()=>setSelected(s)} className="card-press"
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<staff.length-1?`1px solid ${SEP}`:"none",cursor:"pointer"}}>
                <Av p={s}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:17,color:LBL,fontWeight:600}}>{s.name}</div>
                    <span style={{fontSize:16}}>{sTier.emoji}</span>
                  </div>
                  <div style={{fontSize:14,color:LB3}}>{s.role}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:17,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                  <div style={{fontSize:13,color:s.last_checkin===today?"#34c759":"#ff3b30",marginTop:2}}>{s.last_checkin===today?"✓ In":"— Out"}</div>
                </div>
                <div style={{color:LB3,fontSize:20}}>›</div>
              </div>
            );
          })}
        </div>
      )}
      {view==="private"&&(
        <>
          <div style={{background:`${ACC}10`,borderRadius:14,padding:"14px 16px",marginBottom:16,fontSize:15,color:ACC}}>🔒 Tap a staff member to view full details.</div>
          {staff.map(s=>(
            <div key={s.id} onClick={()=>setSelected(s)} className="card-press"
              style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:10,cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${SEP}`}}>
                <Av p={s} size={40}/>
                <div style={{flex:1}}><div style={{fontSize:17,color:LBL,fontWeight:600}}>{s.name}</div><div style={{fontSize:14,color:LB3}}>{s.role}</div></div>
                <div style={{color:LB3,fontSize:20}}>›</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {[["IC",s.ic_number,s.ic_verified],["EPF",s.epf_number,s.epf_verified],["Bank",s.bank_account,s.bank_verified],["Bank Type",s.bank_type,null]].map(([label,val,verified])=>(
                  <div key={label}>
                    <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:3}}>
                      <div style={{fontSize:13,color:LB3}}>{label}</div>
                      {verified!==null&&<span style={{fontSize:11,color:verified?"#34c759":"#ff9500",fontWeight:700}}>{verified?"✓":"?"}</span>}
                    </div>
                    <div style={{fontSize:14,color:val?LBL:LB3}}>{val||"N/A"}</div>
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

function ApprovalsTab({submissions,redemptions,verifReqs,onApproveSubmission,onApproveRedemption,onApproveVerification}){
  const [sec,setSec]=useState("missions");
  const pending=submissions.filter(s=>s.status==="Pending");
  const reviewed=submissions.filter(s=>s.status!=="Pending");
  const pendReds=redemptions.filter(r=>r.status==="Pending");
  const doneReds=redemptions.filter(r=>r.status!=="Pending");
  const pendVerif=verifReqs.filter(v=>v.status==="Pending");
  const doneVerif=verifReqs.filter(v=>v.status!=="Pending");
  const Sb=({status})=>{const c=status==="Pending"?"#ff9500":status==="Approved"?"#34c759":"#ff3b30";return<div style={{background:c+"18",color:c,fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:99,flexShrink:0,whiteSpace:"nowrap"}}>{status}</div>;};
  return(
    <div style={{padding:"0 16px 40px"}}>
      <div className="fade" style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto"}}>
        {[["missions","Submissions",pending.length],["redemptions","Redemptions",pendReds.length],["verif","Verifications",pendVerif.length]].map(([id,label,count])=>(
          <button key={id} onClick={()=>setSec(id)} className="btn"
            style={{flexShrink:0,padding:"11px 16px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:14,fontSize:15,fontWeight:sec===id?700:400,cursor:"pointer",fontFamily:SF}}>
            {label}{count>0&&<span style={{marginLeft:6,background:sec===id?"rgba(255,255,255,.3)":ORG,color:"#fff",fontSize:12,padding:"2px 7px",borderRadius:99,fontWeight:700}}>{count}</span>}
          </button>
        ))}
      </div>
      {sec==="missions"&&(
        <>
          {pending.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:LB3,fontSize:17}}>All clear! 🎉</div>}
          {pending.map(sub=>(
            <div key={sub.id} className="fade" style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{flex:1,marginRight:12}}>
                  <div style={{fontSize:14,color:LB3,marginBottom:4}}>{sub.profiles?.name}</div>
                  <div style={{fontSize:18,color:LBL,fontWeight:600}}>{sub.missions?.title}</div>
                </div>
                <div style={{background:`${ACC}14`,borderRadius:12,padding:"8px 12px",textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:700,color:ACC}}>+{sub.missions?.xp||100}</div>
                  <div style={{fontSize:12,color:LB3}}>pts</div>
                </div>
              </div>
              {sub.submission_text&&<div style={{background:"#f2f2f7",borderRadius:12,padding:"12px 14px",fontSize:15,color:LB2,lineHeight:1.55,marginBottom:12,whiteSpace:"pre-wrap"}}>{sub.submission_text}</div>}
              {sub.submission_image&&<img src={sub.submission_image} alt="proof" style={{width:"100%",borderRadius:12,marginBottom:12,maxHeight:240,objectFit:"cover"}}/>}
              <div style={{fontSize:13,color:LB3,marginBottom:14}}>{new Date(sub.submitted_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>onApproveSubmission(sub,false)} className="btn" style={{flex:1,padding:"14px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>Reject</button>
                <button onClick={()=>onApproveSubmission(sub,true)} className="btn-primary ripple-container" onPointerDown={addRipple} style={{flex:2,padding:"14px",background:"#34c759",color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>Approve ✓</button>
              </div>
            </div>
          ))}
          {reviewed.length>0&&(
            <>
              <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"18px 4px 10px"}}>Previously Reviewed</div>
              <div style={{background:BG2,borderRadius:16,overflow:"hidden"}}>
                {reviewed.slice(0,8).map((s,i,a)=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:16,color:LBL}}>{s.profiles?.name}</div><div style={{fontSize:13,color:LB3}}>{s.missions?.title}</div></div>
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
          {pendReds.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:LB3,fontSize:17}}>No pending redemptions 🎉</div>}
          {pendReds.map(r=>(
            <div key={r.id} className="fade" style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div><div style={{fontSize:14,color:LB3,marginBottom:4}}>{r.profiles?.name}</div><div style={{fontSize:18,color:LBL,fontWeight:600}}>{r.prize_name}</div></div>
                <Sb status={r.status}/>
              </div>
              <div style={{fontSize:13,color:LB3,marginBottom:14}}>{new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
              <button onClick={()=>onApproveRedemption(r.id)} className="btn-primary ripple-container" onPointerDown={addRipple}
                style={{width:"100%",padding:"14px",background:ACC,color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
                Mark Delivered ✓
              </button>
            </div>
          ))}
          {doneReds.length>0&&(
            <>
              <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"18px 4px 10px"}}>Delivered</div>
              <div style={{background:BG2,borderRadius:16,overflow:"hidden"}}>
                {doneReds.slice(0,8).map((r,i,a)=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:16,color:LBL}}>{r.profiles?.name}</div><div style={{fontSize:13,color:LB3}}>{r.prize_name}</div></div>
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
          {pendVerif.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:LB3,fontSize:17}}>No pending verifications 🎉</div>}
          {pendVerif.map(req=>(
            <div key={req.id} className="fade" style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,color:LB3,marginBottom:4}}>{req.profiles?.name} · {req.profiles?.role}</div>
                  <div style={{fontSize:18,color:LBL,fontWeight:600}}>{{"ic_number":"IC Number","epf_number":"EPF Number","bank_account":"Bank Account","position":"Position","joined_date":"Joining Date","birthday":"Birthday"}[req.field_name]||"Information"}</div>
                </div>
                <div style={{background:"#ff950018",color:"#ff9500",fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:99}}>Pending</div>
              </div>
              <div style={{background:"#f2f2f7",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                <div style={{fontSize:17,color:LBL,fontWeight:600}}>{req.field_value}</div>
                {req.extra_value&&<div style={{fontSize:14,color:LB3,marginTop:3}}>{req.extra_value}</div>}
              </div>
              <div style={{fontSize:13,color:LB3,marginBottom:14}}>{new Date(req.submitted_at).toLocaleDateString("en-MY",{day:"numeric",month:"short"})}</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>onApproveVerification(req,false)} className="btn" style={{flex:1,padding:"14px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>Reject</button>
                <button onClick={()=>onApproveVerification(req,true)} className="btn-primary ripple-container" onPointerDown={addRipple} style={{flex:2,padding:"14px",background:"#34c759",color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>Verify ✓</button>
              </div>
            </div>
          ))}
          {doneVerif.length>0&&(
            <>
              <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"18px 4px 10px"}}>Previously Reviewed</div>
              <div style={{background:BG2,borderRadius:16,overflow:"hidden"}}>
                {doneVerif.slice(0,8).map((v,i,a)=>(
                  <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                    <div style={{flex:1}}><div style={{fontSize:16,color:LBL}}>{v.profiles?.name}</div><div style={{fontSize:13,color:LB3}}>{v.field_name.replace(/_/g," ")}</div></div>
                    <div style={{background:v.status==="Approved"?"#34c75918":"#ff3b3018",color:v.status==="Approved"?"#34c759":"#ff3b30",fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:99}}>{v.status}</div>
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

function ContentTab({missions,announcements,prizes,allProfiles,onAddMission,onDeleteMission,onAddAnn,onDeleteAnn,onTogglePin,onAddPrize,onGift}){
  const [sec,setSec]=useState("missions");
  const [mForm,setMForm]=useState({title:"",description:"",xp:150,category:"",due_date:null,completion_type:"once_per_user",max_completions:1});
  const [aForm,setAForm]=useState({title:"",body:"",pinned:false});
  const [pForm,setPForm]=useState({name:"",cost:"500",stock:"10",icon:"",desc:""});
  const [addingPrize,setAddingPrize]=useState(false);
  const canAddMission=mForm.title.trim()&&mForm.category&&mForm.due_date;
  const COMPLETION_TYPES=[
    {value:"once_per_user",label:"Once Per User",desc:"Each user can complete once"},
    {value:"unlimited",    label:"Unlimited",    desc:"Users can complete multiple times"},
    {value:"once_total",   label:"Once Total",   desc:"Only one user can complete it"},
  ];
  return(
    <div style={{padding:"0 16px 16px"}}>
      <div className="fade" style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto"}}>
        {[["missions","🎯 Missions"],["announcements","📢 Announce"],["prizes","🎁 Prizes"],["gifts","💝 Gift"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSec(id)} className="btn"
            style={{flexShrink:0,padding:"11px 14px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:14,fontSize:14,fontWeight:sec===id?700:400,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      {sec==="missions"&&(
        <>
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Title <span style={{color:"#ff3b30"}}>*</span></div>
              <input value={mForm.title} onChange={e=>setMForm(p=>({...p,title:e.target.value}))} placeholder="Mission title"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Description</div>
              <textarea value={mForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="What needs to be done…" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF,lineHeight:1.5}}/>
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Category <span style={{color:"#ff3b30"}}>*</span></div>
              <div style={{position:"relative"}}>
                <select value={mForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))}
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:mForm.category?LBL:LB3,appearance:"none",WebkitAppearance:"none",paddingRight:24,cursor:"pointer",fontFamily:SF}}>
                  <option value="" disabled>-- Please Select --</option>
                  {MISSION_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",fontSize:16,color:LB3,pointerEvents:"none"}}>▾</div>
              </div>
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Reward Points</div>
              <input value={mForm.xp} onChange={e=>setMForm(p=>({...p,xp:e.target.value}))} placeholder="150" type="number"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Completion Limit</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {COMPLETION_TYPES.map(ct=>(
                  <button key={ct.value} onClick={()=>setMForm(p=>({...p,completion_type:ct.value}))}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:mForm.completion_type===ct.value?`${ACC}10`:"rgba(0,0,0,.04)",border:mForm.completion_type===ct.value?`2px solid ${ACC}`:"2px solid transparent",borderRadius:12,cursor:"pointer",textAlign:"left",fontFamily:SF}}>
                    <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${mForm.completion_type===ct.value?ACC:"#ccc"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {mForm.completion_type===ct.value&&<div style={{width:12,height:12,borderRadius:"50%",background:ACC}}/>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,color:LBL,fontWeight:mForm.completion_type===ct.value?700:400}}>{ct.label}</div>
                      <div style={{fontSize:12,color:LB3,marginTop:2}}>{ct.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{padding:"14px 16px"}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Due Date <span style={{color:"#ff3b30"}}>*</span></div>
              <DatePicker selected={mForm.due_date} onChange={date=>setMForm(p=>({...p,due_date:date}))} dateFormat="dd/MM/yyyy" placeholderText="DD/MM/YYYY" minDate={new Date()} showMonthDropdown showYearDropdown dropdownMode="select"
                customInput={<input readOnly placeholder="DD/MM/YYYY" style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,cursor:"pointer",fontFamily:SF}}/>}/>
              {mForm.due_date&&<div style={{fontSize:13,color:ACC,marginTop:6,fontWeight:600}}>📅 {mForm.due_date.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>}
            </div>
          </div>
          <button onClick={()=>{
            if(!canAddMission)return;
            const dueDateISO=mForm.due_date?mForm.due_date.toISOString().split("T")[0]:null;
            onAddMission({title:mForm.title,description:mForm.description,xp:+mForm.xp,category:mForm.category,due_date:dueDateISO,completion_type:mForm.completion_type,max_completions:mForm.max_completions,completion_count:0});
            setMForm({title:"",description:"",xp:150,category:"",due_date:null,completion_type:"once_per_user",max_completions:1});
          }}
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",background:canAddMission?ACC:"#e5e5ea",color:canAddMission?"#fff":LB3,border:"none",borderRadius:16,padding:"18px",fontSize:18,fontWeight:700,cursor:canAddMission?"pointer":"default",fontFamily:SF,marginBottom:8}}>
            Post Campaign Mission
          </button>
          {!canAddMission&&(mForm.title||mForm.category||mForm.due_date)&&<div style={{fontSize:14,color:"#ff9500",textAlign:"center",marginBottom:14,fontWeight:600}}>⚠️ Please fill in Title, Category and Due Date</div>}
          <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"8px 4px 10px"}}>Active Missions ({missions.length})</div>
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:40}}>
            {missions.length===0&&<div style={{padding:"16px",fontSize:16,color:LB3}}>No missions yet</div>}
            {missions.map((m,i)=>{
              const ct=m.completion_type==="once_total"?"1 Winner":m.completion_type==="unlimited"?"Unlimited":"Once/User";
              return(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<missions.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,color:LBL,fontWeight:600}}>{m.title}</div>
                    <div style={{fontSize:13,color:LB3,marginTop:3}}>{m.category} · {m.xp} pts · {ct}{m.due_date?` · Due ${fmtDate(m.due_date)}`:""}</div>
                  </div>
                  <button onClick={()=>onDeleteMission(m.id)} className="btn" style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:10,padding:"8px 12px",fontSize:14,cursor:"pointer",fontFamily:SF,flexShrink:0}}>Remove</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sec==="announcements"&&(
        <>
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Title</div>
              <input value={aForm.title} onChange={e=>setAForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Body</div>
              <textarea value={aForm.body} onChange={e=>setAForm(p=>({...p,body:e.target.value}))} placeholder="Write your announcement…" rows={4}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF,lineHeight:1.6}}/>
            </div>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:17,color:LBL}}>📌 Pin to top</div>
                <div onClick={()=>setAForm(p=>({...p,pinned:!p.pinned}))} style={{width:54,height:32,borderRadius:99,background:aForm.pinned?ACC:"#e5e5ea",position:"relative",cursor:"pointer",transition:"background .2s"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:aForm.pinned?24:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
                </div>
              </div>
            </div>
          </div>
          <button onClick={()=>{if(aForm.title.trim()){onAddAnn(aForm);setAForm({title:"",body:"",pinned:false});}}}
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",background:aForm.title.trim()?ACC:"#e5e5ea",color:aForm.title.trim()?"#fff":LB3,border:"none",borderRadius:16,padding:"18px",fontSize:18,fontWeight:700,cursor:aForm.title.trim()?"pointer":"default",fontFamily:SF,marginBottom:18}}>
            Post Announcement
          </button>
          {announcements.map(a=>(
            <div key={a.id} style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:10,borderLeft:a.pinned?`4px solid ${ORG}`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1,marginRight:10}}>
                  {a.pinned&&<div style={{fontSize:13,color:ORG,fontWeight:700,marginBottom:5}}>📌 Pinned</div>}
                  <div style={{fontSize:17,color:LBL,fontWeight:600}}>{a.title}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>onTogglePin(a)} className="btn" style={{background:`${ORG}18`,color:ORG,border:"none",borderRadius:10,padding:"7px 12px",fontSize:14,cursor:"pointer",fontFamily:SF}}>{a.pinned?"Unpin":"Pin"}</button>
                  <button onClick={()=>onDeleteAnn(a.id)} className="btn" style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:10,padding:"7px 12px",fontSize:14,cursor:"pointer",fontFamily:SF}}>Delete</button>
                </div>
              </div>
              {a.body&&<div style={{fontSize:15,color:LB3,lineHeight:1.6,whiteSpace:"pre-line"}}>{a.body}</div>}
            </div>
          ))}
          <div style={{height:40}}/>
        </>
      )}

      {sec==="prizes"&&(
        <>
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Prize Name</div>
              <input value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value,icon:autoIcon(e.target.value)}))} placeholder="e.g. Bubble Tea Voucher"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
              {pForm.name&&<div style={{fontSize:13,color:ACC,marginTop:5,fontWeight:600}}>Auto icon: {pForm.icon||autoIcon(pForm.name)}</div>}
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Description</div>
              <input value={pForm.desc} onChange={e=>setPForm(p=>({...p,desc:e.target.value}))} placeholder="Short description"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Icon (auto-filled, editable)</div>
              <input value={pForm.icon} onChange={e=>setPForm(p=>({...p,icon:e.target.value}))} placeholder="🎁"
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:32,color:LBL,fontFamily:SF}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{padding:"14px 16px",borderRight:`1px solid ${SEP}`}}>
                <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Points Cost</div>
                <input value={pForm.cost} onChange={e=>setPForm(p=>({...p,cost:e.target.value}))} type="number" placeholder="500"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Stock</div>
                <input value={pForm.stock} onChange={e=>setPForm(p=>({...p,stock:e.target.value}))} type="number" placeholder="10"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:18,color:LBL,fontFamily:SF}}/>
              </div>
            </div>
          </div>
          <button
            disabled={addingPrize||!pForm.name.trim()||!pForm.cost||!pForm.stock}
            onClick={async()=>{
              if(!pForm.name.trim()||addingPrize)return;
              setAddingPrize(true);
              const costNum=parseInt(pForm.cost,10)||0;
              const stockNum=parseInt(pForm.stock,10)||0;
              const icon=pForm.icon||autoIcon(pForm.name);
              await onAddPrize({name:pForm.name.trim(),desc:pForm.desc||"",icon,cost:costNum,pts:costNum,stock:stockNum});
              setPForm({name:"",cost:"500",stock:"10",icon:"",desc:""});
              setAddingPrize(false);
            }}
            className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",background:(addingPrize||!pForm.name.trim())?"#e5e5ea":ACC,color:(addingPrize||!pForm.name.trim())?LB3:"#fff",border:"none",borderRadius:16,padding:"18px",fontSize:18,fontWeight:700,cursor:(addingPrize||!pForm.name.trim())?"default":"pointer",fontFamily:SF,marginBottom:18,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {addingPrize&&<div style={{width:20,height:20,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
            {addingPrize?"Adding Prize…":"Add Prize"}
          </button>
          <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"0 4px 10px"}}>Active Prizes ({prizes.length})</div>
          <div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:40}}>
            {prizes.length===0&&<div style={{padding:"16px",fontSize:16,color:LB3}}>No prizes yet</div>}
            {prizes.map((p,i)=>(
              <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<prizes.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{fontSize:34}}>{p.icon||autoIcon(p.name||"")}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,color:LBL,fontWeight:600}}>{p.name}</div>
                  <div style={{fontSize:13,color:LB3}}>{p.stock??0} left · {(p.pts||p.cost||0).toLocaleString()} pts</div>
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

function CommunityTab({allProfiles}){
  const [messages,setMessages]=useState([]);
  const bottomRef=useRef(null);
  useEffect(()=>{loadMsgs();const iv=setInterval(loadMsgs,4000);return()=>clearInterval(iv);},[]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const loadMsgs=async()=>{
    const{data}=await supabase.from("messages").select("*, sender:user_id(avatar_url,avatar)").eq("is_dm",false).order("created_at",{ascending:true}).limit(100);
    if(data)setMessages(data);
  };
  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 170px)"}}>
      <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 16px",margin:"0 16px 10px",fontSize:15,color:ACC,fontWeight:600,flexShrink:0}}>
        👁️ Monitor Mode — view only
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:16}}>No messages yet 👋</div>}
        {messages.map(msg=>{
          if(msg.is_system)return(<div key={msg.id} style={{textAlign:"center"}}><div style={{display:"inline-block",background:`${ACC}10`,borderRadius:14,padding:"10px 16px",fontSize:14,color:ACC,lineHeight:1.55,maxWidth:"88%"}}>{msg.content}</div></div>);
          const avatarUrl=msg.sender?.avatar_url||msg.sender_avatar_url||"";
          return(
            <div key={msg.id} style={{display:"flex",alignItems:"flex-end",gap:10}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:avatarUrl?`url(${avatarUrl}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden",border:`2px solid ${BG2}`}}>
                {!avatarUrl&&(msg.sender?.avatar||"?")}
              </div>
              <div style={{maxWidth:"75%"}}>
                <div style={{fontSize:13,color:LB3,marginBottom:4,paddingLeft:4}}>{msg.sender_name}</div>
                <div style={{background:BG2,borderRadius:"18px 18px 18px 4px",padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <div style={{fontSize:16,color:LBL,lineHeight:1.45,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                </div>
                <div style={{fontSize:12,color:LB3,marginTop:4,paddingLeft:4}}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
    </div>
  );
}

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
    const ch=supabase.channel("admin_rt_v3")
      .on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"mission_submissions"},()=>loadAll())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"redemptions"},()=>loadAll())
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"redemptions"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"verification_requests"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"mission_claims"},()=>loadAll())
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
  const totalPending=submissions.filter(s=>s.status==="Pending").length+redemptions.filter(r=>r.status==="Pending").length+verifReqs.filter(v=>v.status==="Pending").length;
  const pendingVerifCount=verifReqs.filter(v=>v.status==="Pending").length;

  const notifyAll=async(title,body,type="info")=>{
    const nonAdmins=allProfiles.filter(p=>!p.is_admin);
    if(nonAdmins.length===0)return;
    try{await supabase.from("notifications").insert(nonAdmins.map(p=>({user_id:p.id,title,body,type})));}
    catch(e){console.warn("notifyAll:",e);}
  };

  const approveSubmission=async(sub,approve)=>{
    const status=approve?"Approved":"Rejected";
    setSubmissions(p=>p.map(s=>s.id===sub.id?{...s,status}:s));
    await supabase.from("mission_submissions").update({status,reviewed_at:new Date().toISOString()}).eq("id",sub.id);
    if(approve){
      let claimId=sub.claim_id;
      if(!claimId){try{const{data:cl}=await supabase.from("mission_claims").select("id").eq("user_id",sub.user_id).eq("mission_id",sub.mission_id||sub.missions?.id).maybeSingle();claimId=cl?.id;}catch(e){console.warn(e);}}
      if(claimId){try{await supabase.from("mission_claims").update({completed:true,submitted:true,status:"completed"}).eq("id",claimId);}catch(e){console.warn(e);}}
      const prof=allProfiles.find(p=>p.id===sub.user_id);
      const pts=sub.missions?.xp||100;
      let currentXp=0;
      try{const{data:fp}=await supabase.from("profiles").select("xp").eq("id",sub.user_id).single();currentXp=fp?.xp||0;}
      catch(e){currentXp=prof?.xp||0;}
      const newXp=currentXp+pts;
      setAllProfiles(p=>p.map(x=>x.id===sub.user_id?{...x,xp:newXp}:x));
      try{await supabase.from("profiles").update({xp:newXp}).eq("id",sub.user_id);}catch(e){console.warn(e);}
      try{await supabase.from("points_history").insert({user_id:sub.user_id,amount:pts,reason:`Mission completed: ${sub.missions?.title}`,type:"credit"});}catch(e){console.warn(e);}
      try{const{data:mc}=await supabase.from("missions").select("completion_count").eq("id",sub.mission_id||sub.missions?.id).single();if(mc)await supabase.from("missions").update({completion_count:(mc.completion_count||0)+1}).eq("id",sub.mission_id||sub.missions?.id);}catch(e){console.warn(e);}
      const annTitle=`🎯 ${prof?.nickname||prof?.name} completed a mission!`;
      const annBody=`${prof?.nickname||prof?.name} completed "${sub.missions?.title}" and earned ${pts} pts!`;
      try{const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();if(newAnn)setAnnouncements(p=>[newAnn,...p]);}catch(e){console.warn(e);}
      await notifyAll(annTitle,annBody,"mission");
      try{await supabase.from("notifications").insert({user_id:sub.user_id,title:"✅ Mission Approved!",body:`+${pts} pts added for completing "${sub.missions?.title}"\nNew balance: ${newXp.toLocaleString()} pts`,type:"approval"});}catch(e){console.warn(e);}
    } else {
      try{await supabase.from("notifications").insert({user_id:sub.user_id,title:"❌ Mission Not Approved",body:`Your submission for "${sub.missions?.title}" was rejected. Please try again.`,type:"rejection"});}catch(e){console.warn(e);}
    }
    showToast(approve?"✅ Approved! Points awarded.":"❌ Rejected.");
  };

  const approveRedemption=async id=>{
    setRedemptions(p=>p.map(r=>r.id===id?{...r,status:"Approved"}:r));
    const red=redemptions.find(r=>r.id===id);
    await supabase.from("redemptions").update({status:"Approved"}).eq("id",id);
    if(red){
      try{await supabase.from("notifications").insert({user_id:red.user_id,title:"🎁 Prize Delivered!",body:`Your "${red.prize_name}" has been delivered. Enjoy!`,type:"redemption"});}catch(e){console.warn(e);}
      const prof=allProfiles.find(p=>p.id===red.user_id);
      const annTitle=`🎁 ${prof?.nickname||prof?.name} redeemed a prize!`;
      const annBody=`${prof?.nickname||prof?.name} just received "${red.prize_name}". Congratulations! 🎉`;
      try{const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();if(newAnn)setAnnouncements(p=>[newAnn,...p]);}catch(e){console.warn(e);}
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
      try{await supabase.from("profiles").update(update).eq("id",req.user_id);}catch(e){console.warn(e);}
      const fieldLabel={"ic_number":"IC Number","epf_number":"EPF Number","bank_account":"Bank Account","position":"Position","joined_date":"Joining Date","birthday":"Birthday"}[req.field_name]||req.field_name;
      try{await supabase.from("notifications").insert({user_id:req.user_id,title:"✅ Information Verified!",body:`Your ${fieldLabel} has been verified.`,type:"verification"});}catch(e){console.warn(e);}
    } else {
      const fieldLabel={"ic_number":"IC Number","epf_number":"EPF Number","bank_account":"Bank Account","position":"Position","joined_date":"Joining Date","birthday":"Birthday"}[req.field_name]||req.field_name;
      try{await supabase.from("notifications").insert({user_id:req.user_id,title:"❌ Verification Failed",body:`Your ${fieldLabel} could not be verified. Please check and resubmit.`,type:"rejection"});}catch(e){console.warn(e);}
    }
    showToast(approve?"✅ Verified!":"❌ Rejected.");
  };

  const giftPoints=async(toId,points,reason)=>{
    const recipient=allProfiles.find(p=>p.id===toId);
    if(!recipient){showToast("❌ Staff not found");return;}
    try{
      const{data:fp,error:fetchErr}=await supabase.from("profiles").select("xp").eq("id",toId).single();
      if(fetchErr)throw new Error("Could not fetch points: "+fetchErr.message);
      const currentXp=fp?.xp||0;
      const newXp=currentXp+points;
      const{error:updateErr}=await supabase.from("profiles").update({xp:newXp}).eq("id",toId);
      if(updateErr)throw new Error(updateErr.message);
      setAllProfiles(p=>p.map(x=>x.id===toId?{...x,xp:newXp}:x));
      try{await supabase.from("points_history").insert({user_id:toId,amount:points,reason:`Gift from admin: ${reason}`,type:"credit"});}catch(e){console.warn(e);}
      try{await supabase.from("point_gifts").insert({from_id:profile.id,to_id:toId,points,reason});}catch(e){console.warn(e);}
      const annTitle=`🎁 ${recipient.nickname||recipient.name} received a gift!`;
      const annBody=`${recipient.nickname||recipient.name} has been gifted ${points.toLocaleString()} pts!\n\nReason: ${reason}`;
      try{const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"Admin"}).select().single();if(newAnn)setAnnouncements(p=>[newAnn,...p]);}catch(e){console.warn(e);}
      const{error:notifErr}=await supabase.from("notifications").insert({user_id:toId,title:"🎁 You received a gift!",body:`You've been gifted ${points.toLocaleString()} pts!\n\nReason: ${reason}\n\nNew balance: ${newXp.toLocaleString()} pts`,type:"gift"});
      if(notifErr)console.warn(notifErr.message);
      const others=allProfiles.filter(p=>!p.is_admin&&p.id!==toId);
      if(others.length>0){try{await supabase.from("notifications").insert(others.map(p=>({user_id:p.id,title:annTitle,body:annBody,type:"gift"})));}catch(e){console.warn(e);}}
      await loadAll();
      showToast(`🎁 Gifted ${points} pts to ${recipient.name}! Total: ${newXp.toLocaleString()} pts`);
    }catch(err){
      console.error("Gift error:",err);
      showToast("❌ Failed — "+err.message);
    }
  };

  // ── FIXED addPrize — explicit field mapping, no spread ──
  const addPrize=async(pForm)=>{
    try{
      const icon=pForm.icon||autoIcon(pForm.name||"");
      const costNum=parseInt(pForm.cost,10)||0;
      const stockNum=parseInt(pForm.stock,10)||0;
      const insertData={
        name:String(pForm.name||"").trim(),
        desc:String(pForm.desc||""),
        icon:String(icon),
        cost:costNum,
        pts:costNum,
        stock:stockNum,
        active:true,
      };
      console.log("Adding prize:",insertData);
      const{data,error}=await supabase.from("prizes").insert(insertData).select().single();
      if(error){
        console.error("Prize insert error:",error);
        showToast("❌ Prize error: "+error.message);
        return;
      }
      if(data)setPrizes(p=>[...p,data]);
      showToast("Prize added ✅");
    }catch(e){
      console.error("Prize exception:",e);
      showToast("❌ Failed to add prize");
    }
  };

  const addMission=async(mForm)=>{
    const{data}=await supabase.from("missions").insert({...mForm,xp:+mForm.xp,active:true}).select().single();
    if(data){
      setMissions(p=>[...p,data]);
      const ct=mForm.completion_type==="once_total"?"Only 1 winner!":mForm.completion_type==="unlimited"?"Unlimited":"Once per user";
      const annTitle=`🎯 New Mission: ${mForm.title}`;
      const annBody=`A new campaign mission is live!\n\n"${mForm.title}"\nEarn ${mForm.xp} pts | ${ct}\nDue: ${fmtDate(mForm.due_date)}`;
      try{const{data:newAnn}=await supabase.from("announcements").insert({title:annTitle,body:annBody,pinned:false,author:"System"}).select().single();if(newAnn)setAnnouncements(p=>[newAnn,...p]);}catch(e){console.warn(e);}
      await notifyAll(annTitle,annBody,"mission");
    }
    showToast("Campaign mission posted ✅");
  };

  const deleteMission=async id=>{setMissions(p=>p.filter(m=>m.id!==id));await supabase.from("missions").update({active:false}).eq("id",id);showToast("Mission removed");};
  const addAnn=async(aForm)=>{const{data}=await supabase.from("announcements").insert({...aForm,author:"Admin"}).select().single();if(data){setAnnouncements(p=>[data,...p]);await notifyAll(`📢 ${aForm.title}`,aForm.body||"","announcement");}showToast("Announcement posted ✅");};
  const deleteAnn=async id=>{setAnnouncements(p=>p.filter(a=>a.id!==id));await supabase.from("announcements").delete().eq("id",id);showToast("Deleted");};
  const togglePin=async ann=>{const pinned=!ann.pinned;setAnnouncements(p=>p.map(a=>a.id===ann.id?{...a,pinned}:a));await supabase.from("announcements").update({pinned}).eq("id",ann.id);};

  const TABS=[
    {id:"dash",      label:"Dashboard",emoji:"📊"},
    {id:"staff",     label:"Staff",    emoji:"👥"},
    {id:"approvals", label:"Approvals",emoji:"📋",badge:totalPending},
    {id:"content",   label:"Content",  emoji:"✏️"},
    {id:"community", label:"Community",emoji:"💬"},
  ];

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:"rgba(242,242,247,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"14px 16px 12px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:34,height:34,borderRadius:8,objectFit:"cover"}}/>
            <div style={{fontSize:18,fontWeight:700,color:LBL}}>Admin Panel</div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} className="btn" style={{fontSize:14,color:"#ff3b30",fontWeight:600,background:"rgba(255,59,48,.1)",padding:"6px 12px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:SF}}>Sign Out</button>
        </div>
        <div style={{fontSize:24,fontWeight:700,color:LBL,letterSpacing:"-.5px"}}>
          {tab==="dash"&&"Dashboard 📊"}{tab==="staff"&&"Staff 👥"}{tab==="approvals"&&"Approvals 📋"}{tab==="content"&&"Content ✏️"}{tab==="community"&&"Community 💬"}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 0 110px"}}>
        {tab==="dash"     &&<DashTab allProfiles={allProfiles} totalPending={totalPending} pendingVerif={pendingVerifCount} today={today}/>}
        {tab==="staff"    &&<StaffTab allProfiles={allProfiles} today={today}/>}
        {tab==="approvals"&&<ApprovalsTab submissions={submissions} redemptions={redemptions} verifReqs={verifReqs} onApproveSubmission={approveSubmission} onApproveRedemption={approveRedemption} onApproveVerification={approveVerification}/>}
        {tab==="content"  &&<ContentTab missions={missions} announcements={announcements} prizes={prizes} allProfiles={staff} onAddMission={addMission} onDeleteMission={deleteMission} onAddAnn={addAnn} onDeleteAnn={deleteAnn} onTogglePin={togglePin} onAddPrize={addPrize} onGift={giftPoints}/>}
        {tab==="community"&&<CommunityTab allProfiles={allProfiles}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(249,249,249,.96)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,.1)",display:"flex",zIndex:20,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="tab-btn"
            style={{flex:1,padding:"10px 2px 14px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
            <div style={{fontSize:tab===t.id?28:24,lineHeight:1,filter:tab===t.id?"none":"grayscale(1) opacity(.35)",transition:"font-size .2s cubic-bezier(.34,1.56,.64,1)"}}>{t.emoji}</div>
            <div style={{fontSize:11,fontWeight:tab===t.id?700:400,color:tab===t.id?ACC:"#8e8e93",fontFamily:SF}}>{t.label}</div>
            {t.badge>0&&<div style={{position:"absolute",top:6,right:"8%",minWidth:18,height:18,background:"#ff3b30",borderRadius:99,fontSize:10,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{t.badge}</div>}
          </button>
        ))}
      </div>
      {toast&&<div className="toast-in" style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.82)",backdropFilter:"blur(16px)",borderRadius:99,padding:"12px 24px",fontSize:15,color:"#fff",fontWeight:600,whiteSpace:"nowrap",zIndex:50,pointerEvents:"none",maxWidth:"88vw",textAlign:"center"}}>{toast}</div>}
    </div>
  );
}
