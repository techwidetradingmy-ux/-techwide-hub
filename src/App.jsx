import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const SF  = `-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif`;
const BG  = "#f2f2f7", BG2 = "#ffffff", SEP = "#e5e5ea";
const LBL = "#000000", LB2 = "rgba(60,60,67,.8)", LB3 = "rgba(60,60,67,.6)";
const ACC = "#1c3258", ORG = "#f69219";
const DIFF_C = { Easy:"#34c759", Medium:"#ff9500", Hard:"#ff3b30" };
const CAT_C  = { Sales:"#5856d6", Teamwork:"#007aff", Admin:"#af52de",
  Creativity:"#ff2d55", Cash:"#34c759","Time Off":"#007aff",
  Experience:"#ff9500", Shopping:"#ff2d55", Merch:"#5856d6" };
const XP_THRESH = [0,500,1200,2000,3000,4500,6500,9000,12000];
const getLevel  = xp => { let l=1; for(let i=1;i<XP_THRESH.length;i++) if(xp>=XP_THRESH[i]) l=i+1; return Math.min(l,XP_THRESH.length); };
const getLvlPct = xp => { const l=getLevel(xp)-1; const s=XP_THRESH[l]||0; const e=XP_THRESH[l+1]||s+1; return Math.round(((xp-s)/(e-s))*100); };

