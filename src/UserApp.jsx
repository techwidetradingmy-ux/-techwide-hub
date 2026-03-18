import{useState,useEffect}from"react";
import{supabase}from"./supabaseClient";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore,formatContact}from"./constants";
import{MissionsTab,LeaderboardTab,PrizesTab,CommunityTab,ProfileTab}from"./UserTabs";

const XP_T=[0,500,1200,2000,3000,4500,6500,9000,12000];
const getLevel=xp=>{let l=1;for(let i=1;i<XP_T.length;i++)if(xp>=XP_T[i])l=i+1;return Math.min(l,XP_T.length);};
const getLvlPct=xp=>{const l=getLevel(xp)-1;const s=XP_T[l]||0;const e=XP_T[l+1]||s+1;return Math.round(((xp-s)/(e-s))*100);};

export default function UserApp({profile:init,session,onProfileUpdate}){
  const [profile,setProfile]=useState(init);
  const [tab,setTab]=useState("home");
  const [missions,setMissions]=useState([]);
  const [myClaims,setMyClaims]=useState([]);
  const [allProfiles,setAllProfiles]=useState([]);
  const [announcements,setAnnouncements]=useState([]);
  const [myRedemptions,setMyRedemptions]=useState([]);
  const [prizes,setPrizes]=useState([]);
  const [notifications,setNotifications]=useState([]);
  const [toast,setToast]=useState(null);
  const [dmTarget,setDmTarget]=useState(null);
  const [showNotif,setShowNotif]=useState(false);

  const syncProfile=u=>{setProfile(u);onProfileUpdate(u);};

  useEffect(()=>{
    loadAll();
    loadNotifications();
    const iv=setInterval(loadNotifications,15000);
    return()=>clearInterval(iv);
  },[]);

  useEffect(()=>{if(dmTarget)setTab("chat");},[dmTarget]);

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
    if(m.data)setMissions(m.data);
    if(c.data)setMyClaims(c.data);
    if(ap.data)setAllProfiles(ap.data);
    if(a.data)setAnnouncements(a.data);
    if(r.data)setMyRedemptions(r.data);
    if(p.data)setPrizes(p.data.length>0?p.data:PRIZES.map(x=>({...x,id:x.id,cost:x.pts,category:x.cat})));
  };

  const loadNotifications=async()=>{
    const{data}=await supabase.from("notifications").select("*").eq("user_id",profile.id).order("created_at",{ascending:false}).limit(20);
    if(data)setNotifications(data);
    if(data&&"Notification" in window&&Notification.permission==="granted"){
      const unread=data.filter(n=>!n.read);
      if(unread.length>0&&document.hidden){
        new Notification(unread[0].title,{body:unread[0].body,icon:"/TECHWIDE_LOGO.png"});
      }
    }
  };

  const markAllRead=async()=>{
    await supabase.from("notifications").update({read:true}).eq("user_id",profile.id).eq("read",false);
    setNotifications(p=>p.map(n=>({...n,read:true})));
  };

  useEffect(()=>{
    if("Notification" in window&&Notification.permission==="default")
      Notification.requestPermission();
  },[]);

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2800);};

  const doCheckIn=async()=>{
    const today=new Date().toISOString().split("T")[0];
    if(profile.last_checkin===today){showToast("Already checked in today 😊");return;}
    const bonus=profile.streak>=7?100:profile.streak>=3?75:50;
    const streak=profile.streak+1;
    await supabase.from("profiles").update({xp:profile.xp+bonus,streak,last_checkin:today}).eq("id",profile.id);
    const updated={...profile,xp:profile.xp+bonus,streak,last_checkin:today};
    syncProfile(updated);
    setAllProfiles(p=>p.map(x=>x.id===profile.id?updated:x).sort((a,b)=>b.xp-a.xp));
    showToast(`+${bonus} pts  •  ${streak}-day streak 🔥`);
  };

  const doClaimMission=async missionId=>{
    if(myClaims.find(c=>c.mission_id===missionId)){showToast("Already claimed");return;}
    const{error}=await supabase.from("mission_claims").insert({user_id:profile.id,mission_id:missionId});
    if(!error){
      const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
      if(data)setMyClaims(data);
      showToast("Mission claimed! Submit proof when done.");
    }
  };

  const doRedeem=async prize=>{
    const pts=prize.pts||prize.cost;
    if(profile.xp<pts){showToast(`Need ${(pts-profile.xp).toLocaleString()} more pts`);return;}
    if((prize.stock||99)<1){showToast("Out of stock");return;}
    await supabase.from("redemptions").insert({user_id:profile.id,prize_id:prize.id?.toString(),prize_name:prize.name,status:"Pending"});
    await supabase.from("profiles").update({xp:profile.xp-pts}).eq("id",profile.id);
    if(prize.stock)await supabase.from("prizes").update({stock:prize.stock-1}).eq("id",prize.id);
    syncProfile({...profile,xp:profile.xp-pts});
    const{data}=await supabase.from("redemptions").select("*").eq("user_id",profile.id);
    if(data)setMyRedemptions(data);
    showToast(`${prize.name} redeemed! 🎉`);
  };

  const today=new Date().toISOString().split("T")[0];
  const checkedIn=profile.last_checkin===today;
  const lv=getLevel(profile.xp);
  const pct=getLvlPct(profile.xp);
  const completedCount=myClaims.filter(c=>c.completed).length;
  const score=calcScore(profile.joined_date,completedCount);
  const tier=getTier(score);
  const unreadCount=notifications.filter(n=>!n.read).length;

  const Section=({children,style={}})=><div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8,...style}}>{children}</div>;
  const Row=({label,detail,badge,last,onPress})=>(
    <div onClick={onPress} className={onPress?"btn":""} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`,cursor:onPress?"pointer":"default"}}>
      <div style={{flex:1}}><div style={{fontSize:17,color:LBL,letterSpacing:"-.3px"}}>{label}</div>{detail&&<div style={{fontSize:13,color:LB3,marginTop:1}}>{detail}</div>}</div>
      {badge&&<div style={{background:ORG,color:"#fff",fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:99}}>{badge}</div>}
    </div>
  );
  const Chip=({color,children})=><span style={{background:color+"18",color,fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99}}>{children}</span>;
  const PrimaryBtn=({children,onClick,disabled,color})=>(
    <button onClick={onClick} disabled={disabled} className="btn-primary"
      style={{width:"100%",background:disabled?"#e5e5ea":color||ACC,color:disabled?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:disabled?"default":"pointer",fontFamily:SF}}>
      {children}
    </button>
  );

  const shared={
    profile,syncProfile,missions,myClaims,setMyClaims,
    allProfiles,announcements,myRedemptions,prizes,
    today,lv,pct,checkedIn,score,tier,completedCount,
    doClaimMission,doRedeem,loadAll,showToast,
    Section,Row,Chip,PrimaryBtn,
    SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,
    getLevel,getLvlPct,calcScore,getTier,
    dmTarget,setDmTarget,
  };

  const TABS=[
    {id:"home",    label:"Home",      emoji:"🏠"},
    {id:"missions",label:"Missions",  emoji:"🎯"},
    {id:"leaders", label:"Rankings",  emoji:"🏆"},
    {id:"prizes",  label:"Prizes",    emoji:"🎁"},
    {id:"chat",    label:"Community", emoji:"💬"},
    {id:"profile", label:"Profile",   emoji:"👤"},
  ];

  // ── NOTIFICATIONS PANEL ───────────────────────────────────────────
  function NotifPanel(){
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <div style={{background:BG,borderRadius:"20px 20px 0 0",maxHeight:"70vh",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontSize:18,fontWeight:700,color:LBL,letterSpacing:"-.4px"}}>Notifications</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {unreadCount>0&&<button onClick={markAllRead} className="btn" style={{fontSize:13,color:ACC,fontWeight:600,background:`${ACC}10`,padding:"4px 10px",borderRadius:99,border:"none",cursor:"pointer",fontFamily:SF}}>Mark all read</button>}
              <button onClick={()=>setShowNotif(false)} className="btn" style={{background:"rgba(0,0,0,.07)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:16,fontFamily:SF}}>✕</button>
            </div>
          </div>
          <div style={{overflowY:"auto",padding:"12px 16px 40px"}}>
            {notifications.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No notifications yet</div>}
            {notifications.map((n,i)=>(
              <div key={n.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<notifications.length-1?`1px solid ${SEP}`:"none",opacity:n.read?.6:1}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:n.read?"transparent":ACC,marginTop:6,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,color:LBL,fontWeight:n.read?400:600}}>{n.title}</div>
                  {n.body&&<div style={{fontSize:13,color:LB3,marginTop:2,lineHeight:1.45}}>{n.body}</div>}
                  <div style={{fontSize:11,color:LB3,marginTop:4}}>{new Date(n.created_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── HOME TAB ──────────────────────────────────────────────────────
  function HomeTab(){
    const [now,setNow]=useState(new Date());
    useEffect(()=>{
      const iv=setInterval(()=>setNow(new Date()),1000);
      return()=>clearInterval(iv);
    },[]);
    const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
    const pad=n=>String(n).padStart(2,"0");
    const timeStr=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const dateStr=`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

    return(
      <div style={{padding:"0 16px 12px"}}>

        {/* ── Live Date & Time ── */}
        <div className="fade" style={{background:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:14,padding:"14px 18px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.55)",marginBottom:3,letterSpacing:"-.1px"}}>{dateStr}</div>
            <div style={{fontSize:32,fontWeight:700,color:"#fff",letterSpacing:2,fontVariantNumeric:"tabular-nums"}}>{timeStr}</div>
          </div>
          <div style={{fontSize:40,opacity:.5}}>🕐</div>
        </div>

        {/* ── Hero card ── */}
        <div className="fade" style={{background:`linear-gradient(145deg,${ACC},#0e2140)`,borderRadius:18,padding:20,marginBottom:8,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:`${ORG}15`,pointerEvents:"none"}}/>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:58,height:58,borderRadius:"50%",background:profile.avatar_url?`url(${profile.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,flexShrink:0,boxShadow:`0 4px 16px ${ORG}55`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,color:ACC,overflow:"hidden"}}>
              {!profile.avatar_url&&(profile.avatar||"?")}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:700,color:"#fff",letterSpacing:"-.5px",lineHeight:1.1}}>{profile.nickname||profile.name?.split(" ")[0]}</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginTop:1}}>{profile.role}</div>
              <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,background:tier.color+"28",borderRadius:99,padding:"3px 10px"}}>
                <span style={{fontSize:13}}>{tier.emoji}</span>
                <span style={{fontSize:12,color:tier.color,fontWeight:700}}>{tier.name}</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:26,fontWeight:700,color:ORG,letterSpacing:"-1px",lineHeight:1}}>{lv}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.4)",letterSpacing:".3px",textTransform:"uppercase"}}>Level</div>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>{profile.xp.toLocaleString()} pts</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>{pct}% to Lv.{lv+1}</div>
            </div>
            <div style={{background:"rgba(255,255,255,.12)",borderRadius:99,height:5}}>
              <div className="bar" style={{"--w":`${pct}%`,width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${ORG},#ffb940)`,borderRadius:99}}/>
            </div>
          </div>
        </div>

        {/* ── Tier progress ── */}
        <div className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:`3px solid ${tier.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:12,color:LB3,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase"}}>Contribution Tier</div>
            <span style={{fontSize:20}}>{tier.emoji}</span>
          </div>
          <div style={{fontSize:19,fontWeight:700,color:tier.color,letterSpacing:"-.4px",marginBottom:2}}>{tier.name}</div>
          <div style={{fontSize:13,color:LB3,marginBottom:10}}>{score.toLocaleString()} pts · {tier.desc}</div>
          <div style={{display:"flex",gap:3,alignItems:"center"}}>
            {[{n:"Rookie",m:0},{n:"Rising Star",m:100},{n:"Contributor",m:300},{n:"Champion",m:700},{n:"Legend",m:1500}].map((t,i,a)=>{
              const next=a[i+1],active=score>=t.m&&(!next||score<next.m),past=next&&score>=next.m;
              return(
                <div key={t.n} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",height:3,borderRadius:99,background:past||active?tier.color:"#e5e5ea"}}/>
                  <div style={{fontSize:8,color:active?tier.color:LB3,fontWeight:active?700:400,textAlign:"center",lineHeight:1.2}}>{t.n}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Check-in ── */}
        <div className="fade" style={{background:BG2,borderRadius:13,padding:16,marginBottom:8}}>
          {checkedIn?(
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#34c75920",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✅</div>
              <div>
                <div style={{fontSize:17,color:LBL,fontWeight:500}}>Checked in today</div>
                <div style={{fontSize:14,color:LB3,marginTop:1}}>{profile.streak}-day streak 🔥</div>
              </div>
            </div>
          ):(
            <>
              <div style={{fontSize:13,color:LB3,textTransform:"uppercase",fontWeight:600,letterSpacing:".3px",marginBottom:10}}>Daily Check-In</div>
              <div style={{fontSize:15,color:LB2,marginBottom:14,lineHeight:1.4}}>Earn {profile.streak>=7?100:profile.streak>=3?75:50} pts. {profile.streak}-day streak.</div>
              <PrimaryBtn onClick={doCheckIn}>Check In  +{profile.streak>=7?100:profile.streak>=3?75:50} pts</PrimaryBtn>
            </>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          {[
            {l:"Points", v:profile.xp.toLocaleString(), e:"⚡"},
            {l:"Streak",  v:`${profile.streak}d`,         e:"🔥"},
            {l:"Missions",v:completedCount,               e:"✅"},
          ].map((s,i)=>(
            <div key={i} style={{background:BG2,borderRadius:13,padding:"13px 10px",textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:3}}>{s.e}</div>
              <div style={{fontSize:19,fontWeight:700,color:ACC,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10,color:LB3,marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── Pinned announcement ── */}
        {announcements.find(a=>a.pinned)&&(()=>{
          const a=announcements.find(x=>x.pinned);
          return(
            <div className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:`3px solid ${ORG}`}}>
              <div style={{fontSize:11,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:5}}>📌 Pinned</div>
              <div style={{fontSize:16,color:LBL,fontWeight:500,marginBottom:4}}>{a.title}</div>
              <div style={{fontSize:14,color:LB3,lineHeight:1.5}}>{a.body}</div>
            </div>
          );
        })()}

        {/* ── Pending rewards ── */}
        {myRedemptions.filter(r=>r.status==="Pending").length>0&&(
          <div className="fade">
            <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"12px 4px 8px"}}>Pending Rewards</div>
            <Section>
              {myRedemptions.filter(r=>r.status==="Pending").slice(0,3).map((r,i,a)=>(
                <Row key={r.id} label={r.prize_name} badge={r.status} last={i===a.length-1}/>
              ))}
            </Section>
          </div>
        )}
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      {showNotif&&<NotifPanel/>}

      {/* Header */}
      <div style={{background:"rgba(242,242,247,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"12px 16px 10px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:30,height:30,borderRadius:7,objectFit:"cover"}}/>
            <div style={{fontSize:17,fontWeight:600,color:LBL,letterSpacing:"-.3px"}}>Techwide Hub</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:600,color:ACC}}>{profile.xp.toLocaleString()} pts</div>
            <button onClick={()=>setShowNotif(true)} className="btn" style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:4}}>
              <span style={{fontSize:20}}>🔔</span>
              {unreadCount>0&&(
                <div className="notif-dot" style={{position:"absolute",top:0,right:0,minWidth:16,height:16,background:"#ff3b30",borderRadius:99,fontSize:10,color:"#fff",fontWeight:700,display:"flex",
