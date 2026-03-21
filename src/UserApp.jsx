import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore,formatContact}from"./constants";
import{MissionsTab,LeaderboardTab,PrizesTab,CommunityTab,ProfileTab}from"./UserTabs";

const XP_T=[0,500,1200,2000,3000,4500,6500,9000,12000];
const getLevel=xp=>{let l=1;for(let i=1;i<XP_T.length;i++)if(xp>=XP_T[i])l=i+1;return Math.min(l,XP_T.length);};
const getLvlPct=xp=>{const l=getLevel(xp)-1;const s=XP_T[l]||0;const e=XP_T[l+1]||s+1;return Math.round(((xp-s)/(e-s))*100);};
const fmtDate=iso=>{if(!iso)return null;const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
const calcAge=birthday=>{if(!birthday)return null;const birth=new Date(birthday),today=new Date();let age=today.getFullYear()-birth.getFullYear();const m=today.getMonth()-birth.getMonth();if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;return age;};
const calcDaysWorking=joinedDate=>{if(!joinedDate)return null;return Math.floor((Date.now()-new Date(joinedDate))/86400000);};
const WX_ICON=code=>{if(code===0)return"☀️";if(code<=3)return"⛅";if(code<=48)return"🌫️";if(code<=67)return"🌧️";if(code<=77)return"❄️";if(code<=82)return"🌦️";return"⛈️";};
const WX_DESC=code=>{if(code===0)return"Clear Sky";if(code<=3)return"Partly Cloudy";if(code<=48)return"Foggy";if(code<=67)return"Rainy";if(code<=77)return"Snowy";if(code<=82)return"Showers";return"Thunderstorm";};

function addRipple(e){const el=e.currentTarget;if(!el)return;const rect=el.getBoundingClientRect();const dot=document.createElement("div");dot.className="ripple-dot";dot.style.left=(e.clientX-rect.left)+"px";dot.style.top=(e.clientY-rect.top)+"px";el.appendChild(dot);setTimeout(()=>dot.remove(),500);}

const playNotifSound=()=>{
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator();const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.type="sine";
    o.frequency.setValueAtTime(660,ctx.currentTime);
    o.frequency.setValueAtTime(880,ctx.currentTime+0.12);
    o.frequency.setValueAtTime(1100,ctx.currentTime+0.24);
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+0.04);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+0.6);
    setTimeout(()=>{try{const c2=new(window.AudioContext||window.webkitAudioContext)();const o2=c2.createOscillator();const g2=c2.createGain();o2.connect(g2);g2.connect(c2.destination);o2.type="sine";o2.frequency.setValueAtTime(1320,c2.currentTime);g2.gain.setValueAtTime(0,c2.currentTime);g2.gain.linearRampToValueAtTime(0.15,c2.currentTime+0.04);g2.gain.exponentialRampToValueAtTime(0.001,c2.currentTime+0.4);o2.start(c2.currentTime);o2.stop(c2.currentTime+0.4);}catch{}},250);
  }catch(e){console.warn("sound:",e);}
};

