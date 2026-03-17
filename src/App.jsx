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
            <div