export default function App() {
  const [session,       setSession]       = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [allProfiles,   setAllProfiles]   = useState([]);
  const [missions,      setMissions]      = useState([]);
  const [myClaims,      setMyClaims]      = useState([]);
  const [prizes,        setPrizes]        = useState([]);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState("home");
  const [toast,         setToast]         = useState(null);
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPass,     setLoginPass]     = useState("");
  const [loginErr,      setLoginErr]      = useState("");
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [mForm, setMForm] = useState({ title:"", description:"", xp:150, category:"Sales", difficulty:"Medium", period:"Daily" });
  const [aForm, setAForm] = useState({ title:"", body:"", pinned:false });
  const [pForm, setPForm] = useState({ name:"", cost:500, stock:10, icon:"🎁", category:"Cash" });

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
      body{background:${BG};font-family:${SF};}
      ::-webkit-scrollbar{display:none;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes barFill{from{width:0}to{width:var(--w)}}
      @keyframes toastIn{from{opacity:0;transform:translateY(10px)scale(.95)}to{opacity:1;transform:translateY(0)scale(1)}}
      @keyframes scaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      .fade{animation:fadeUp .28s cubic-bezier(.4,0,.2,1) both}
      .bar{animation:barFill .7s cubic-bezier(.4,0,.2,1) both}
      .toast-in{animation:toastIn .3s cubic-bezier(.34,1.2,.64,1) both}
      .pressable:active{opacity:.6;transform:scale(.98);transition:all .1s;}
      input,textarea,button{font-family:${SF};}
    `;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadAll(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadAll = async (uid) => {
    setLoading(true);
    await Promise.all([
      loadProfile(uid), loadAllProfiles(), loadMissions(),
      loadClaims(uid),  loadPrizes(),      loadRedemptions(uid), loadAnnouncements()
    ]);
    setLoading(false);
  };

  const loadProfile       = async (uid) => { const {data}=await supabase.from("profiles").select("*").eq("id",uid).single(); if(data) setProfile(data); };
  const loadAllProfiles   = async ()    => { const {data}=await supabase.from("profiles").select("*").order("xp",{ascending:false}); if(data) setAllProfiles(data); };
  const loadMissions      = async ()    => { const {data}=await supabase.from("missions").select("*").eq("active",true); if(data) setMissions(data); };
  const loadClaims        = async (uid) => { const {data}=await supabase.from("mission_claims").select("*").eq("user_id",uid); if(data) setMyClaims(data); };
  const loadPrizes        = async ()    => { const {data}=await supabase.from("prizes").select("*").eq("active",true); if(data) setPrizes(data); };
  const loadRedemptions   = async (uid) => { const {data}=await supabase.from("redemptions").select("*").eq("user_id",uid).order("redeemed_at",{ascending:false}); if(data) setMyRedemptions(data); };
  const loadAnnouncements = async ()    => { const {data}=await supabase.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}); if(data) setAnnouncements(data); };

  const doLogin = async () => {
    setLoginErr(""); setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPass });
    if (error) { setLoginErr(error.message); setLoginLoading(false); }
    else { const uid=(await supabase.auth.getUser()).data.user.id; await loadAll(uid); setLoginLoading(false); }
  };

  const doLogout = async () => { await supabase.auth.signOut(); setTab("home"); };

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  const doCheckIn = async () => {
    const today = new Date().toISOString().split("T")[0];
    if (profile.last_checkin === today) { showToast("Already checked in today","warn"); return; }
    const bonus = profile.streak>=7?100:profile.streak>=3?75:50;
    const streak = profile.streak+1;
    await supabase.from("profiles").update({ xp:profile.xp+bonus, streak, last_checkin:today }).eq("id",profile.id);
    const updated = {...profile, xp:profile.xp+bonus, streak, last_checkin:today};
    setProfile(updated);
    setAllProfiles(p=>p.map(x=>x.id===profile.id?updated:x).sort((a,b)=>b.xp-a.xp));
    showToast(`+${bonus} XP  •  ${streak}-day streak 🔥`);
  };

  const doClaimMission = async (missionId) => {
    if (myClaims.find(c=>c.mission_id===missionId)) { showToast("Already claimed","warn"); return; }
    const { error } = await supabase.from("mission_claims").insert({ user_id:profile.id, mission_id:missionId });
    if (!error) { await loadClaims(profile.id); showToast("Mission claimed — mark done when finished"); }
  };

  const doComplete = async (missionId) => {
    const claim = myClaims.find(c=>c.mission_id===missionId);
    if (!claim || claim.completed) return;
    const mission = missions.find(m=>m.id===missionId);
    await supabase.from("mission_claims").update({ completed:true, completed_at:new Date().toISOString() }).eq("id",claim.id);
    await supabase.from("profiles").update({ xp:profile.xp+mission.xp }).eq("id",profile.id);
    const updated = {...profile, xp:profile.xp+mission.xp};
    setProfile(updated);
    setAllProfiles(p=>p.map(x=>x.id===profile.id?updated:x).sort((a,b)=>b.xp-a.xp));
    await loadClaims(profile.id);
    showToast(`+${mission.xp} XP earned 🏆`);
  };

  const doRedeem = async (prizeId) => {
    const prize = prizes.find(p=>p.id===prizeId);
    if (!prize || prize.stock<1) { showToast("Out of stock","err"); return; }
    if (profile.xp<prize.cost)   { showToast(`Need ${(prize.cost-profile.xp).toLocaleString()} more XP`,"err"); return; }
    await supabase.from("redemptions").insert({ user_id:profile.id, prize_id:prizeId, prize_name:prize.name });
    await supabase.from("profiles").update({ xp:profile.xp-prize.cost }).eq("id",profile.id);
    await supabase.from("prizes").update({ stock:prize.stock-1 }).eq("id",prizeId);
    setProfile(p=>({...p, xp:p.xp-prize.cost}));
    await Promise.all([loadPrizes(), loadRedemptions(profile.id)]);
    showToast(`${prize.name} redeemed — pending approval`);
  };

  const addMission = async () => {
    if (!mForm.title.trim()) return;
    await supabase.from("missions").insert({...mForm, xp:+mForm.xp});
    await loadMissions();
    setMForm({title:"",description:"",xp:150,category:"Sales",difficulty:"Medium",period:"Daily"});
    showToast("Mission added");
  };

  const addAnnouncement = async () => {
    if (!aForm.title.trim()) return;
    await supabase.from("announcements").insert(aForm);
    await loadAnnouncements();
    setAForm({title:"",body:"",pinned:false});
    showToast("Announcement posted");
  };

  const addPrize = async () => {
    if (!pForm.name.trim()) return;
    await supabase.from("prizes").insert({...pForm, cost:+pForm.cost, stock:+pForm.stock});
    await loadPrizes();
    setPForm({name:"",cost:500,stock:10,icon:"🎁",category:"Cash"});
    showToast("Prize added");
  };

  // ── SHARED UI ──
  const Section = ({children, style={}}) => (
    <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8,...style}}>{children}</div>
  );
  const Row = ({label,detail,value,badge,chevron,last,onPress}) => (
    <div onClick={onPress} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",background:BG2,borderBottom:last?`none`:`1px solid ${SEP}`,cursor:onPress?"pointer":"default"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:17,color:LBL,letterSpacing:"-.3px"}}>{label}</div>
        {detail&&<div style={{fontSize:13,color:LB3,marginTop:1,letterSpacing:"-.2px"}}>{detail}</div>}
      </div>
      {badge&&<div style={{background:ORG,color:"#fff",fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:99}}>{badge}</div>}
      {value&&<div style={{fontSize:16,color:LB3,letterSpacing:"-.3px"}}>{value}</div>}
      {chevron&&<div style={{color:LB3,fontSize:20}}>›</div>}
    </div>
  );
  const PrimaryBtn = ({children, onClick, disabled, loading:l}) => (
    <button onClick={onClick} disabled={disabled||l}
      style={{width:"100%",background:disabled||l?"#e5e5ea":ACC,color:disabled||l?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,letterSpacing:"-.3px",cursor:disabled?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
      {l&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
      {children}
    </button>
  );
  const Chip = ({color,children}) => (
    <span style={{background:color+"18",color,fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99,letterSpacing:"-.1px"}}>{children}</span>
  );
  const FormRow = ({label,children,last}) => (
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?`none`:`1px solid ${SEP}`}}>
      {label&&<div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>}
      {children}
    </div>
  );
  const StyledInput = ({value, onChange, placeholder, type="text", multiline, onKeyDown}) => multiline
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
        style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,letterSpacing:"-.3px",resize:"none",padding:0,lineHeight:1.45,fontFamily:SF}}/>
    : <input value={value} onChange={onChange} placeholder={placeholder} type={type} onKeyDown={onKeyDown}
        style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,letterSpacing:"-.3px",fontFamily:SF}}/>;

  // ── LOADING ──
  if (loading) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:SF}}>
      <div style={{width:56,height:56,background:`linear-gradient(145deg,${ACC},${ORG})`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>⚡</div>
      <div style={{width:24,height:24,border:`2px solid ${SEP}`,borderTop:`2px solid ${ACC}`,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <div style={{fontSize:15,color:LB3,letterSpacing:"-.2px"}}>Loading TechWide Hub…</div>
    </div>
  );

  // ── LOGIN ──
  if (!session || !profile) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
      <div className="fade" style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:72,height:72,background:`linear-gradient(145deg,${ACC},${ORG})`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",boxShadow:`0 8px 24px ${ORG}40`}}>⚡</div>
        <div style={{fontSize:28,fontWeight:700,color:LBL,letterSpacing:"-.6px"}}>TechWide Hub</div>
        <div style={{fontSize:16,color:LB3,marginTop:4,letterSpacing:"-.2px"}}>Sign in to continue</div>
      </div>
      <div className="fade" style={{width:"100%",maxWidth:360}}>
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email</div>
            <input
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              autoComplete="email"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,letterSpacing:"-.3px",fontFamily:SF}}
            />
          </div>
          <div style={{padding:"11px 16px"}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password</div>
            <input
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              onKeyDown={e => e.key==="Enter" && doLogin()}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,letterSpacing:"-.3px",fontFamily:SF}}
            />
          </div>
        </div>
        {loginErr && <div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,letterSpacing:"-.2px"}}>{loginErr}</div>}
        <PrimaryBtn onClick={doLogin} loading={loginLoading}>Sign In</PrimaryBtn>
        <div style={{textAlign:"center",fontSize:13,color:LB3,marginTop:20,letterSpacing:"-.1px"}}>Contact admin to get your login details</div>
      </div>
    </div>
  );

  // ── APP STATE ──
  const today     = new Date().toISOString().split("T")[0];
  const checkedIn = profile.last_checkin === today;
  const lv        = getLevel(profile.xp);
  const pct       = getLvlPct(profile.xp);
  const TABS = [
    {id:"home",     label:"Home",     emoji:"🏠"},
    {id:"missions", label:"Missions", emoji:"🎯"},
    {id:"prizes",   label:"Prizes",   emoji:"🎁"},
    {id:"board",    label:"Ranks",    emoji:"🏆"},
    {id:"news",     label:"News",     emoji:"📢"},
    ...(profile.is_admin?[{id:"admin",label:"Admin",emoji:"⚙️"}]:[]),
  ];

  // ── HOME ──
  function HomeTab() {
    return (
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{background:`linear-gradient(145deg,${ACC},#0e2140)`,borderRadius:18,padding:20,marginBottom:8,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:`${ORG}18`,pointerEvents:"none"}}/>
          <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,color:ACC,flexShrink:0,boxShadow:`0 4px 16px ${ORG}55`}}>{profile.avatar}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:"-.5px",lineHeight:1.1}}>{profile.name}</div>
              <div style={{fontSize:14,color:"rgba(255,255,255,.5)",marginTop:2,letterSpacing:"-.2px"}}>{profile.role}</div>
              <div style={{display:"flex",gap:4,marginTop:8}}>{(profile.badges||[]).map((b,i)=><span key={i} style={{fontSize:18}}>{b}</span>)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:28,fontWeight:700,color:ORG,letterSpacing:"-1px",lineHeight:1}}>{lv}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",letterSpacing:".3px",textTransform:"uppercase"}}>Level</div>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>{profile.xp.toLocaleString()} XP</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.45)"}}>{pct}% to Lv.{lv+1}</div>
            </div>
            <div style={{background:"rgba(255,255,255,.12)",borderRadius:99,height:5}}>
              <div className="bar" style={{"--w":`${pct}%`,width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${ORG},#ffb940)`,borderRadius:99}}/>
            </div>
          </div>
        </div>

        <div className="fade" style={{background:BG2,borderRadius:13,padding:16,marginBottom:8}}>
          {checkedIn ? (
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:"#34c75920",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✅</div>
              <div>
                <div style={{fontSize:17,color:LBL,fontWeight:500,letterSpacing:"-.3px"}}>Checked in today</div>
                <div style={{fontSize:14,color:LB3,marginTop:1,letterSpacing:"-.2px"}}>{profile.streak}-day streak 🔥</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize:13,color:LB3,letterSpacing:".3px",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Daily Check-In</div>
              <div style={{fontSize:15,color:LB2,marginBottom:14,letterSpacing:"-.2px",lineHeight:1.4}}>Earn {profile.streak>=7?100:profile.streak>=3?75:50} XP. You're on a {profile.streak}-day streak.</div>
              <PrimaryBtn onClick={doCheckIn}>Check In  +{profile.streak>=7?100:profile.streak>=3?75:50} XP</PrimaryBtn>
            </>
          )}
        </div>

        <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          {[{l:"Total XP",v:profile.xp.toLocaleString(),e:"⚡"},{l:"Streak",v:`${profile.streak}d`,e:"🔥"},{l:"Missions",v:myClaims.filter(c=>c.completed).length,e:"✅"}].map((s,i)=>(
            <div key={i} style={{background:BG2,borderRadius:13,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{s.e}</div>
              <div style={{fontSize:20,fontWeight:700,color:ACC,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:11,color:LB3,marginTop:3,letterSpacing:"-.1px"}}>{s.l}</div>
            </div>
          ))}
        </div>

        {announcements.filter(a=>a.pinned)[0] && (() => { const a=announcements.find(x=>x.pinned); return (
          <div className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:`3px solid ${ORG}`}}>
            <div style={{fontSize:11,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:5}}>📌 Pinned</div>
            <div style={{fontSize:16,color:LBL,fontWeight:500,letterSpacing:"-.3px",marginBottom:4}}>{a.title}</div>
            <div style={{fontSize:14,color:LB3,lineHeight:1.5,letterSpacing:"-.1px"}}>{a.body}</div>
          </div>
        );})()}

        {myRedemptions.length>0 && (
          <div className="fade">
            <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"12px 4px 8px"}}>Pending Rewards</div>
            <Section>{myRedemptions.slice(0,3).map((r,i,a)=><Row key={r.id} label={r.prize_name} badge={r.status} last={i===a.length-1}/>)}</Section>
          </div>
        )}
      </div>
    );
  }

  // ── MISSIONS ──
  function MissionsTab() {
    const [f, setF] = useState("All");
    const cats = ["All","Sales","Teamwork","Admin","Creativity"];
    const list = f==="All" ? missions : missions.filter(m=>m.category===f);
    return (
      <div style={{padding:"0 16px 12px"}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}} className="fade">
          {cats.map(c=>(
            <button key={c} onClick={()=>setF(c)} style={{flexShrink:0,padding:"6px 15px",borderRadius:99,fontSize:14,fontWeight:f===c?600:400,letterSpacing:"-.2px",background:f===c?ACC:"rgba(0,0,0,.06)",color:f===c?"#fff":LB2,border:"none",cursor:"pointer",transition:"all .15s",fontFamily:SF}}>{c}</button>
          ))}
        </div>
        {list.length===0 && <div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No missions yet</div>}
        {list.map(m => {
          const claim = myClaims.find(c=>c.mission_id===m.id);
          const done  = claim?.completed;
          return (
            <div key={m.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,opacity:done?.6:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1,marginRight:12}}>
                  <div style={{fontSize:17,color:done?LB3:LBL,fontWeight:500,letterSpacing:"-.35px",textDecoration:done?"line-through":"none",marginBottom:3}}>{m.title}</div>
                  <div style={{fontSize:14,color:LB3,lineHeight:1.45,letterSpacing:"-.1px"}}>{m.description}</div>
                </div>
                <div style={{background:`${ACC}14`,borderRadius:9,padding:"6px 10px",textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:700,color:ACC,letterSpacing:"-.5px",lineHeight:1}}>+{m.xp}</div>
                  <div style={{fontSize:10,color:LB3,letterSpacing:".2px"}}>XP</div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
                <Chip color={CAT_C[m.category]||"#8e8e93"}>{m.category}</Chip>
                <Chip color={DIFF_C[m.difficulty]}>{m.difficulty}</Chip>
                <Chip color="#8e8e93">{m.period}</Chip>
              </div>
              {done
                ? <div style={{fontSize:14,color:"#34c759",fontWeight:600,letterSpacing:"-.2px"}}>Completed ✓</div>
                : claim
                ? <div style={{display:"flex",gap:8}}>
                    <button style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",borderRadius:10,fontSize:15,color:LB2,border:"none",cursor:"default",fontFamily:SF}}>Claimed ✓</button>
                    <button className="pressable" onClick={()=>doComplete(m.id)} style={{flex:1,padding:"10px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>Mark Done</button>
                  </div>
                : <button className="pressable" onClick={()=>doClaimMission(m.id)} style={{width:"100%",padding:"11px",background:ACC,borderRadius:10,fontSize:15,color:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF}}>Claim Mission</button>
              }
            </div>
          );
        })}
      </div>
    );
  }

  // ── PRIZES ──
  function PrizesTab() {
    return (
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{background:BG2,borderRadius:13,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,color:LB2,letterSpacing:"-.2px"}}>Your balance</div>
          <div style={{fontSize:22,fontWeight:700,color:ACC,letterSpacing:"-.8px"}}>{profile.xp.toLocaleString()} <span style={{fontSize:14,fontWeight:500,color:LB3}}>XP</span></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {prizes.map(p => {
            const can=profile.xp>=p.cost, out=p.stock<1;
            return (
              <div key={p.id} className="fade" style={{background:BG2,borderRadius:13,padding:"16px 14px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",opacity:out?.5:1}}>
                <div style={{fontSize:36,marginBottom:8}}>{p.icon}</div>
                <div style={{fontSize:15,color:LBL,fontWeight:500,letterSpacing:"-.3px",marginBottom:4,lineHeight:1.3}}>{p.name}</div>
                <Chip color={CAT_C[p.category]||"#8e8e93"}>{p.category}</Chip>
                <div style={{marginTop:10,fontSize:20,fontWeight:700,color:can&&!out?ACC:"#8e8e93",letterSpacing:"-.5px"}}>{p.cost.toLocaleString()}</div>
                <div style={{fontSize:11,color:LB3,marginTop:2,marginBottom:12}}>XP  •  {p.stock} left</div>
                <button onClick={()=>doRedeem(p.id)} disabled={!can||out} className={can&&!out?"pressable":""} style={{width:"100%",padding:"10px",background:(!can||out)?"rgba(0,0,0,.06)":ACC,color:(!can||out)?LB3:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:(!can||out)?"default":"pointer",fontFamily:SF}}>
                  {out?"Sold Out":can?"Redeem":"Need More XP"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ──
  function LeaderboardTab() {
    return (
      <div style={{padding:"0 16px 12px"}}>
        <Section className="fade">
          {allProfiles.map((s,i) => {
            const me=s.id===profile.id, medal=["🥇","🥈","🥉"][i]||null;
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:me?`${ACC}08`:BG2,borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{width:28,textAlign:"center",fontWeight:700,fontSize:medal?20:14,color:i<3?ORG:"#8e8e93",flexShrink:0}}>{medal||`${i+1}`}</div>
                <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0}}>{s.avatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,color:me?ACC:LBL,fontWeight:me?600:400,letterSpacing:"-.3px"}}>{s.name}{me?" (you)":""}</div>
                  <div style={{display:"flex",gap:8,marginTop:2}}>
                    <div style={{fontSize:12,color:LB3}}>{s.role}</div>
                    <div style={{fontSize:11,color:LB3}}>· {s.streak||0}🔥 · Lv.{getLevel(s.xp)}</div>
                  </div>
                  <div style={{marginTop:5,background:"#e5e5ea",borderRadius:99,height:3}}>
                    <div style={{width:`${getLvlPct(s.xp)}%`,height:"100%",background:`linear-gradient(90deg,${ACC},${ORG})`,borderRadius:99}}/>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:700,color:ACC,letterSpacing:"-.5px"}}>{s.xp.toLocaleString()}</div>
                  <div style={{fontSize:11,color:LB3,marginTop:1}}>XP</div>
                </div>
              </div>
            );
          })}
        </Section>
      </div>
    );
  }

  // ── NEWS ──
  function NewsTab() {
    return (
      <div style={{padding:"0 16px 12px"}}>
        {announcements.length===0 && <div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No announcements yet</div>}
        {announcements.map(a=>(
          <div key={a.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:a.pinned?`3px solid ${ORG}`:"none"}}>
            {a.pinned&&<div style={{fontSize:11,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:5}}>📌 Pinned</div>}
            <div style={{fontSize:17,color:LBL,fontWeight:500,letterSpacing:"-.35px",marginBottom:5}}>{a.title}</div>
            <div style={{fontSize:15,color:LB2,lineHeight:1.5,letterSpacing:"-.2px",marginBottom:10}}>{a.body}</div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div style={{fontSize:13,color:LB3}}>{new Date(a.created_at).toLocaleDateString()}</div>
              <div style={{fontSize:13,color:LB3}}>by {a.author}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── ADMIN ──
  function AdminTab() {
    const [allRed, setAllRed] = useState([]);
    useEffect(()=>{
      supabase.from("redemptions").select("*, profiles(name)").order("redeemed_at",{ascending:false}).then(({data})=>{ if(data) setAllRed(data); });
    },[]);
    return (
      <div style={{padding:"0 16px 12px"}}>
        <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"4px 4px 8px"}}>Staff</div>
        <Section>
          {allProfiles.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:BG2,borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,color:"#fff",flexShrink:0}}>{s.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,color:LBL,letterSpacing:"-.3px"}}>{s.name}</div>
                <div style={{fontSize:13,color:LB3}}>{s.role}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,fontWeight:600,color:ACC}}>{s.xp.toLocaleString()} XP</div>
                <div style={{fontSize:12,color:s.last_checkin===today?"#34c759":"#ff3b30",marginTop:1}}>{s.last_checkin===today?"✓ In":"— Out"}</div>
              </div>
            </div>
          ))}
        </Section>

        <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>Redemptions</div>
        <Section>
          {allRed.length===0
            ? <div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No redemptions yet</div>
            : allRed.slice(0,10).map((r,i,a)=><Row key={r.id} label={r.profiles?.name||"Unknown"} detail={r.prize_name} badge={r.status} last={i===a.length-1}/>)
          }
        </Section>

        <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>Add Mission</div>
        <Section>
          <FormRow label="Title"><StyledInput value={mForm.title} onChange={e=>setMForm(p=>({...p,title:e.target.value}))} placeholder="Mission title"/></FormRow>
          <FormRow label="Description"><StyledInput value={mForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="What needs to be done" multiline/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
            <FormRow label="XP"><StyledInput value={mForm.xp} onChange={e=>setMForm(p=>({...p,xp:e.target.value}))} placeholder="150" type="number"/></FormRow>
            <FormRow label="Category"><StyledInput value={mForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))} placeholder="Sales"/></FormRow>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
            <FormRow label="Difficulty"><StyledInput value={mForm.difficulty} onChange={e=>setMForm(p=>({...p,difficulty:e.target.value}))} placeholder="Easy/Medium/Hard"/></FormRow>
            <FormRow label="Period" last><StyledInput value={mForm.period} onChange={e=>setMForm(p=>({...p,period:e.target.value}))} placeholder="Daily/Weekly"/></FormRow>
          </div>
        </Section>
        <div style={{marginBottom:16}}><PrimaryBtn onClick={addMission}>Add Mission</PrimaryBtn></div>

        <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>Post Announcement</div>
        <Section>
          <FormRow label="Title"><StyledInput value={aForm.title} onChange={e=>setAForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title"/></FormRow>
          <FormRow label="Body"><StyledInput value={aForm.body} onChange={e=>setAForm(p=>({...p,body:e.target.value}))} placeholder="Write something…" multiline/></FormRow>
          <FormRow label="Pin to Top" last>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,color:LBL}}>Pin to top</div>
              <div onClick={()=>setAForm(p=>({...p,pinned:!p.pinned}))} style={{width:50,height:30,borderRadius:99,background:aForm.pinned?ACC:"#e5e5ea",transition:"background .2s",position:"relative",cursor:"pointer"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:aForm.pinned?22:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
              </div>
            </div>
          </FormRow>
        </Section>
        <div style={{marginBottom:16}}><PrimaryBtn onClick={addAnnouncement}>Post Announcement</PrimaryBtn></div>

        <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"0 4px 8px"}}>Add Prize</div>
        <Section>
          <FormRow label="Name"><StyledInput value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} placeholder="e.g. RM100 Voucher"/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
            <FormRow label="XP Cost"><StyledInput value={pForm.cost} onChange={e=>setPForm(p=>({...p,cost:e.target.value}))} placeholder="500" type="number"/></FormRow>
            <FormRow label="Stock"><StyledInput value={pForm.stock} onChange={e=>setPForm(p=>({...p,stock:e.target.value}))} placeholder="10" type="number"/></FormRow>
            <FormRow label="Icon" last><StyledInput value={pForm.icon} onChange={e=>setPForm(p=>({...p,icon:e.target.value}))} placeholder="🎁"/></FormRow>
          </div>
        </Section>
        <div style={{marginBottom:24}}><PrimaryBtn onClick={addPrize}>Add Prize</PrimaryBtn></div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      <div style={{background:"rgba(242,242,247,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"12px 16px 10px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,background:`linear-gradient(145deg,${ACC},${ORG})`,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚡</div>
            <div style={{fontSize:17,fontWeight:600,color:LBL,letterSpacing:"-.3px"}}>TechWide Hub</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:600,color:ACC}}>{profile.xp.toLocaleString()} XP</div>
            <button onClick={doLogout} style={{fontSize:13,color:"#ff3b30",fontWeight:500,background:"rgba(255,59,48,.1)",padding:"4px 9px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:SF}}>Sign Out</button>
          </div>
        </div>
        <div style={{fontSize:28,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginTop:6}}>
          {tab==="home"&&`Hello, ${profile.name.split(" ")[0]} 👋`}
          {tab==="missions"&&"Missions"}
          {tab==="prizes"&&"Prize Shop"}
          {tab==="board"&&"Leaderboard"}
          {tab==="news"&&"Announcements"}
          {tab==="admin"&&"Admin Panel"}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 0 82px"}}>
        {tab==="home"     && <HomeTab/>}
        {tab==="missions" && <MissionsTab/>}
        {tab==="prizes"   && <PrizesTab/>}
        {tab==="board"    && <LeaderboardTab/>}
        {tab==="news"     && <NewsTab/>}
        {tab==="admin"    && <AdminTab/>}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(249,249,249,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,.1)",display:"flex",zIndex:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer"}}>
            <div style={{fontSize:22,lineHeight:1,filter:tab===t.id?"none":"grayscale(1) opacity(.35)"}}>{t.emoji}</div>
            <div style={{fontSize:10,fontWeight:tab===t.id?600:400,color:tab===t.id?ACC:"#8e8e93",letterSpacing:"-.1px",fontFamily:SF}}>{t.label}</div>
          </button>
        ))}
      </div>

      {toast && (
        <div className="toast-in" style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.78)",backdropFilter:"blur(16px)",borderRadius:99,padding:"10px 20px",fontSize:14,color:"#fff",fontWeight:500,whiteSpace:"nowrap",zIndex:50,letterSpacing:"-.2px",pointerEvents:"none",maxWidth:"85vw",textAlign:"center"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