// ── COMPACT FULL PROFILE PAGE — auto-fits on screen ──────────────────
function FullProfilePage({user,currentUserId,onBack,onDM}){
  const [expanded,setExpanded]=useState(false);
  const [showAvatarFull,setShowAvatarFull]=useState(false);
  const tier=getTier(calcScore(user.joined_date,0));
  const age=user.birthday_verified&&user.birthday?calcAge(user.birthday):null;
  const daysWorking=user.joined_date_verified&&user.joined_date?calcDaysWorking(user.joined_date):null;
  const allRows=[
    ["💼",user.role||user.position],
    ["🎂",age?`${age} years old`:null],
    ["⚧",user.gender||null],
    ["🏠",user.hometown||null],
    ["📱",user.contact_number?formatContact(user.contact_number):null],
    ["📧",user.email||null],
    ["📅",user.joined_date_verified?fmtDate(user.joined_date):null],
    ["⏳",daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎮",user.hobby||null],
    ["🍜",user.favorite_food||null],
  ].filter(([,v])=>v);
  const SHOW=4;
  const visible=expanded?allRows:allRows.slice(0,SHOW);

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF}}>
      {showAvatarFull&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAvatarFull(false)}>
          <div style={{width:240,height:240,borderRadius:"50%",background:user.avatar_url?`url(${user.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:70,color:ACC}}>{!user.avatar_url&&(user.avatar||"?")}</div>
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}
      {/* Header */}
      <div style={{background:"rgba(242,242,247,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"14px 16px",position:"sticky",top:0,zIndex:20,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} className="btn" style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:ACC,fontWeight:700,padding:0,fontFamily:SF}}>← Back</button>
        <div style={{flex:1,fontSize:18,fontWeight:700,color:LBL,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nickname||user.name}</div>
        {currentUserId!==user.id&&(
          <button onClick={()=>onDM(user)} className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{background:ACC,color:"#fff",border:"none",borderRadius:99,padding:"9px 18px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:SF,flexShrink:0}}>
            💬 DM
          </button>
        )}
      </div>

      <div style={{padding:"16px 16px 40px"}}>
        {/* Compact profile card */}
        <div style={{background:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:20,padding:"20px",marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`${ORG}15`,pointerEvents:"none"}}/>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div onClick={()=>setShowAvatarFull(true)}
              style={{width:72,height:72,borderRadius:"50%",background:user.avatar_url?`url(${user.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:22,color:ACC,overflow:"hidden",flexShrink:0,cursor:"zoom-in",border:"3px solid rgba(255,255,255,.2)"}}>
              {!user.avatar_url&&(user.avatar||"?")}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:20,fontWeight:700,color:"#fff",lineHeight:1.2}}>{user.nickname||user.name}</div>
              {user.nickname&&<div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginTop:2}}>{user.name}</div>}
              {user.role&&<div style={{fontSize:14,color:ORG,fontWeight:600,marginTop:4}}>{user.role}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:4,background:tier.color+"28",borderRadius:99,padding:"4px 10px"}}>
                <span style={{fontSize:14}}>{tier.emoji}</span>
                <span style={{fontSize:12,color:tier.color,fontWeight:700}}>{tier.name}</span>
              </div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>Lv.{getLevel(user.xp||0)}</div>
            </div>
          </div>
          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>
            {[{l:"Points",v:(user.xp||0).toLocaleString()},{l:"Streak",v:`${user.streak||0}d 🔥`},{l:"Level",v:getLevel(user.xp||0)}].map((s,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,.08)",borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:ORG}}>{s.v}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        {user.bio&&(
          <div style={{background:BG2,borderRadius:14,padding:"14px 16px",marginBottom:12,fontSize:15,color:LB2,lineHeight:1.6}}>
            {user.bio}
          </div>
        )}

        {/* Info — compact 2-col grid */}
        {allRows.length>0&&(
          <div style={{background:BG2,borderRadius:14,overflow:"hidden",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              {visible.map(([icon,value],i)=>(
                <div key={i} style={{padding:"12px 14px",borderBottom:i<visible.length-2?`1px solid ${SEP}`:"none",borderRight:i%2===0?`1px solid ${SEP}`:"none",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                  <div style={{fontSize:14,color:LBL,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>
                </div>
              ))}
            </div>
            {allRows.length>SHOW&&(
              <button onClick={()=>setExpanded(p=>!p)} className="btn"
                style={{width:"100%",padding:"12px",background:"none",border:"none",borderTop:`1px solid ${SEP}`,cursor:"pointer",fontSize:14,color:ACC,fontWeight:700,fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {expanded?`Show Less ▲`:`Show ${allRows.length-SHOW} More ▾`}
              </button>
            )}
          </div>
        )}

        {currentUserId!==user.id&&(
          <button onClick={()=>onDM(user)} className="btn-primary ripple-container" onPointerDown={addRipple}
            style={{width:"100%",padding:"16px",background:ACC,color:"#fff",border:"none",borderRadius:14,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            💬 Send Message
          </button>
        )}
      </div>
    </div>
  );
}

// ── CENTERED MISSION ACCEPTED MODAL ──────────────────────────────────
function MissionAcceptedModal({onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
      onClick={onClose}>
      <div className="toast-in"
        style={{background:"#1c3258",borderRadius:24,padding:"32px 28px",textAlign:"center",maxWidth:300,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:58,marginBottom:12}}>💪</div>
        <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:8}}>Mission Accepted!</div>
        <div style={{fontSize:15,color:"rgba(255,255,255,.7)",lineHeight:1.5}}>Go complete it and submit your proof to earn points!</div>
      </div>
    </div>
  );
}

// ── CENTERED REDEMPTION SUCCESS MODAL ────────────────────────────────
function RedeemSuccessModal({prize,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
      onClick={onClose}>
      <div className="toast-in"
        style={{background:BG2,borderRadius:24,padding:"32px 28px",textAlign:"center",maxWidth:320,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:60,marginBottom:12}}>{prize?.icon||"🎁"}</div>
        <div style={{fontSize:22,fontWeight:700,color:ACC,marginBottom:8}}>Redeemed!</div>
        <div style={{fontSize:17,color:LBL,fontWeight:600,marginBottom:6}}>{prize?.name}</div>
        <div style={{fontSize:14,color:LB3,marginBottom:20,lineHeight:1.5}}>Your request has been submitted. Admin will deliver your prize shortly.</div>
        <div style={{background:`${ACC}10`,borderRadius:12,padding:"10px 16px",fontSize:14,color:ACC,fontWeight:600,marginBottom:20}}>
          ⏳ Usually delivered within 24 hours
        </div>
        <button onClick={onClose} className="btn-primary ripple-container" onPointerDown={addRipple}
          style={{width:"100%",padding:"14px",background:ACC,color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:SF}}>
          OK, Got It!
        </button>
      </div>
    </div>
  );
}

export default function UserApp({profile:init,session,onProfileUpdate,onSwitchAccount,onAddAccount,onShowSwitcher}){
  const [profile,setProfile]              =useState(init);
  const profileRef                        =useRef(init);
  const [tab,setTab]                      =useState("home");
  const [tabKey,setTabKey]                =useState(0);
  const [missions,setMissions]            =useState([]);
  const [myClaims,setMyClaims]            =useState([]);
  const [allProfiles,setAllProfiles]      =useState([]);
  const [announcements,setAnnouncements]  =useState([]);
  const [myRedemptions,setMyRedemptions]  =useState([]);
  const [prizes,setPrizes]                =useState([]);
  const [notifications,setNotifications]  =useState([]);
  const [toast,setToast]                  =useState(null);
  const [popupNotif,setPopupNotif]        =useState(null);
  const [dmTarget,setDmTarget]            =useState(null);
  const [showNotif,setShowNotif]          =useState(false);
  const [viewingProfile,setViewingProfile]=useState(null);
  const [weather,setWeather]              =useState(null);
  // ── NEW: centered success modal for redemptions ──
  const [redeemSuccess,setRedeemSuccess]  =useState(null);
  const [missionAccepted,setMissionAccepted]=useState(false);
  const [dmOpen,setDmOpen]                =useState(false);

  const syncProfile=u=>{profileRef.current=u;setProfile(u);onProfileUpdate(u);};
  const switchTab=newTab=>{setTab(newTab);setTabKey(k=>k+1);};

  useEffect(()=>{
    loadAll();loadNotifications();fetchWeather();
    const ch=supabase.channel("user_rt_v5_"+profile.id)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${profile.id}`},async payload=>{
        if(payload.new&&payload.new.xp!==undefined){syncProfile({...profileRef.current,...payload.new});}
        else{try{const{data}=await supabase.from("profiles").select("*").eq("id",profile.id).single();if(data)syncProfile(data);}catch(e){console.warn(e);}}
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"announcements"},payload=>{
        if(payload.new)setAnnouncements(p=>{if(p.find(a=>a.id===payload.new.id))return p;return[payload.new,...p].sort((a,b)=>b.pinned-a.pinned||(new Date(b.created_at)-new Date(a.created_at)));});
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"announcements"},payload=>{if(payload.new)setAnnouncements(p=>p.map(a=>a.id===payload.new.id?payload.new:a));})
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"announcements"},payload=>{if(payload.old?.id)setAnnouncements(p=>p.filter(a=>a.id!==payload.old.id));})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${profile.id}`},payload=>{
        if(!payload.new)return;
        const n=payload.new;
        setNotifications(p=>[n,...p]);
        setPopupNotif(n);
        setTimeout(()=>setPopupNotif(null),6000);
        playNotifSound();
        if(n.type==="redemption"){supabase.from("redemptions").select("*").eq("user_id",profile.id).then(({data})=>{if(data)setMyRedemptions(data);});}
        if(n.type==="approval"){supabase.from("mission_claims").select("*").eq("user_id",profile.id).then(({data})=>{if(data)setMyClaims(data);});}
        if("Notification" in window&&Notification.permission==="granted"){try{new Notification(n.title,{body:n.body,icon:"/TECHWIDE_LOGO.png"});}catch(e){console.warn(e);}}
      })
      // ── FIX: redemptions UPDATE realtime — catches status change to Approved ──
      .on("postgres_changes",{event:"*",schema:"public",table:"redemptions",filter:`user_id=eq.${profile.id}`},()=>{
        supabase.from("redemptions").select("*").eq("user_id",profile.id).then(({data})=>{if(data)setMyRedemptions(data);});
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"mission_claims",filter:`user_id=eq.${profile.id}`},()=>{
        supabase.from("mission_claims").select("*").eq("user_id",profile.id).then(({data})=>{if(data)setMyClaims(data);});
      })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"missions"},payload=>{if(payload.new?.active)setMissions(p=>[...p,payload.new]);})
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"missions"},payload=>{if(payload.new&&!payload.new.active)setMissions(p=>p.filter(m=>m.id!==payload.new.id));})
      .subscribe(status=>{if(status==="SUBSCRIBED")console.log("✓ Realtime",profile.id);});

    const notifIv=setInterval(loadNotifications,60000);
    const profilePoll=setInterval(async()=>{
      try{const{data}=await supabase.from("profiles").select("*").eq("id",profile.id).single();if(data&&data.xp!==profileRef.current.xp)syncProfile(data);}
      catch(e){console.warn(e);}
    },30000);
    const claimsPoll=setInterval(async()=>{
      try{const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);if(data)setMyClaims(data);}
      catch(e){console.warn(e);}
    },15000);
    // ── Poll redemptions every 20s — catches Approved status ──
    const redPoll=setInterval(async()=>{
      try{const{data}=await supabase.from("redemptions").select("*").eq("user_id",profile.id);if(data)setMyRedemptions(data);}
      catch(e){console.warn(e);}
    },20000);

    return()=>{clearInterval(notifIv);clearInterval(profilePoll);clearInterval(claimsPoll);clearInterval(redPoll);supabase.removeChannel(ch);};
  },[]);

  useEffect(()=>{if(dmTarget)switchTab("chat");},[dmTarget]);
  useEffect(()=>{if("Notification" in window&&Notification.permission==="default")Notification.requestPermission();},[]);

  const fetchWeather=()=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true`);const data=await res.json();if(data.current_weather)setWeather(data.current_weather);}catch{}
    },()=>{});
  };

  const loadAll=async()=>{
    const uid=profile.id;
    const[m,c,ap,a,r,p]=await Promise.all([
      supabase.from("missions").select("*").eq("active",true),
      supabase.from("mission_claims").select("*").eq("user_id",uid),
      supabase.from("profiles").select("*").order("xp",{ascending:false}),
      supabase.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}),
      supabase.from("redemptions").select("*").eq("user_id",uid),
      supabase.from("prizes").select("*").eq("active",true),
    ]);
    if(m.data)setMissions(m.data);if(c.data)setMyClaims(c.data);
    if(ap.data)setAllProfiles(ap.data);if(a.data)setAnnouncements(a.data);
    if(r.data)setMyRedemptions(r.data);
    if(p.data)setPrizes(p.data.length>0?p.data:PRIZES.map(x=>({...x,id:x.id,cost:x.pts,category:x.cat})));
    try{const{data:own}=await supabase.from("profiles").select("*").eq("id",uid).single();if(own)syncProfile(own);}catch(e){console.warn(e);}
  };

  const loadNotifications=async()=>{
    const{data}=await supabase.from("notifications").select("*").eq("user_id",profile.id).order("created_at",{ascending:false}).limit(30);
    if(data)setNotifications(data);
  };

  const markAllRead=async()=>{
    await supabase.from("notifications").update({read:true}).eq("user_id",profile.id).eq("read",false);
    setNotifications(p=>p.map(n=>({...n,read:true})));
  };

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2800);};

  const doCheckIn=async()=>{
    const today=new Date().toISOString().split("T")[0];
    if(profileRef.current.last_checkin===today){showToast("Already checked in today 😊");return;}
    const bonus=profileRef.current.streak>=7?100:profileRef.current.streak>=3?75:50;
    const streak=profileRef.current.streak+1;
    const updated={...profileRef.current,xp:profileRef.current.xp+bonus,streak,last_checkin:today};
    syncProfile(updated);
    setAllProfiles(p=>p.map(x=>x.id===profile.id?updated:x).sort((a,b)=>b.xp-a.xp));
    showToast(`+${bonus} pts  •  ${streak}-day streak 🔥`);
    await supabase.from("profiles").update({xp:updated.xp,streak,last_checkin:today}).eq("id",profile.id);
    try{await supabase.from("points_history").insert({user_id:profile.id,amount:bonus,reason:`Daily check-in — ${streak} day streak`,type:"credit"});}catch(e){console.warn(e);}
  };

  // ── doRedeem — shows CENTERED success modal ──
  const doRedeem=async prize=>{
    const pts=prize.pts||prize.cost||0;
    const cur=profileRef.current;
    if(!pts||pts<=0){showToast("Invalid prize");return;}
    if(cur.xp<pts){showToast(`Need ${(pts-cur.xp).toLocaleString()} more pts`);return;}
    if(prize.stock!=null&&prize.stock<1){showToast("Out of stock");return;}
    const newXp=cur.xp-pts;
    syncProfile({...cur,xp:newXp});
    // ── Show centered modal instead of bottom toast ──
    setRedeemSuccess(prize);
    try{
      const isUUID=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      const insertRow={user_id:cur.id,prize_name:prize.name,status:"Pending",redeemed_at:new Date().toISOString()};
      if(prize.id&&isUUID(String(prize.id)))insertRow.prize_id=String(prize.id);
      const{error:redErr}=await supabase.from("redemptions").insert(insertRow);
      if(redErr)throw new Error(redErr.message);
      const{error:xpErr}=await supabase.from("profiles").update({xp:newXp}).eq("id",cur.id);
      if(xpErr)throw new Error(xpErr.message);
      try{await supabase.from("points_history").insert({user_id:cur.id,amount:pts,reason:`Redeemed: ${prize.name}`,type:"debit"});}catch(e){console.warn(e);}
      if(prize.id&&prize.stock!=null){try{await supabase.from("prizes").update({stock:Math.max(0,prize.stock-1)}).eq("id",prize.id);}catch(e){console.warn(e);}}
      const{data}=await supabase.from("redemptions").select("*").eq("user_id",cur.id);
      if(data)setMyRedemptions(data);
    }catch(err){
      console.error("Redeem error:",err);
      syncProfile(cur);
      setRedeemSuccess(null);
      showToast("❌ "+err.message);
    }
  };

  const today=new Date().toISOString().split("T")[0];
  const checkedIn=profile.last_checkin===today;
  const lv=getLevel(profile.xp);const pct=getLvlPct(profile.xp);
  const completedCount=myClaims.filter(c=>c.completed).length;
  const score=calcScore(profile.joined_date,completedCount);
  const tier=getTier(score);
  const unreadCount=notifications.filter(n=>!n.read).length;

  const Section=({children,style={}})=><div style={{background:BG2,borderRadius:16,overflow:"hidden",marginBottom:10,...style}}>{children}</div>;
  const Row=({label,detail,badge,last,onPress})=>(
    <div onClick={onPress} className={onPress?"btn card-press":""} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`,cursor:onPress?"pointer":"default"}}>
      <div style={{flex:1}}><div style={{fontSize:17,color:LBL}}>{label}</div>{detail&&<div style={{fontSize:14,color:LB3,marginTop:2}}>{detail}</div>}</div>
      {badge&&<div style={{background:ORG,color:"#fff",fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:99}}>{badge}</div>}
    </div>
  );
  const Chip=({color,children})=><span style={{background:color+"18",color,fontSize:13,fontWeight:700,padding:"4px 10px",borderRadius:99}}>{children}</span>;
  const PrimaryBtn=({children,onClick,disabled,color})=>(
    <button onClick={onClick} disabled={disabled} className="btn-primary ripple-container" onPointerDown={addRipple}
      style={{width:"100%",background:disabled?"#e5e5ea":color||ACC,color:disabled?LB3:"#fff",border:"none",borderRadius:14,padding:"17px",fontSize:18,fontWeight:700,cursor:disabled?"default":"pointer",fontFamily:SF}}>
      {children}
    </button>
  );

  const shared={
    profile,syncProfile,missions,myClaims,setMyClaims,
    allProfiles,announcements,myRedemptions,prizes,
    today,lv,pct,checkedIn,score,tier,completedCount,
    doRedeem,loadAll,showToast,
    Section,Row,Chip,PrimaryBtn,
    SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,
    getLevel,getLvlPct,calcScore,getTier,
    dmTarget,setDmTarget,setViewingProfile,
    onSwitchAccount,onAddAccount,onShowSwitcher,
    setDmOpen,
    showMissionAccepted:()=>setMissionAccepted(true),
  };

  const TABS=[
    {id:"home",    label:"Home",      emoji:"🏠"},
    {id:"missions",label:"Missions",  emoji:"🎯"},
    {id:"leaders", label:"Rankings",  emoji:"🏆"},
    {id:"prizes",  label:"Prizes",    emoji:"🎁"},
    {id:"chat",    label:"Community", emoji:"💬"},
    {id:"profile", label:"Profile",   emoji:"👤"},
  ];

  function NotifPanel(){
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <div style={{background:BG,borderRadius:"22px 22px 0 0",maxHeight:"78vh",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"18px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontSize:20,fontWeight:700,color:LBL}}>Notifications</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {unreadCount>0&&<button onClick={markAllRead} className="btn" style={{fontSize:14,color:ACC,fontWeight:700,background:`${ACC}10`,padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:SF}}>Mark all read</button>}
              <button onClick={()=>setShowNotif(false)} className="btn" style={{background:"rgba(0,0,0,.07)",border:"none",borderRadius:"50%",width:34,height:34,cursor:"pointer",fontSize:18,fontFamily:SF}}>✕</button>
            </div>
          </div>
          <div style={{overflowY:"auto",padding:"14px 16px 50px"}}>
            {notifications.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:17}}>No notifications yet</div>}
            {notifications.map((n,i)=>(
              <div key={n.id} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:i<notifications.length-1?`1px solid ${SEP}`:"none",opacity:n.read?.6:1}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:n.read?"transparent":ACC,marginTop:6,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,color:LBL,fontWeight:n.read?400:700}}>{n.title}</div>
                  {n.body&&<div style={{fontSize:14,color:LB3,marginTop:3,lineHeight:1.5,whiteSpace:"pre-line"}}>{n.body}</div>}
                  <div style={{fontSize:12,color:LB3,marginTop:5}}>{new Date(n.created_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function HomeTab(){
    const [now,setNow]=useState(new Date());
    const [showAllAnn,setShowAllAnn]=useState(false);
    useEffect(()=>{const iv=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(iv);},[]);
    const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
    const pad=n=>String(n).padStart(2,"0");
    const hours=now.getHours();const ampm=hours>=12?"PM":"AM";const h12=hours%12||12;
    const timeStr=`${pad(h12)}:${pad(now.getMinutes())} ${ampm}`;
    const dateStr=`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    return(
      <div style={{padding:"0 16px 16px"}}>
        <div className="fade" style={{background:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:16,padding:"16px 20px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.55)",marginBottom:4}}>{dateStr}</div>
            <div style={{fontSize:38,fontWeight:700,color:"#fff",letterSpacing:1,fontVariantNumeric:"tabular-nums"}}>{timeStr}</div>
          </div>
          <div style={{textAlign:"center",minWidth:70}}>
            {weather?(<><div style={{fontSize:38,lineHeight:1}}>{WX_ICON(weather.weathercode)}</div><div style={{fontSize:22,fontWeight:700,color:"#fff",marginTop:5}}>{Math.round(weather.temperature)}°C</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{WX_DESC(weather.weathercode)}</div></>):<div style={{fontSize:32,opacity:.3}}>🌡️</div>}
          </div>
        </div>
        <div className="fade" style={{background:`linear-gradient(145deg,${ACC},#0e2140)`,borderRadius:20,padding:22,marginBottom:10,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",background:`${ORG}15`,pointerEvents:"none"}}/>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:profile.avatar_url?`url(${profile.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,flexShrink:0,boxShadow:`0 4px 16px ${ORG}55`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:20,color:ACC,overflow:"hidden"}}>{!profile.avatar_url&&(profile.avatar||"?")}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:"-.5px",lineHeight:1.1}}>{profile.nickname||profile.name?.split(" ")[0]}</div>
              <div style={{fontSize:14,color:"rgba(255,255,255,.5)",marginTop:2}}>{profile.role}</div>
              <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:6,background:tier.color+"28",borderRadius:99,padding:"4px 12px"}}>
                <span style={{fontSize:14}}>{tier.emoji}</span><span style={{fontSize:13,color:tier.color,fontWeight:700}}>{tier.name}</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:28,fontWeight:700,color:ORG,letterSpacing:"-1px",lineHeight:1}}>{lv}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",letterSpacing:".3px",textTransform:"uppercase"}}>Level</div>
            </div>
          </div>
          <div style={{marginTop:18}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,.45)"}}>{profile.xp.toLocaleString()} pts</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.45)"}}>{pct}% to Lv.{lv+1}</div>
            </div>
            <div style={{background:"rgba(255,255,255,.12)",borderRadius:99,height:6}}>
              <div className="bar" style={{"--w":`${pct}%`,width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${ORG},#ffb940)`,borderRadius:99}}/>
            </div>
          </div>
        </div>
        <div className="fade" style={{background:BG2,borderRadius:16,padding:"16px",marginBottom:10,borderLeft:`4px solid ${tier.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:13,color:LB3,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase"}}>Contribution Tier</div>
            <span style={{fontSize:22}}>{tier.emoji}</span>
          </div>
          <div style={{fontSize:20,fontWeight:700,color:tier.color,marginBottom:3}}>{tier.name}</div>
          <div style={{fontSize:14,color:LB3,marginBottom:12}}>{score.toLocaleString()} pts · {tier.desc}</div>
          <div style={{display:"flex",gap:4}}>
            {[{n:"Rookie",m:0},{n:"Rising Star",m:100},{n:"Contributor",m:300},{n:"Champion",m:700},{n:"Legend",m:1500}].map((t,i,a)=>{
              const next=a[i+1];const active=score>=t.m&&(!next||score<next.m);const past=next&&score>=next.m;
              return(<div key={t.n} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:4,borderRadius:99,background:past||active?tier.color:"#e5e5ea"}}/><div style={{fontSize:9,color:active?tier.color:LB3,fontWeight:active?700:400,textAlign:"center",lineHeight:1.2}}>{t.n}</div></div>);
            })}
          </div>
        </div>
        <div className="fade" style={{background:BG2,borderRadius:16,padding:"18px",marginBottom:10}}>
          {checkedIn?(
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#34c75920",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>✅</div>
              <div><div style={{fontSize:18,color:LBL,fontWeight:600}}>Checked in today</div><div style={{fontSize:15,color:LB3,marginTop:2}}>{profile.streak}-day streak 🔥</div></div>
            </div>
          ):(
            <>
              <div style={{fontSize:14,color:LB3,textTransform:"uppercase",fontWeight:700,letterSpacing:".3px",marginBottom:12}}>Daily Check-In</div>
              <div style={{fontSize:16,color:LB2,marginBottom:16,lineHeight:1.5}}>Earn {profile.streak>=7?100:profile.streak>=3?75:50} pts · {profile.streak}-day streak.</div>
              <PrimaryBtn onClick={doCheckIn}>Check In  +{profile.streak>=7?100:profile.streak>=3?75:50} pts</PrimaryBtn>
            </>
          )}
        </div>
        <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          {[{l:"Points",v:profile.xp.toLocaleString(),e:"⚡"},{l:"Streak",v:`${profile.streak}d`,e:"🔥"},{l:"Missions",v:completedCount,e:"✅"}].map((s,i)=>(
            <div key={i} style={{background:BG2,borderRadius:16,padding:"16px 10px",textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:4}}>{s.e}</div>
              <div style={{fontSize:20,fontWeight:700,color:ACC,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:12,color:LB3,marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>
        {announcements.length>0&&(
          <div className="fade">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"14px 4px 10px"}}>
              <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700}}>📢 Announcements</div>
              {announcements.length>2&&<button onClick={()=>setShowAllAnn(p=>!p)} className="btn" style={{fontSize:14,color:ACC,fontWeight:700,background:"none",border:"none",cursor:"pointer",fontFamily:SF}}>{showAllAnn?"Show Less":"See All"}</button>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {(showAllAnn?announcements:announcements.slice(0,2)).map(a=>(
                <div key={a.id} style={{background:BG2,borderRadius:16,padding:"16px",borderLeft:a.pinned?`4px solid ${ORG}`:"none"}}>
                  {a.pinned&&<div style={{fontSize:12,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:6}}>📌 Pinned</div>}
                  <div style={{fontSize:17,color:LBL,fontWeight:600,marginBottom:5}}>{a.title}</div>
                  {a.body&&<div style={{fontSize:15,color:LB3,lineHeight:1.6,whiteSpace:"pre-line"}}>{a.body}</div>}
                  <div style={{fontSize:12,color:LB3,marginTop:8}}>{new Date(a.created_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {myRedemptions.filter(r=>r.status==="Pending").length>0&&(
          <div className="fade" style={{marginTop:10}}>
            <div style={{fontSize:14,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:700,margin:"14px 4px 10px"}}>Pending Rewards</div>
            <Section>{myRedemptions.filter(r=>r.status==="Pending").slice(0,3).map((r,i,a)=>(<Row key={r.id} label={r.prize_name} badge="Pending" last={i===a.length-1}/>))}</Section>
          </div>
        )}
      </div>
    );
  }

  const HEADER_H=58;const TABBAR_H=82;

  return(
    <div style={{height:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>

      {/* ── CENTERED Modals ── */}
      {redeemSuccess&&<RedeemSuccessModal prize={redeemSuccess} onClose={()=>setRedeemSuccess(null)}/>}
      {missionAccepted&&<MissionAcceptedModal onClose={()=>setMissionAccepted(false)}/>}
      {viewingProfile&&(
        <div className="page-enter-forward" style={{position:"fixed",inset:0,zIndex:50,maxWidth:430,margin:"0 auto",background:BG,overflowY:"auto"}}>
          <FullProfilePage user={viewingProfile} currentUserId={profile.id}
            onBack={()=>setViewingProfile(null)}
            onDM={u=>{setDmTarget(u);setViewingProfile(null);switchTab("chat");}}/>
        </div>
      )}

      {showNotif&&<NotifPanel/>}

      {popupNotif&&(
        <div className="toast-in"
          style={{position:"absolute",top:16,left:"50%",transform:"translateX(-50%)",background:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:18,padding:"16px 20px",maxWidth:"92vw",zIndex:300,boxShadow:"0 8px 32px rgba(0,0,0,.35)",cursor:"pointer",width:"calc(100% - 32px)"}}
          onClick={()=>{setPopupNotif(null);setShowNotif(true);}}>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{fontSize:26,flexShrink:0,lineHeight:1,marginTop:1}}>🔔</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:3,lineHeight:1.3}}>{popupNotif.title}</div>
              {popupNotif.body&&<div style={{fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{popupNotif.body}</div>}
            </div>
            <button onClick={e=>{e.stopPropagation();setPopupNotif(null);}} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:26,height:26,color:"#fff",fontSize:14,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
      )}

      {tab==="home"&&(
        <div style={{background:"rgba(242,242,247,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"14px 16px 12px",flexShrink:0,zIndex:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div onClick={()=>switchTab("home")} className="btn ripple-container" onPointerDown={addRipple} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderRadius:10,padding:"4px 8px 4px 0"}}>
              <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:34,height:34,borderRadius:8,objectFit:"cover"}}/>
              <div style={{fontSize:18,fontWeight:700,color:LBL}}>Techwide Hub</div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:ACC}}>{profile.xp.toLocaleString()} pts</div>
              <button onClick={()=>setShowNotif(true)} className="btn" style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:6}}>
                <span style={{fontSize:24}}>🔔</span>
                {unreadCount>0&&<div className="notif-dot" style={{position:"absolute",top:0,right:0,minWidth:18,height:18,background:"#ff3b30",borderRadius:99,fontSize:11,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{unreadCount}</div>}
              </button>
              <button onClick={()=>supabase.auth.signOut()} className="btn" style={{fontSize:14,color:"#ff3b30",fontWeight:600,background:"rgba(255,59,48,.1)",padding:"5px 11px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:SF}}>Out</button>
            </div>
          </div>
          <div style={{fontSize:28,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginTop:8}}>Hello, {(profile.nickname||profile.name||"").split(" ")[0]} 👋</div>
        </div>
      )}

      {tab!=="home"&&tab!=="chat"&&(
        <div style={{background:"rgba(242,242,247,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"16px 16px 14px",flexShrink:0,zIndex:20,display:"flex",alignItems:"center",gap:14}}>
          <button onClick={()=>switchTab("home")} className="btn" style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:ACC,padding:0}}>←</button>
          <div style={{fontSize:22,fontWeight:700,color:LBL,letterSpacing:"-.4px",flex:1}}>
            {tab==="missions"&&"🎯 Missions"}{tab==="leaders"&&"🏆 Leaderboard"}{tab==="prizes"&&"🎁 Prize Shop"}{tab==="profile"&&"👤 My Profile"}
          </div>
          <button onClick={()=>setShowNotif(true)} className="btn" style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:4}}>
            <span style={{fontSize:22}}>🔔</span>
            {unreadCount>0&&<div style={{position:"absolute",top:0,right:0,minWidth:16,height:16,background:"#ff3b30",borderRadius:99,fontSize:10,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{unreadCount}</div>}
          </button>
        </div>
      )}

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
        {tab!=="chat"&&(
          <div key={tabKey} className="page-enter-forward" style={{flex:1,overflowY:"auto",paddingBottom:`calc(82px + env(safe-area-inset-bottom))`}}>
            <div style={{padding:"14px 0 0"}}>
              {tab==="home"    &&<HomeTab/>}
              {tab==="missions"&&<MissionsTab{...shared} showMissionAccepted={shared.showMissionAccepted}/>}
              {tab==="leaders" &&<LeaderboardTab{...shared}/>}
              {tab==="prizes"  &&<PrizesTab{...shared}/>}
              {tab==="profile" &&<ProfileTab{...shared}/>}
            </div>
          </div>
        )}
        {tab==="chat"&&(
          <div key={tabKey+"chat"} className="page-enter-forward"
            style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0,paddingBottom:`calc(82px + env(safe-area-inset-bottom))`}}>
            <CommunityTab{...shared}/>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(249,249,249,.97)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,.1)",display:dmOpen?"none":"flex",zIndex:20,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>switchTab(t.id)} className="tab-btn"
            style={{flex:1,padding:"11px 2px 15px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer"}}>
            <div style={{fontSize:tab===t.id?30:26,lineHeight:1,filter:tab===t.id?"none":"grayscale(1) opacity(.35)",transition:"font-size .2s cubic-bezier(.34,1.56,.64,1)"}}>{t.emoji}</div>
            <div style={{fontSize:11,fontWeight:tab===t.id?700:400,color:tab===t.id?ACC:"#8e8e93",fontFamily:SF,transition:"color .15s"}}>{t.label}</div>
          </button>
        ))}
      </div>

      {toast&&(
        <div className="toast-in" style={{position:"absolute",bottom:110,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.82)",backdropFilter:"blur(16px)",borderRadius:99,padding:"12px 24px",fontSize:15,color:"#fff",fontWeight:600,whiteSpace:"nowrap",zIndex:50,pointerEvents:"none",maxWidth:"88vw",textAlign:"center"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
