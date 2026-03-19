import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore,formatContact}from"./constants";
import{MissionsTab,LeaderboardTab,PrizesTab,CommunityTab,ProfileTab}from"./UserTabs";

const XP_T=[0,500,1200,2000,3000,4500,6500,9000,12000];
const getLevel=xp=>{let l=1;for(let i=1;i<XP_T.length;i++)if(xp>=XP_T[i])l=i+1;return Math.min(l,XP_T.length);};
const getLvlPct=xp=>{const l=getLevel(xp)-1;const s=XP_T[l]||0;const e=XP_T[l+1]||s+1;return Math.round(((xp-s)/(e-s))*100);};
const fmtDate=iso=>{if(!iso)return null;const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
const calcAge=birthday=>{
  if(!birthday)return null;
  const birth=new Date(birthday),today=new Date();
  let age=today.getFullYear()-birth.getFullYear();
  const m=today.getMonth()-birth.getMonth();
  if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;
  return age;
};
const calcDaysWorking=joinedDate=>{if(!joinedDate)return null;return Math.floor((Date.now()-new Date(joinedDate))/86400000);};
const WX_ICON=code=>{if(code===0)return"☀️";if(code<=3)return"⛅";if(code<=48)return"🌫️";if(code<=67)return"🌧️";if(code<=77)return"❄️";if(code<=82)return"🌦️";return"⛈️";};
const WX_DESC=code=>{if(code===0)return"Clear Sky";if(code<=3)return"Partly Cloudy";if(code<=48)return"Foggy";if(code<=67)return"Rainy";if(code<=77)return"Snowy";if(code<=82)return"Showers";return"Thunderstorm";};

function addRipple(e){
  const el=e.currentTarget;if(!el)return;
  const rect=el.getBoundingClientRect();
  const dot=document.createElement("div");
  dot.className="ripple-dot";
  dot.style.left=(e.clientX-rect.left)+"px";
  dot.style.top=(e.clientY-rect.top)+"px";
  el.appendChild(dot);setTimeout(()=>dot.remove(),500);
}

// ── FULL PROFILE PAGE ─────────────────────────────────────────────────
function FullProfilePage({user,currentUserId,onBack,onDM}){
  const [showAvatarFull,setShowAvatarFull]=useState(false);
  const [showBannerFull,setShowBannerFull]=useState(false);
  const tier=getTier(calcScore(user.joined_date,0));
  const age=user.birthday_verified&&user.birthday?calcAge(user.birthday):null;
  const daysWorking=user.joined_date_verified&&user.joined_date?calcDaysWorking(user.joined_date):null;
  const rows=[
    ["💼 Position",user.role||user.position],
    ["🎂 Age",age?`${age} years old`:null],
    ["⚧ Gender",user.gender||null],
    ["🏠 Home Town",user.hometown||null],
    ["📱 Contact",user.contact_number?formatContact(user.contact_number):null],
    ["📧 Email",user.email||null],
    ["📅 Joining Date",user.joined_date_verified?fmtDate(user.joined_date):null],
    ["⏳ Been Working",daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎂 Birthday",user.birthday_verified?fmtDate(user.birthday):null],
    ["🎮 Hobby",user.hobby||null],
    ["🍜 Fav Food",user.favorite_food||null],
  ].filter(([,v])=>v);
  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF}}>
      {showAvatarFull&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAvatarFull(false)}>
          <div style={{width:280,height:280,borderRadius:"50%",background:user.avatar_url?`url(${user.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80,fontWeight:700,color:ACC,overflow:"hidden"}}>
            {!user.avatar_url&&(user.avatar||"?")}
          </div>
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}
      {showBannerFull&&user.banner_url&&(
        <div style={{position:"fixed",inset:0,background:"#000",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowBannerFull(false)}>
          <img src={user.banner_url} alt="banner" style={{width:"100%",maxHeight:"100vh",objectFit:"contain"}}/>
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:40,height:40,color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}
      {/* Back header */}
      <div style={{background:"rgba(242,242,247,.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"14px 16px",position:"sticky",top:0,zIndex:20,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} className="btn" style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:ACC,fontWeight:700,padding:0,fontFamily:SF}}>← Back</button>
        <div style={{flex:1,fontSize:18,fontWeight:700,color:LBL,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nickname||user.name}</div>
        {currentUserId!==user.id&&<button onClick={()=>onDM(user)} className="btn-primary ripple-container" onPointerDown={addRipple} style={{background:ACC,color:"#fff",border:"none",borderRadius:99,padding:"9px 18px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:SF,flexShrink:0}}>💬 Message</button>}
      </div>
      <div style={{paddingBottom:50}}>
        <div onClick={()=>user.banner_url&&setShowBannerFull(true)} style={{height:160,background:user.banner_url?`url(${user.banner_url}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,cursor:user.banner_url?"zoom-in":"default"}}/>
        <div style={{padding:"0 16px",marginTop:-54,marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div onClick={()=>setShowAvatarFull(true)} style={{width:96,height:96,borderRadius:"50%",border:`3px solid ${BG}`,background:user.avatar_url?`url(${user.avatar_url}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:30,color:ACC,overflow:"hidden",flexShrink:0,cursor:"zoom-in"}}>
            {!user.avatar_url&&(user.avatar||"?")}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:tier.color+"18",borderRadius:99,padding:"6px 14px",marginBottom:4}}>
            <span style={{fontSize:16}}>{tier.emoji}</span>
            <span style={{fontSize:14,color:tier.color,fontWeight:700}}>{tier.name}</span>
          </div>
        </div>
        <div style={{padding:"0 16px 24px"}}>
          <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.5px"}}>{user.nickname||user.name}</div>
          {user.nickname&&<div style={{fontSize:16,color:LB3,marginTop:3}}>{user.name}</div>}
          {user.role&&<div style={{fontSize:16,color:ACC,fontWeight:600,marginTop:5}}>{user.role}</div>}
          {user.bio&&<div style={{background:BG2,borderRadius:14,padding:"14px 16px",marginTop:16,fontSize:16,color:LB2,lineHeight:1.6}}>{user.bio}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:16,marginBottom:16}}>
            {[{l:"Points",v:(user.xp||0).toLocaleString(),e:"⚡"},{l:"Streak",v:`${user.streak||0}d`,e:"🔥"},{l:"Level",
