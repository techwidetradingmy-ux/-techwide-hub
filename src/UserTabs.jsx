import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import CircleCrop from"./CircleCrop";
import{PRIZES,getTier,calcScore,formatContact,normalizeContact,validateContact,formatIC,getICDigits,BANK_TYPES,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}from"./constants";

const DIFF_C={Easy:"#34c759",Medium:"#ff9500",Hard:"#ff3b30"};
const CAT_C={Sales:"#5856d6",Teamwork:"#007aff",Admin:"#af52de",Creativity:"#ff2d55"};

// ── HELPERS ───────────────────────────────────────────────────────────
const fmtDate=iso=>{
  if(!iso)return null;
  const p=iso.split("-");
  if(p.length===3)return`${p[2]}/${p[1]}/${p[0]}`;
  return iso;
};
const calcAge=birthday=>{
  if(!birthday)return null;
  const birth=new Date(birthday);
  const today=new Date();
  let age=today.getFullYear()-birth.getFullYear();
  const m=today.getMonth()-birth.getMonth();
  if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;
  return age;
};
const calcDaysWorking=joinedDate=>{
  if(!joinedDate)return null;
  return Math.floor((Date.now()-new Date(joinedDate))/86400000);
};

// ── USER PROFILE MODAL ────────────────────────────────────────────────
function UserProfileModal({user,currentUserId,onClose,onDM}){
  const age=user.birthday_verified&&user.birthday?calcAge(user.birthday):null;
  const daysWorking=user.joined_date_verified&&user.joined_date?calcDaysWorking(user.joined_date):null;
  const tier=getTier(calcScore(user.joined_date,0));

  const rows=[
    ["💼 Position",     user.role||user.position],
    ["🎂 Age",          age?`${age} years old`:null],
    ["⚧ Gender",        user.gender||null],
    ["🏠 Home Town",    user.hometown||null],
    ["📱 Contact",      user.contact_number?formatContact(user.contact_number):null],
    ["📧 Email",        user.email||null],
    ["📅 Joined",       user.joined_date_verified?fmtDate(user.joined_date):null],
    ["⏳ Been Working", daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎂 Birthday",     user.birthday_verified?fmtDate(user.birthday):null],
    ["🎮 Hobby",        user.hobby||null],
    ["🍜 Fav Food",     user.favorite_food||null],
  ].filter(([,v])=>v);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:BG,borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",paddingBottom:40}}>
        {/* Banner */}
        <div style={{height:110,background:user.banner_url?`url(${user.banner_url}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:"20px 20px 0 0",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.45)",color:"#fff",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:SF}}>✕</button>
        </div>
        {/* Avatar */}
        <div style={{padding:"0 16px",marginTop:-46,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div style={{width:80,height:80,borderRadius:"50%",border:`3px solid ${BG}`,background:user.avatar_url?`url(${user.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:22,color:ACC,overflow:"hidden"}}>
            {!user.avatar_url&&(user.avatar||"?")}
          </div>
          {currentUserId!==user.id&&(
            <button onClick={()=>{onDM(user);onClose();}} style={{background:ACC,color:"#fff",border:"none",borderRadius:99,padding:"9px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
              💬 Message
            </button>
          )}
        </div>
        <div style={{padding:"0 16px 16px"}}>
          <div style={{fontSize:22,fontWeight:700,color:LBL,letterSpacing:"-.5px"}}>{user.nickname||user.name}</div>
          {user.nickname&&<div style={{fontSize:14,color:LB3,marginTop:1}}>{user.name}</div>}
          <div style={{display:"inline-flex",alignItems:"center",gap:5,background:tier.color+"18",borderRadius:99,padding:"3px 10px",marginTop:8,marginBottom:10}}>
            <span>{tier.emoji}</span><span style={{fontSize:12,color:tier.color,fontWeight:700}}>{tier.name}</span>
          </div>
          {user.bio&&<div style={{fontSize:14,color:LB2,lineHeight:1.6,marginBottom:16}}>{user.bio}</div>}
          {rows.length>0&&(
            <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
              {rows.map(([label,value],i)=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<rows.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:14,color:LB3}}>{label}</div>
                  <div style={{fontSize:14,color:LBL,textAlign:"right",maxWidth:"60%"}}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MISSIONS TAB ──────────────────────────────────────────────────────
export function MissionsTab({profile,missions,myClaims,setMyClaims,doClaimMission,showToast,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [f,setF]=useState("All");
  const [submitting,setSubmitting]=useState(null);
  const [subText,setSubText]=useState("");
  const [subImg,setSubImg]=useState(null);
  const [subLoading,setSubLoading]=useState(false);
  const cats=["All","Sales","Teamwork","Admin","Creativity"];
  const list=f==="All"?missions:missions.filter(m=>m.category===f);

  const handleImg=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>setSubImg(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitProof=async claim=>{
    if(!subText.trim()&&!subImg){showToast("Please add text or photo proof");return;}
    setSubLoading(true);
    const{error}=await supabase.from("mission_submissions").insert({
      user_id:profile.id,mission_id:claim.mission_id,claim_id:claim.id,
      submission_text:subText,submission_image:subImg,status:"Pending",
    });
    if(!error){
      await supabase.from("mission_claims").update({submitted:true}).eq("id",claim.id);
      const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
      if(data)setMyClaims(data);
      showToast("Proof submitted! Awaiting admin approval 🎉");
      setSubmitting(null);setSubText("");setSubImg(null);
    }
    setSubLoading(false);
  };

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}} className="fade">
        {cats.map(c=>(
          <button key={c} onClick={()=>setF(c)} style={{flexShrink:0,padding:"6px 15px",borderRadius:99,fontSize:14,fontWeight:f===c?600:400,background:f===c?ACC:"rgba(0,0,0,.06)",color:f===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>{c}</button>
        ))}
      </div>
      {list.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No missions yet</div>}
      {list.map(m=>{
        const claim=myClaims.find(c=>c.mission_id===m.id);
        const done=claim?.completed,submitted=claim?.submitted;
        const isSubForm=submitting?.id===claim?.id;
        return(
          <div key={m.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,opacity:done?.65:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,marginRight:12}}>
                <div style={{fontSize:17,color:done?LB3:LBL,fontWeight:500,letterSpacing:"-.35px",textDecoration:done?"line-through":"none",marginBottom:3}}>{m.title}</div>
                <div style={{fontSize:14,color:LB3,lineHeight:1.45}}>{m.description}</div>
              </div>
              <div style={{background:`${ACC}14`,borderRadius:9,padding:"6px 10px",textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:17,fontWeight:700,color:ACC,lineHeight:1}}>+{m.xp}</div>
                <div style={{fontSize:10,color:LB3}}>pts</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <Chip color={CAT_C[m.category]||"#8e8e93"}>{m.category}</Chip>
              <Chip color={DIFF_C[m.difficulty]||"#8e8e93"}>{m.difficulty}</Chip>
              <Chip color="#8e8e93">{m.period}</Chip>
            </div>
            {done?(
              <div style={{fontSize:14,color:"#34c759",fontWeight:600}}>✓ Completed & Approved</div>
            ):submitted?(
              <div style={{fontSize:14,color:"#ff9500",fontWeight:600}}>⏳ Proof submitted — pending approval</div>
            ):isSubForm?(
              <div style={{borderTop:`1px solid ${SEP}`,paddingTop:12}}>
                <div style={{fontSize:12,color:LB3,fontWeight:700,textTransform:"uppercase",letterSpacing:".3px",marginBottom:10}}>Submit Proof</div>
                <textarea value={subText} onChange={e=>setSubText(e.target.value)} placeholder="Describe what you did…" rows={3}
                  style={{width:"100%",background:"#f2f2f7",border:"none",outline:"none",borderRadius:10,padding:"10px 12px",fontSize:15,color:LBL,resize:"none",fontFamily:SF,marginBottom:8}}/>
                <div onClick={()=>document.getElementById(`img_${m.id}`).click()} style={{border:`1.5px dashed ${subImg?"transparent":SEP}`,borderRadius:10,padding:subImg?"0":"14px",textAlign:"center",cursor:"pointer",marginBottom:8,overflow:"hidden",background:subImg?`url(${subImg}) center/cover`:"transparent",minHeight:subImg?120:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {!subImg&&<div style={{fontSize:13,color:LB3}}>📷 Attach image (optional)</div>}
                </div>
                <input id={`img_${m.id}`} type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setSubmitting(null);setSubText("");setSubImg(null);}} style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",borderRadius:10,fontSize:15,color:LB2,border:"none",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                  <button onClick={()=>submitProof(claim)} disabled={subLoading} style={{flex:2,padding:"10px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>{subLoading?"Submitting…":"Submit Proof"}</button>
                </div>
              </div>
            ):claim?(
              <div style={{display:"flex",gap:8}}>
                <button style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",borderRadius:10,fontSize:15,color:LB2,border:"none",cursor:"default",fontFamily:SF}}>Claimed ✓</button>
                <button onClick={()=>setSubmitting(claim)} style={{flex:1,padding:"10px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>Submit Proof</button>
              </div>
            ):(
              <button className="btn-primary" onClick={()=>doClaimMission(m.id)} style={{width:"100%",padding:"11px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>Claim Mission</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── LEADERBOARD TAB ───────────────────────────────────────────────────
export function LeaderboardTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,getLevel,getLvlPct,getTier,calcScore,Section,setDmTarget}){
  const [viewUser,setViewUser]=useState(null);
  // Filter out admins
  const ranked=allProfiles.filter(s=>!s.is_admin);

  return(
    <div style={{padding:"0 16px 12px"}}>
      {viewUser&&(
        <UserProfileModal
          user={viewUser}
          currentUserId={profile.id}
          onClose={()=>setViewUser(null)}
          onDM={u=>{setDmTarget(u);setViewUser(null);}}
        />
      )}
      <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
        {ranked.map((s,i)=>{
          const me=s.id===profile.id;
          const medal=["🥇","🥈","🥉"][i]||null;
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} onClick={()=>setViewUser(s)} className="card-press"
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:me?`${ACC}08`:BG2,borderBottom:i<ranked.length-1?`1px solid ${SEP}`:"none",cursor:"pointer"}}>
              <div style={{width:26,textAlign:"center",fontWeight:700,fontSize:medal?20:13,color:i<3?ORG:"#8e8e93",flexShrink:0}}>{medal||`${i+1}`}</div>
              <div style={{width:42,height:42,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                {!s.avatar_url&&(s.avatar||"?")}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{fontSize:16,color:me?ACC:LBL,fontWeight:me?600:400}}>{s.nickname||s.name?.split(" ")[0]}{me?" (you)":""}</div>
                  <span style={{fontSize:13}}>{sTier.emoji}</span>
                </div>
                <div style={{fontSize:12,color:LB3,marginTop:1}}>{s.role} · Lv.{getLevel(s.xp)} · {s.streak||0}🔥</div>
                <div style={{marginTop:4,background:"#e5e5ea",borderRadius:99,height:3}}>
                  <div style={{width:`${getLvlPct(s.xp)}%`,height:"100%",background:`linear-gradient(90deg,${ACC},${ORG})`,borderRadius:99}}/>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:15,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()}</div>
                <div style={{fontSize:10,color:LB3,marginTop:1}}>pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PRIZES TAB ────────────────────────────────────────────────────────
export function PrizesTab({profile,prizes,doRedeem,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [filter,setFilter]=useState("All");
  const display=prizes.length>0?prizes:PRIZES.map(x=>({...x,cost:x.pts,category:x.cat}));
  const cats=["All",...new Set(display.map(p=>p.cat||p.category).filter(Boolean))];
  const filtered=filter==="All"?display:display.filter(p=>(p.cat||p.category)===filter);

  return(
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{background:BG2,borderRadius:13,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:15,color:LB2}}>Your balance</div>
        <div style={{fontSize:22,fontWeight:700,color:ACC,letterSpacing:"-.8px"}}>{(profile.xp||0).toLocaleString()} <span style={{fontSize:14,fontWeight:500,color:LB3}}>pts</span></div>
      </div>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{flexShrink:0,padding:"5px 13px",borderRadius:99,fontSize:13,fontWeight:filter===c?600:400,background:filter===c?ACC:"rgba(0,0,0,.06)",color:filter===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>{c}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {filtered.map(p=>{
          const cost=p.pts||p.cost,can=profile.xp>=cost,out=(p.stock||99)<1;
          return(
            <div key={p.id} className="fade" style={{background:BG2,borderRadius:13,padding:"15px 12px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",opacity:out?.5:1}}>
              <div style={{fontSize:32,marginBottom:6}}>{p.icon}</div>
              <div style={{fontSize:14,color:LBL,fontWeight:500,marginBottom:4,lineHeight:1.3}}>{p.name}</div>
              <Chip color="#8e8e93">{p.cat||p.category}</Chip>
              <div style={{fontSize:12,color:LB3,marginTop:6,marginBottom:6,lineHeight:1.4}}>{p.desc}</div>
              <div style={{fontSize:18,fontWeight:700,color:can&&!out?ACC:"#8e8e93",marginBottom:2}}>{cost?.toLocaleString()}</div>
              <div style={{fontSize:10,color:LB3,marginBottom:10}}>pts · {p.stock||"∞"} left</div>
              <button onClick={()=>doRedeem(p)} disabled={!can||out}
                style={{width:"100%",padding:"9px",background:(!can||out)?"rgba(0,0,0,.06)":ACC,color:(!can||out)?LB3:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:(!can||out)?"default":"pointer",fontFamily:SF}}>
                {out?"Sold Out":can?"Redeem":"Need More"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── COMMUNITY TAB ─────────────────────────────────────────────────────
export function CommunityTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,dmTarget,setDmTarget}){
  const [mode,setMode]=useState("group");
  const [dmWith,setDmWith]=useState(null);
  const [messages,setMessages]=useState([]);
  const [dmMessages,setDmMessages]=useState([]);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const [showPeople,setShowPeople]=useState(false);
  const bottomRef=useRef(null);

  useEffect(()=>{
    if(dmTarget){setDmWith(dmTarget);setMode("dm");setDmMessages([]);}
  },[dmTarget]);

  useEffect(()=>{
    loadMessages();
    const iv=setInterval(loadMessages,4000);
    return()=>clearInterval(iv);
  },[mode,dmWith]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,dmMessages]);

  const loadMessages=async()=>{
    if(mode==="group"){
      const{data}=await supabase.from("messages").select("*").eq("is_dm",false).order("created_at",{ascending:true}).limit(100);
      if(data)setMessages(data);
    } else if(dmWith){
      const{data}=await supabase.from("messages").select("*").eq("is_dm",true)
        .or(`and(user_id.eq.${profile.id},recipient_id.eq.${dmWith.id}),and(user_id.eq.${dmWith.id},recipient_id.eq.${profile.id})`)
        .order("created_at",{ascending:true}).limit(100);
      if(data)setDmMessages(data);
    }
  };

  const send=async()=>{
    if(!text.trim()||sending)return;
    setSending(true);
    const payload={user_id:profile.id,sender_name:profile.nickname||profile.name,sender_avatar:profile.avatar,content:text.trim()};
    if(mode==="dm"&&dmWith){
      await supabase.from("messages").insert({...payload,is_dm:true,recipient_id:dmWith.id});
      await supabase.from("notifications").insert({user_id:dmWith.id,title:`💬 New message from ${profile.nickname||profile.name}`,body:text.trim().slice(0,80),type:"dm"});
    } else {
      await supabase.from("messages").insert({...payload,is_dm:false});
    }
    setText("");
    await loadMessages();
    setSending(false);
  };

  const startDM=user=>{setDmWith(user);setMode("dm");setShowPeople(false);setDmMessages([]);if(setDmTarget)setDmTarget(null);};
  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});
  const displayMsgs=mode==="dm"?dmMessages:messages;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 170px)"}}>
      {/* Tabs */}
      <div style={{display:"flex",gap:8,padding:"0 16px 10px",borderBottom:`1px solid ${SEP}`,background:BG,flexShrink:0}}>
        <button onClick={()=>{setMode("group");setDmWith(null);}} className="btn"
          style={{flex:1,padding:"8px",background:mode==="group"?ACC:"rgba(0,0,0,.06)",color:mode==="group"?"#fff":LB2,border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
          💬 Group Chat
        </button>
        <button onClick={()=>setShowPeople(true)} className="btn"
          style={{flex:1,padding:"8px",background:mode==="dm"?ACC:"rgba(0,0,0,.06)",color:mode==="dm"?"#fff":LB2,border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
          {mode==="dm"&&dmWith?`💌 ${dmWith.nickname||dmWith.name?.split(" ")[0]}`:"💌 Direct Message"}
        </button>
      </div>

      {/* People picker */}
      {showPeople&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:BG,borderRadius:"20px 20px 0 0",padding:"20px 16px 40px",maxHeight:"60vh",overflowY:"auto"}}>
            <div style={{fontSize:17,fontWeight:600,color:LBL,marginBottom:14}}>Select Person</div>
            {(allProfiles||[]).filter(p=>p.id!==profile.id&&!p.is_admin).map(u=>(
              <div key={u.id} onClick={()=>startDM(u)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${SEP}`,cursor:"pointer"}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:u.avatar_url?`url(${u.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
                  {!u.avatar_url&&(u.avatar||"?")}
                </div>
                <div>
                  <div style={{fontSize:16,color:LBL}}>{u.nickname||u.name}</div>
                  <div style={{fontSize:13,color:LB3}}>{u.role}</div>
                </div>
              </div>
            ))}
            <button onClick={()=>setShowPeople(false)} style={{width:"100%",marginTop:16,padding:"14px",background:"rgba(0,0,0,.06)",border:"none",borderRadius:12,fontSize:16,color:"#ff3b30",cursor:"pointer",fontFamily:SF}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {displayMsgs.length===0&&(
          <div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>
            {mode==="dm"?`Start a conversation with ${dmWith?.nickname||dmWith?.name?.split(" ")[0]} 👋`:"No messages yet. Say hi! 👋"}
          </div>
        )}
        {displayMsgs.map(msg=>{
          const me=msg.user_id===profile.id;
          if(msg.is_system)return(
            <div key={msg.id} style={{textAlign:"center",padding:"4px 8px"}}>
              <div style={{display:"inline-block",background:`${ACC}10`,borderRadius:12,padding:"8px 14px",fontSize:13,color:ACC,lineHeight:1.55,maxWidth:"88%",whiteSpace:"pre-line"}}>{msg.content}</div>
            </div>
          );
          return(
            <div key={msg.id} style={{display:"flex",flexDirection:me?"row-reverse":"row",alignItems:"flex-end",gap:8}}>
              {!me&&(
                <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden"}}>
                  {msg.sender_avatar||msg.sender_name?.charAt(0)||"?"}
                </div>
              )}
              <div style={{maxWidth:"72%"}}>
                {!me&&<div style={{fontSize:11,color:LB3,marginBottom:3,paddingLeft:4}}>{msg.sender_name}</div>}
                <div style={{background:me?ACC:BG2,borderRadius:me?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
                  <div style={{fontSize:15,color:me?"#fff":LBL,lineHeight:1.45,whiteSpace:"pre-wrap"}}>{msg.content}</div>
                </div>
                <div style={{fontSize:10,color:LB3,marginTop:3,textAlign:me?"right":"left",paddingLeft:me?0:4}}>{fmt(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"8px 16px",background:BG2,borderTop:`1px solid ${SEP}`,display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder={mode==="dm"?`Message ${dmWith?.nickname||dmWith?.name?.split(" ")[0]}…`:"Message your team…"}
          style={{flex:1,background:"#f2f2f7",border:"none",outline:"none",borderRadius:22,padding:"10px 16px",fontSize:16,color:LBL,fontFamily:SF}}/>
        <button onClick={send} disabled={!text.trim()||sending} className="btn"
          style={{width:40,height:40,borderRadius:"50%",background:text.trim()?ACC:"#e5e5ea",border:"none",cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,color:"#fff",transition:"background .15s"}}>
          {sending?"…":"▶"}
        </button>
      </div>
    </div>
  );
}

// ── PROFILE TAB ───────────────────────────────────────────────────────
export function ProfileTab({profile,syncProfile,score,tier,completedCount,showToast,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [section,setSection]=useState("public");
  const [editing,setEditing]=useState(false);
  const [editPrivate,setEditPrivate]=useState(false);
  const [form,setForm]=useState({
    nickname:profile.nickname||"",bio:profile.bio||"",
    hobby:profile.hobby||"",favorite_food:profile.favorite_food||"",
    contact_number:profile.contact_number||"",
    gender:profile.gender||"",hometown:profile.hometown||"",
    avatar_url:profile.avatar_url||"",banner_url:profile.banner_url||"",
  });
  const [privateForm,setPrivateForm]=useState({bank_account:"",bank_type:profile.bank_type||"Maybank"});
  const [saving,setSaving]=useState(false);
  const [rawImg,setRawImg]=useState(null);
  const [showCrop,setShowCrop]=useState(false);
  const [verif,setVerif]=useState([]);
  const [infoExpanded,setInfoExpanded]=useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase.from("verification_requests").select("*").eq("user_id",profile.id).order("submitted_at",{ascending:false})
      .then(({data})=>{if(data)setVerif(data);});
  },[]);

  const getVerifStatus=field=>{
    if(profile[`${field}_verified`])return"verified";
    const req=verif.find(v=>v.field_name===field&&v.status==="Pending");
    if(req)return"pending";
    return"unverified";
  };

  const VerifBadge=({field})=>{
    const status=getVerifStatus(field);
    const c=status==="verified"?"#34c759":status==="pending"?"#ff9500":"#8e8e93";
    const label=status==="verified"?"✓ Verified":status==="pending"?"⏳ Pending":"Not Verified";
    return<span style={{fontSize:11,color:c,fontWeight:600,background:c+"18",padding:"2px 7px",borderRadius:99}}>{label}</span>;
  };

  const handleFileSelect=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{setRawImg(ev.target.result);setShowCrop(true);};
    reader.readAsDataURL(file);
  };

  const handleBannerSelect=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>set("banner_url",ev.target.result);
    reader.readAsDataURL(file);
  };

  const save=async()=>{
    setSaving(true);
    const{error}=await supabase.from("profiles").update(form).eq("id",profile.id);
    if(!error){syncProfile({...profile,...form});showToast("Profile updated ✓");setEditing(false);}
    setSaving(false);
  };

  const submitBankChange=async()=>{
    if(!privateForm.bank_account.trim()){showToast("Enter your bank account number");return;}
    if(!/^\d+$/.test(privateForm.bank_account)){showToast("Numbers only");return;}
    setSaving(true);
    await supabase.from("verification_requests").insert({user_id:profile.id,field_name:"bank_account",field_value:privateForm.bank_account,extra_value:privateForm.bank_type,status:"Pending"});
    await supabase.from("profiles").update({bank_verified:false}).eq("id",profile.id);
    const{data}=await supabase.from("verification_requests").select("*").eq("user_id",profile.id).order("submitted_at",{ascending:false});
    if(data)setVerif(data);
    showToast("Bank update submitted for approval 🔒");
    setEditPrivate(false);setSaving(false);
  };

  const av=form.avatar_url||profile.avatar_url;
  const bn=form.banner_url||profile.banner_url;

  // ── Age & Days Working ──
  const age=profile.birthday_verified&&profile.birthday
    ?new Date().getFullYear()-new Date(profile.birthday).getFullYear()
    :null;
  const daysWorking=profile.joined_date_verified&&profile.joined_date
    ?Math.floor((Date.now()-new Date(profile.joined_date))/86400000)
    :null;

  // ── Ordered public info ──
  const publicRows=[
    ["🎂 Age",          age?`${age} years old`:null],
    ["⚧ Gender",        profile.gender||null],
    ["🏠 Home Town",    profile.hometown||null],
    ["📱 Contact",      profile.contact_number?formatContact(profile.contact_number):null],
    ["📧 Email",        profile.email||null],
    ["📅 Joining Date", profile.joined_date_verified?fmtDate(profile.joined_date):null],
    ["⏳ Been Working", daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎂 Birthday",     profile.birthday_verified?fmtDate(profile.birthday):null],
    ["🎮 Hobby",        profile.hobby||null],
    ["🍜 Fav Food",     profile.favorite_food||null],
  ].filter(([,v])=>v);

  const SHOW_INIT=5;
  const visibleRows=infoExpanded?publicRows:publicRows.slice(0,SHOW_INIT);
  const hasMore=publicRows.length>SHOW_INIT;

  return(
    <div style={{paddingBottom:12}}>
      {showCrop&&rawImg&&(
        <CircleCrop src={rawImg}
          onCrop={url=>{set("avatar_url",url);setShowCrop(false);setRawImg(null);}}
          onCancel={()=>{setShowCrop(false);setRawImg(null);}}/>
      )}

      {/* Banner */}
      <div style={{height:130,background:bn?`url(${bn}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,position:"relative"}}>
        {editing&&(
          <>
            <button onClick={()=>document.getElementById("bnProfile").click()} style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.55)",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:SF}}>Change Banner</button>
            <input id="bnProfile" type="file" accept="image/*" onChange={handleBannerSelect} style={{display:"none"}}/>
          </>
        )}
      </div>

      {/* Avatar + Edit */}
      <div style={{padding:"0 16px",marginTop:-44,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{position:"relative"}}>
          <div style={{width:84,height:84,borderRadius:"50%",background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,border:`3px solid ${BG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:ACC,overflow:"hidden"}}>
            {!av&&(profile.avatar||"?")}
          </div>
          {editing&&(
            <button onClick={()=>document.getElementById("avProfile").click()} style={{position:"absolute",bottom:2,right:2,width:26,height:26,background:ACC,border:`2px solid ${BG}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13}}>📷</button>
          )}
          <input id="avProfile" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
        </div>
        <button onClick={editing?save:()=>setEditing(true)} disabled={saving} className="btn"
          style={{background:editing?ACC:"rgba(0,0,0,.07)",color:editing?"#fff":LBL,border:"none",borderRadius:99,padding:"8px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
          {saving?"Saving…":editing?"Save ✓":"Edit Profile"}
        </button>
      </div>

      <div style={{padding:"0 16px",marginBottom:14}}>
        <div style={{fontSize:22,fontWeight:700,color:LBL,letterSpacing:"-.5px"}}>{profile.nickname||profile.name}</div>
        <div style={{fontSize:14,color:LB3,marginTop:2}}>{profile.name} · {profile.role}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:5,background:tier.color+"18",borderRadius:99,padding:"3px 10px",marginTop:8}}>
          <span>{tier.emoji}</span><span style={{fontSize:12,color:tier.color,fontWeight:700}}>{tier.name}</span>
        </div>
        {profile.bio&&!editing&&<div style={{fontSize:14,color:LB2,marginTop:10,lineHeight:1.6}}>{profile.bio}</div>}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"0 16px",marginBottom:16}}>
        {[{l:"Points",v:(profile.xp||0).toLocaleString()},{l:"Contrib.",v:score.toLocaleString()},{l:"Missions",v:completedCount}].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:13,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:ACC,letterSpacing:"-.5px"}}>{s.v}</div>
            <div style={{fontSize:10,color:LB3,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Section toggle */}
      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:14}}>
        {[["public","Public Info"],["private","My Private Info 🔒"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSection(id)} className="btn"
            style={{flex:1,padding:"9px",background:section===id?ACC:"rgba(0,0,0,.06)",color:section===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PUBLIC SECTION ── */}
      {section==="public"&&(
        editing?(
          <div style={{padding:"0 16px"}}>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:10}}>
              {[
                ["Nickname","nickname","Your nickname"],
                ["Hobby","hobby","e.g. Gaming"],
                ["Favourite Food","favorite_food","e.g. Nasi Lemak"],
                ["Home Town","hometown","e.g. Kuala Lumpur"],
              ].map(([label,key,ph],i,a)=>(
                <div key={key} style={{padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>
                  <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                </div>
              ))}
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
                <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Short description…" rows={3}
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF,lineHeight:1.45}}/>
              </div>
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Contact Number</div>
                <input value={form.contact_number} onChange={e=>set("contact_number",e.target.value.replace(/\D/g,""))} placeholder="0123456789" type="tel"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                {form.contact_number&&<div style={{fontSize:13,color:ACC,marginTop:4}}>Preview: {formatContact(normalizeContact(form.contact_number))}</div>}
              </div>
            </div>
            <button onClick={()=>setEditing(false)} style={{width:"100%",padding:"14px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:13,fontSize:16,color:"#ff3b30",cursor:"pointer",fontFamily:SF,marginBottom:16}}>Cancel</button>
          </div>
        ):(
          <div style={{padding:"0 16px"}}>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
              {visibleRows.map(([label,value],i)=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<visibleRows.length-1||hasMore?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:15,color:LB3,flexShrink:0,marginRight:12}}>{label}</div>
                  <div style={{fontSize:15,color:LBL,textAlign:"right",maxWidth:"55%",lineHeight:1.4}}>{value}</div>
                </div>
              ))}
              {hasMore&&(
                <button onClick={()=>setInfoExpanded(p=>!p)} className="btn"
                  style={{width:"100%",padding:"11px 16px",background:"none",border:"none",cursor:"pointer",fontSize:14,color:ACC,fontWeight:600,fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {infoExpanded?`Show Less ▲`:`Show ${publicRows.length-SHOW_INIT} More ▾`}
                </button>
              )}
              {publicRows.length===0&&(
                <div style={{padding:"20px 16px",fontSize:15,color:LB3,textAlign:"center"}}>No public info yet. Tap Edit Profile to add.</div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── PRIVATE SECTION ── */}
      {section==="private"&&(
        <div style={{padding:"0 16px"}}>
          <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC,lineHeight:1.7}}>
            🔒 This information is only visible to you and admin. IC & EPF cannot be changed once verified. Bank account can be updated but requires re-approval.
          </div>
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
            {[
              {label:"IC Number",   field:"ic_number",   value:profile.ic_number||"Not provided"},
              {label:"EPF Number",  field:"epf_number",  value:profile.epf_number||"Not provided"},
              {label:"Bank Account",field:"bank_account",value:profile.bank_account||"Not provided",extra:profile.bank_type},
            ].map(({label,field,value,extra},i,a)=>(
              <div key={field} style={{padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>{label}</div>
                  <VerifBadge field={field}/>
                </div>
                <div style={{fontSize:16,color:LBL}}>{value}</div>
                {extra&&<div style={{fontSize:13,color:LB3,marginTop:2}}>{extra}</div>}
              </div>
            ))}
          </div>
          {!editPrivate?(
            <button onClick={()=>setEditPrivate(true)} style={{width:"100%",padding:"14px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:16,color:ACC,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
              Update Bank Account
            </button>
          ):(
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:10}}>
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>New Bank Account Number</div>
                <input value={privateForm.bank_account} onChange={e=>setPrivateForm(p=>({...p,bank_account:e.target.value.replace(/\D/g,"")}))} placeholder="Numbers only" type="tel"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
              </div>
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Bank Type</div>
                <div style={{position:"relative"}}>
                  <select value={privateForm.bank_type} onChange={e=>setPrivateForm(p=>({...p,bank_type:e.target.value}))}
                    style={{width:"100%",background:"transparent",border:`1px solid ${SEP}`,borderRadius:9,padding:"10px 32px 10px 12px",fontSize:16,color:LBL,appearance:"none",WebkitAppearance:"none",cursor:"pointer",outline:"none"}}>
                    {BANK_TYPES.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                  <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:LB3,pointerEvents:"none"}}>▾</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,padding:"11px 16px"}}>
                <button onClick={()=>setEditPrivate(false)} style={{flex:1,padding:"11px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:10,fontSize:15,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                <button onClick={submitBankChange} disabled={saving} style={{flex:2,padding:"11px",background:ACC,border:"none",borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF}}>Submit for Approval</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
