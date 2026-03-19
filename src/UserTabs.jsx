import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import CircleCrop from"./CircleCrop";
import{PRIZES,getTier,calcScore,formatContact,normalizeContact,formatIC,getICDigits,BANK_TYPES,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}from"./constants";

const CAT_C={Sales:"#5856d6",Teamwork:"#007aff",Admin:"#af52de",Creativity:"#ff2d55",KOL:"#ff6b35",Content:"#30b0c7","Live Hosting":"#e91e8c",Others:"#8e8e93"};
const fmtDate=iso=>{if(!iso)return null;const p=iso.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso;};
const calcAge=birthday=>{
  if(!birthday)return null;
  const birth=new Date(birthday),today=new Date();
  let age=today.getFullYear()-birth.getFullYear();
  const m=today.getMonth()-birth.getMonth();
  if(m<0||(m===0&&today.getDate()<birth.getDate()))age--;
  return age;
};
const calcDaysWorking=joinedDate=>{
  if(!joinedDate)return null;
  return Math.floor((Date.now()-new Date(joinedDate))/86400000);
};
const daysLeft=dueDate=>{
  if(!dueDate)return null;
  return Math.ceil((new Date(dueDate)-new Date())/(1000*60*60*24));
};

// ── MISSION DETAIL PAGE ───────────────────────────────────────────────
function MissionDetailPage({mission,claim,profile,onBack,onAccept,onDecline,onRefresh,showToast,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [subText,setSubText]=useState("");
  const [subImg,setSubImg]=useState(null);
  const [subLoading,setSubLoading]=useState(false);
  const [showSubForm,setShowSubForm]=useState(false);
  const [localClaim,setLocalClaim]=useState(claim);

  useEffect(()=>{setLocalClaim(claim);},[claim]);

  const done=localClaim?.completed;
  const submitted=localClaim?.submitted;
  const accepted=!!localClaim;
  const dl=daysLeft(mission.due_date);
  const overdue=dl!==null&&dl<0;

  const handleImg=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>setSubImg(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitProof=async()=>{
    if(!subText.trim()&&!subImg){showToast("Please add text or photo proof");return;}
    if(!localClaim?.id){showToast("Mission not accepted yet");return;}
    setSubLoading(true);
    try{
      // Check for existing submission
      const{data:existing}=await supabase.from("mission_submissions").select("id").eq("claim_id",localClaim.id).maybeSingle();
      if(existing){showToast("Already submitted — awaiting admin review");setSubLoading(false);return;}
      const{error:subErr}=await supabase.from("mission_submissions").insert({
        user_id:profile.id,
        mission_id:mission.id,
        claim_id:localClaim.id,
        submission_text:subText,
        submission_image:subImg,
        status:"Pending",
        submitted_at:new Date().toISOString(),
      });
      if(subErr)throw subErr;
      const{error:claimErr}=await supabase.from("mission_claims").update({submitted:true}).eq("id",localClaim.id);
      if(claimErr)console.warn("claim update:",claimErr);
      // Refresh claim state
      const{data:updated}=await supabase.from("mission_claims").select("*").eq("id",localClaim.id).single();
      if(updated)setLocalClaim(updated);
      if(onRefresh)onRefresh();
      showToast("Proof submitted! Awaiting admin approval 🎉");
      setShowSubForm(false);setSubText("");setSubImg(null);
    }catch(err){
      console.error("Submission error:",err);
      showToast("Submission failed — please try again");
    }
    setSubLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      {/* Header */}
      <div style={{background:"rgba(242,242,247,.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,.08)",padding:"12px 16px",position:"sticky",top:0,zIndex:20,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} className="btn"
          style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:ACC,fontWeight:600,padding:0,fontFamily:SF}}>
          ← Back
        </button>
        <div style={{flex:1,fontSize:17,fontWeight:600,color:LBL,letterSpacing:"-.3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {mission.title}
        </div>
      </div>

      <div style={{padding:"16px 16px 40px"}}>
        {/* Hero */}
        <div style={{background:`linear-gradient(135deg,${ACC},#0e2140)`,borderRadius:16,padding:20,marginBottom:16,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`${ORG}20`,pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,marginRight:12}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.5)",letterSpacing:".5px",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Campaign Mission</div>
              <div style={{fontSize:20,fontWeight:700,color:"#fff",lineHeight:1.2,letterSpacing:"-.4px"}}>{mission.title}</div>
            </div>
            <div style={{background:`${ORG}30`,borderRadius:12,padding:"10px 14px",textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:24,fontWeight:700,color:ORG,lineHeight:1}}>+{mission.xp}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:3}}>pts reward</div>
            </div>
          </div>
          {/* Status badges */}
          <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
            <Chip color={CAT_C[mission.category]||"#8e8e93"}>{mission.category}</Chip>
            {done&&<Chip color="#34c759">✅ Completed</Chip>}
            {submitted&&!done&&<Chip color="#ff9500">⏳ Submitted</Chip>}
            {accepted&&!submitted&&!done&&<Chip color={ACC}>✓ Accepted</Chip>}
            {dl!==null&&(
              <Chip color={overdue?"#ff3b30":dl<=3?"#ff9500":"#34c759"}>
                {overdue?`⚠️ Overdue`:dl===0?"Due today":dl===1?"Due tomorrow":`${dl}d left`}
              </Chip>
            )}
          </div>
        </div>

        {/* Description */}
        {mission.description&&(
          <div style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>What to do</div>
            <div style={{fontSize:15,color:LB2,lineHeight:1.65,whiteSpace:"pre-line"}}>{mission.description}</div>
          </div>
        )}

        {/* Details */}
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:16}}>
          {[
            ["📅 Due Date",    mission.due_date?fmtDate(mission.due_date):null],
            ["🏷️ Category",   mission.category],
            ["⭐ Reward",      `${mission.xp} pts`],
          ].filter(([,v])=>v).map(([label,value],i,a)=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
              <div style={{fontSize:15,color:LB3}}>{label}</div>
              <div style={{fontSize:15,color:LBL,fontWeight:500}}>{value}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {done?(
          <div style={{background:"#34c75910",borderRadius:13,padding:"16px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:6}}>🎉</div>
            <div style={{fontSize:17,color:"#34c759",fontWeight:600}}>Mission Completed!</div>
            <div style={{fontSize:14,color:LB3,marginTop:4}}>Reward has been added to your account</div>
          </div>
        ):submitted?(
          <div style={{background:"#ff950010",borderRadius:13,padding:"16px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:6}}>⏳</div>
            <div style={{fontSize:17,color:"#ff9500",fontWeight:600}}>Proof Submitted</div>
            <div style={{fontSize:14,color:LB3,marginTop:4}}>Awaiting admin review. You'll be notified once approved.</div>
          </div>
        ):showSubForm?(
          <div style={{background:BG2,borderRadius:13,padding:"16px"}}>
            <div style={{fontSize:16,color:LBL,fontWeight:600,marginBottom:12}}>📤 Submit Proof</div>
            <textarea value={subText} onChange={e=>setSubText(e.target.value)} placeholder="Describe what you did, achievements, results…" rows={4}
              style={{width:"100%",background:"#f2f2f7",border:"none",outline:"none",borderRadius:10,padding:"12px",fontSize:15,color:LBL,resize:"none",fontFamily:SF,marginBottom:10}}/>
            <div onClick={()=>document.getElementById("proof_img").click()}
              style={{border:`2px dashed ${subImg?"transparent":SEP}`,borderRadius:10,overflow:"hidden",background:subImg?`url(${subImg}) center/cover`:"transparent",minHeight:subImg?160:56,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginBottom:10}}>
              {!subImg&&<div style={{fontSize:14,color:LB3}}>📷 Attach photo proof (optional)</div>}
            </div>
            <input id="proof_img" type="file" accept="image/*" onChange={handleImg} style={{display:"none"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowSubForm(false);setSubText("");setSubImg(null);}}
                style={{flex:1,padding:"13px",background:"rgba(0,0,0,.05)",borderRadius:12,fontSize:15,color:LB2,border:"none",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={submitProof} disabled={subLoading||(!subText.trim()&&!subImg)}
                style={{flex:2,padding:"13px",background:(subLoading||(!subText.trim()&&!subImg))?"#e5e5ea":ACC,borderRadius:12,fontSize:15,color:(subLoading||(!subText.trim()&&!subImg))?LB3:"#fff",fontWeight:600,border:"none",cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {subLoading&&<div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                {subLoading?"Submitting…":"Submit Proof"}
              </button>
            </div>
          </div>
        ):accepted?(
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onDecline(mission.id)} style={{flex:1,padding:"14px",background:"rgba(255,59,48,.08)",color:"#ff3b30",borderRadius:13,fontSize:15,border:"none",cursor:"pointer",fontFamily:SF}}>Withdraw</button>
            <button onClick={()=>setShowSubForm(true)} disabled={overdue}
              style={{flex:2,padding:"14px",background:overdue?"#e5e5ea":ACC,borderRadius:13,fontSize:15,color:overdue?LB3:"#fff",fontWeight:600,border:"none",cursor:overdue?"default":"pointer",fontFamily:SF}}>
              {overdue?"Past Due Date":"Submit Proof 📤"}
            </button>
          </div>
        ):(
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onDecline(mission.id)} style={{flex:1,padding:"14px",background:"rgba(255,59,48,.08)",color:"#ff3b30",borderRadius:13,fontSize:15,border:"none",cursor:"pointer",fontFamily:SF}}>Not Interested</button>
            <button onClick={()=>onAccept(mission.id)} disabled={overdue}
              style={{flex:2,padding:"14px",background:overdue?"#e5e5ea":ACC,borderRadius:13,fontSize:16,color:overdue?LB3:"#fff",fontWeight:700,border:"none",cursor:overdue?"default":"pointer",fontFamily:SF}}>
              {overdue?"Past Due Date":"Accept Mission 🎯"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MISSIONS TAB ──────────────────────────────────────────────────────
export function MissionsTab({profile,missions,myClaims,setMyClaims,showToast,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [filter,setFilter]=useState("All");
  const [selected,setSelected]=useState(null);
  const cats=["All",...new Set(missions.map(m=>m.category).filter(Boolean))];

  const accept=async missionId=>{
    if(myClaims.find(c=>c.mission_id===missionId))return;
    const{error}=await supabase.from("mission_claims").insert({user_id:profile.id,mission_id:missionId,status:"accepted",submitted:false});
    if(!error){
      const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
      if(data)setMyClaims(data);
      showToast("Mission accepted! Submit proof before the due date.");
      setSelected(null);
    }else{
      showToast("Failed to accept mission. Try again.");
    }
  };

  const decline=async missionId=>{
    const existing=myClaims.find(c=>c.mission_id===missionId);
    if(existing&&!existing.completed){
      await supabase.from("mission_claims").delete().eq("id",existing.id);
      const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
      if(data)setMyClaims(data);
    }
    setSelected(null);
  };

  const refresh=async()=>{
    const{data}=await supabase.from("mission_claims").select("*").eq("user_id",profile.id);
    if(data)setMyClaims(data);
  };

  const list=filter==="All"?missions:missions.filter(m=>m.category===filter);

  // Show detail page
  if(selected){
    const claim=myClaims.find(c=>c.mission_id===selected.id);
    return(
      <MissionDetailPage
        mission={selected} claim={claim} profile={profile}
        onBack={()=>setSelected(null)}
        onAccept={accept} onDecline={decline} onRefresh={refresh}
        showToast={showToast} Chip={Chip}
        SF={SF} BG={BG} BG2={BG2} SEP={SEP} LBL={LBL} LB2={LB2} LB3={LB3} ACC={ACC} ORG={ORG}
      />
    );
  }

  return(
    <div style={{padding:"0 16px 12px"}}>
      {/* Category filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:4}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)}
            style={{flexShrink:0,padding:"6px 15px",borderRadius:99,fontSize:13,fontWeight:filter===c?600:400,background:filter===c?ACC:"rgba(0,0,0,.06)",color:filter===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>
            {c}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[
          {l:"Total",v:missions.length,c:LB3},
          {l:"Accepted",v:myClaims.filter(c=>!c.completed).length,c:ACC},
          {l:"Completed",v:myClaims.filter(c=>c.completed).length,c:"#34c759"},
        ].map((s,i)=>(
          <div key={i} style={{flex:1,background:BG2,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,color:LB3,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {list.length===0&&(
        <div style={{textAlign:"center",padding:"40px 0",color:LB3,fontSize:15}}>
          <div style={{fontSize:40,marginBottom:12}}>🎯</div>
          No missions available
        </div>
      )}

      {/* Compact mission cards */}
      {list.map(m=>{
        const claim=myClaims.find(c=>c.mission_id===m.id);
        const done=claim?.completed;
        const submitted=claim?.submitted;
        const accepted=!!claim;
        const dl=daysLeft(m.due_date);
        const overdue=dl!==null&&dl<0;
        const catColor=CAT_C[m.category]||"#8e8e93";

        return(
          <div key={m.id} onClick={()=>setSelected(m)} className="card-press"
            style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,cursor:"pointer",display:"flex",alignItems:"center",gap:12,opacity:done?.7:1}}>
            {/* Category color dot */}
            <div style={{width:4,height:44,borderRadius:2,background:catColor,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{fontSize:16,color:done?LB3:LBL,fontWeight:500,letterSpacing:"-.3px",lineHeight:1.3,textDecoration:done?"line-through":"none",flex:1}}>{m.title}</div>
                <div style={{background:`${ACC}14`,borderRadius:8,padding:"5px 9px",textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:ACC,lineHeight:1}}>+{m.xp}</div>
                  <div style={{fontSize:9,color:LB3,marginTop:1}}>pts</div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,color:catColor,fontWeight:600,background:catColor+"18",padding:"2px 7px",borderRadius:99}}>{m.category}</span>
                {done&&<span style={{fontSize:11,color:"#34c759",fontWeight:600,background:"#34c75918",padding:"2px 7px",borderRadius:99}}>✅ Done</span>}
                {submitted&&!done&&<span style={{fontSize:11,color:"#ff9500",fontWeight:600,background:"#ff950018",padding:"2px 7px",borderRadius:99}}>⏳ Pending</span>}
                {accepted&&!submitted&&!done&&<span style={{fontSize:11,color:ACC,fontWeight:600,background:`${ACC}18`,padding:"2px 7px",borderRadius:99}}>✓ Accepted</span>}
                {dl!==null&&<span style={{fontSize:11,color:overdue?"#ff3b30":dl<=2?"#ff9500":LB3,fontWeight:overdue||dl<=2?600:400}}>
                  {overdue?"Overdue":dl===0?"Due today":dl===1?"1d left":`${dl}d left`}
                </span>}
              </div>
            </div>
            <div style={{color:LB3,fontSize:18,flexShrink:0}}>›</div>
          </div>
        );
      })}
    </div>
  );
}

// ── LEADERBOARD TAB ───────────────────────────────────────────────────
export function LeaderboardTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,getLevel,getLvlPct,getTier,calcScore,setDmTarget,setViewingProfile}){
  const ranked=allProfiles.filter(s=>!s.is_admin);
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
        {ranked.length===0&&<div style={{padding:"20px 16px",fontSize:15,color:LB3,textAlign:"center"}}>No staff yet</div>}
        {ranked.map((s,i)=>{
          const me=s.id===profile.id;
          const medal=["🥇","🥈","🥉"][i]||null;
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id} onClick={()=>setViewingProfile&&setViewingProfile(s)} className="card-press"
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
                <div style={{fontSize:10,color:LB3,marginTop:1}}>pts ›</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PRIZES TAB ────────────────────────────────────────────────────────
export function PrizesTab({profile,prizes,myRedemptions,doRedeem,Chip,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG}){
  const [view,setView]=useState("shop");
  const [filter,setFilter]=useState("All");
  const display=prizes.length>0?prizes:PRIZES.map(x=>({...x,cost:x.pts,category:x.cat}));
  const cats=["All",...new Set(display.map(p=>p.cat||p.category).filter(Boolean))];
  const filtered=filter==="All"?display:display.filter(p=>(p.cat||p.category)===filter);
  const Sb=({status})=>{
    const c=status==="Pending"?"#ff9500":status==="Approved"?"#34c759":"#ff3b30";
    return<span style={{fontSize:12,color:c,fontWeight:600,background:c+"18",padding:"3px 8px",borderRadius:99}}>{status==="Approved"?"✓ Delivered":status==="Pending"?"⏳ Pending":"✕ Rejected"}</span>;
  };
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[["shop","🎁 Prize Shop"],["history","📋 My Prizes"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)}
            style={{flex:1,padding:"10px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>
      <div className="fade" style={{background:BG2,borderRadius:13,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:15,color:LB2}}>Your balance</div>
        <div style={{fontSize:22,fontWeight:700,color:ACC,letterSpacing:"-.8px"}}>{(profile.xp||0).toLocaleString()} <span style={{fontSize:14,fontWeight:500,color:LB3}}>pts</span></div>
      </div>
      {view==="shop"&&(
        <>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setFilter(c)}
                style={{flexShrink:0,padding:"5px 13px",borderRadius:99,fontSize:13,fontWeight:filter===c?600:400,background:filter===c?ACC:"rgba(0,0,0,.06)",color:filter===c?"#fff":LB2,border:"none",cursor:"pointer",fontFamily:SF}}>
                {c}
              </button>
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
        </>
      )}
      {view==="history"&&(
        <>
          {myRedemptions.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:LB3,fontSize:15}}>
              <div style={{fontSize:40,marginBottom:12}}>🎁</div>No prizes redeemed yet.
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {myRedemptions.map(r=>(
                <div key={r.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{flex:1,marginRight:10}}>
                      <div style={{fontSize:17,color:LBL,fontWeight:500}}>{r.prize_name}</div>
                      <div style={{fontSize:13,color:LB3,marginTop:2}}>
                        {new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}
                      </div>
                    </div>
                    <Sb status={r.status}/>
                  </div>
                  <div style={{background:r.status==="Pending"?"#ff950010":"#34c75910",borderRadius:8,padding:"8px 12px",fontSize:12,color:r.status==="Pending"?"#ff9500":"#34c759",marginTop:6}}>
                    {r.status==="Pending"?"⏳ Processing — you'll be notified when delivered.":"✓ Delivered! Enjoy your prize."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── COMMUNITY TAB ─────────────────────────────────────────────────────
export function CommunityTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,dmTarget,setDmTarget,setViewingProfile}){
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
    const iv=setInterval(loadMessages,3000);
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
    const payload={
      user_id:profile.id,
      sender_name:profile.nickname||profile.name,
      sender_avatar:profile.avatar||"",
      sender_avatar_url:profile.avatar_url||"",
      content:text.trim(),
    };
    if(mode==="dm"&&dmWith){
      await supabase.from("messages").insert({...payload,is_dm:true,recipient_id:dmWith.id});
      await supabase.from("notifications").insert({
        user_id:dmWith.id,
        title:`💬 ${profile.nickname||profile.name}`,
        body:text.trim().slice(0,80),
        type:"dm",
      });
    } else {
      await supabase.from("messages").insert({...payload,is_dm:false});
    }
    setText("");await loadMessages();setSending(false);
  };

  const startDM=user=>{setDmWith(user);setMode("dm");setShowPeople(false);setDmMessages([]);if(setDmTarget)setDmTarget(null);};
  const fmt=ts=>new Date(ts).toLocaleTimeString("en-MY",{hour:"2-digit",minute:"2-digit",hour12:true});
  const displayMsgs=mode==="dm"?dmMessages:messages;

  // Get avatar for a message — prefer stored url, fallback to allProfiles lookup
  const getMsgAvatar=msg=>{
    if(msg.sender_avatar_url)return msg.sender_avatar_url;
    const sender=allProfiles?.find(p=>p.id===msg.user_id);
    return sender?.avatar_url||"";
  };

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 170px)"}}>
      {/* Mode tabs */}
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
          <div style={{background:BG,borderRadius:"20px 20px 0 0",padding:"20px 16px 40px",maxHeight:"65vh",overflowY:"auto"}}>
            <div style={{fontSize:17,fontWeight:600,color:LBL,marginBottom:14,letterSpacing:"-.3px"}}>Start a conversation</div>
            {(allProfiles||[]).filter(p=>p.id!==profile.id&&!p.is_admin).map(u=>(
              <div key={u.id} onClick={()=>startDM(u)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${SEP}`,cursor:"pointer"}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:u.avatar_url?`url(${u.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0}}>
                  {!u.avatar_url&&(u.avatar||"?")}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,color:LBL,fontWeight:500}}>{u.nickname||u.name}</div>
                  <div style={{fontSize:13,color:LB3}}>{u.role}</div>
                </div>
                <div style={{fontSize:20,color:LB3}}>›</div>
              </div>
            ))}
            <button onClick={()=>setShowPeople(false)}
              style={{width:"100%",marginTop:16,padding:"14px",background:"rgba(0,0,0,.06)",border:"none",borderRadius:12,fontSize:16,color:"#ff3b30",cursor:"pointer",fontFamily:SF}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* DM header */}
      {mode==="dm"&&dmWith&&(
        <div style={{padding:"10px 16px",background:BG2,borderBottom:`1px solid ${SEP}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div onClick={()=>setViewingProfile&&setViewingProfile(dmWith)}
            style={{width:38,height:38,borderRadius:"50%",background:dmWith.avatar_url?`url(${dmWith.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",overflow:"hidden",flexShrink:0,cursor:"pointer"}}>
            {!dmWith.avatar_url&&(dmWith.avatar||"?")}
          </div>
          <div style={{flex:1,cursor:"pointer"}} onClick={()=>setViewingProfile&&setViewingProfile(dmWith)}>
            <div style={{fontSize:15,color:LBL,fontWeight:600}}>{dmWith.nickname||dmWith.name}</div>
            <div style={{fontSize:12,color:LB3}}>{dmWith.role}</div>
          </div>
          {setViewingProfile&&(
            <button onClick={()=>setViewingProfile(dmWith)} style={{background:`${ACC}10`,border:"none",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SF,borderRadius:8,padding:"6px 12px"}}>
              Profile
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
        {displayMsgs.length===0&&(
          <div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>
            {mode==="dm"?`Say hi to ${dmWith?.nickname||dmWith?.name?.split(" ")[0]} 👋`:"No messages yet. Say hi! 👋"}
          </div>
        )}
        {displayMsgs.map(msg=>{
          const me=msg.user_id===profile.id;
          if(msg.is_system)return(
            <div key={msg.id} style={{textAlign:"center",padding:"4px 8px"}}>
              <div style={{display:"inline-block",background:`${ACC}10`,borderRadius:12,padding:"8px 14px",fontSize:13,color:ACC,lineHeight:1.55,maxWidth:"88%",whiteSpace:"pre-line"}}>{msg.content}</div>
            </div>
          );
          const avatarUrl=getMsgAvatar(msg);
          return(
            <div key={msg.id} style={{display:"flex",flexDirection:me?"row-reverse":"row",alignItems:"flex-end",gap:8}}>
              {!me&&(
                <div
                  onClick={()=>{
                    const sender=allProfiles?.find(p=>p.id===msg.user_id);
                    if(sender&&setViewingProfile)setViewingProfile(sender);
                  }}
                  style={{width:34,height:34,borderRadius:"50%",background:avatarUrl?`url(${avatarUrl}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,flexShrink:0,overflow:"hidden",cursor:"pointer",border:`2px solid ${BG}`}}>
                  {!avatarUrl&&(msg.sender_avatar||msg.sender_name?.charAt(0)||"?")}
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
        <input value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
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
  const [saving,setSaving]=useState(false);
  const [rawImg,setRawImg]=useState(null);
  const [showCrop,setShowCrop]=useState(false);
  const [showBannerFull,setShowBannerFull]=useState(false);
  const [showAvatarFull,setShowAvatarFull]=useState(false);
  const [verif,setVerif]=useState([]);
  const [infoExpanded,setInfoExpanded]=useState(false);
  const [privateEditing,setPrivateEditing]=useState(null);
  const [privateForm,setPrivateForm]=useState({ic_number:"",epf_number:"",bank_account:"",bank_type:profile.bank_type||"Maybank"});
  const [submittingPrivate,setSubmittingPrivate]=useState(false);
  const GENDERS=["Male","Female","Prefer not to say"];

  const [form,setForm]=useState({
    name:profile.name||"",nickname:profile.nickname||"",bio:profile.bio||"",
    hobby:profile.hobby||"",favorite_food:profile.favorite_food||"",
    contact_number:profile.contact_number||"",gender:profile.gender||"",
    hometown:profile.hometown||"",email:profile.email||"",
    birthday:profile.birthday||"",joined_date:profile.joined_date||"",
    avatar_url:profile.avatar_url||"",banner_url:profile.banner_url||"",
  });
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  useEffect(()=>{loadVerif();},[]);

  const loadVerif=async()=>{
    const{data}=await supabase.from("verification_requests").select("*").eq("user_id",profile.id).order("submitted_at",{ascending:false});
    if(data)setVerif(data);
  };

  const getVerifStatus=field=>{
    if(field==="ic_number"&&profile.ic_verified)return"verified";
    if(field==="epf_number"&&profile.epf_verified)return"verified";
    if(field==="bank_account"&&profile.bank_verified)return"verified";
    if(field==="joined_date"&&profile.joined_date_verified)return"verified";
    if(field==="birthday"&&profile.birthday_verified)return"verified";
    const latest=verif.find(v=>v.field_name===field);
    if(latest?.status==="Pending")return"pending";
    if(latest?.status==="Rejected")return"rejected";
    return"unverified";
  };

  const VerifBadge=({field})=>{
    const status=getVerifStatus(field);
    const cfg={verified:{c:"#34c759",label:"✓ Verified"},pending:{c:"#ff9500",label:"⏳ Pending"},rejected:{c:"#ff3b30",label:"✕ Rejected"},unverified:{c:"#8e8e93",label:"Not Verified"}}[status];
    return<span style={{fontSize:11,color:cfg.c,fontWeight:600,background:cfg.c+"18",padding:"2px 7px",borderRadius:99}}>{cfg.label}</span>;
  };

  const handleFileSelect=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{setRawImg(ev.target.result);setShowCrop(true);};reader.readAsDataURL(file);};
  const handleBannerSelect=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>set("banner_url",ev.target.result);reader.readAsDataURL(file);};

  const save=async()=>{
    setSaving(true);
    const reqs=[];
    if(form.joined_date!==profile.joined_date&&form.joined_date&&!profile.joined_date_verified)
      reqs.push({user_id:profile.id,field_name:"joined_date",field_value:form.joined_date,status:"Pending"});
    if(form.birthday!==profile.birthday&&form.birthday&&!profile.birthday_verified)
      reqs.push({user_id:profile.id,field_name:"birthday",field_value:form.birthday,status:"Pending"});
    const payload={...form};
    if(profile.joined_date_verified)payload.joined_date=profile.joined_date;
    if(profile.birthday_verified)payload.birthday=profile.birthday;
    const{error}=await supabase.from("profiles").update(payload).eq("id",profile.id);
    if(!error){
      if(reqs.length>0)await supabase.from("verification_requests").insert(reqs);
      syncProfile({...profile,...payload});
      await loadVerif();
      showToast("Profile updated ✓");
      setEditing(false);
    }else{showToast("Update failed — try again");}
    setSaving(false);
  };

  const submitPrivate=async(fieldName,value,extra=null)=>{
    if(!value.trim()){showToast("Please enter a value");return;}
    if((fieldName==="ic_number"&&profile.ic_verified)||(fieldName==="epf_number"&&profile.epf_verified)){
      showToast("This field is locked after verification");return;
    }
    setSubmittingPrivate(true);
    const req={user_id:profile.id,field_name:fieldName,field_value:value,status:"Pending"};
    if(extra)req.extra_value=extra;
    await supabase.from("verification_requests").insert(req);
    if(fieldName==="bank_account")await supabase.from("profiles").update({bank_verified:false}).eq("id",profile.id);
    await loadVerif();
    showToast("Submitted for admin verification 🔒");
    setPrivateEditing(null);
    setSubmittingPrivate(false);
  };

  const av=form.avatar_url||profile.avatar_url;
  const bn=form.banner_url||profile.banner_url;
  const age=profile.birthday_verified&&profile.birthday?calcAge(profile.birthday):null;
  const daysWorking=profile.joined_date_verified&&profile.joined_date?calcDaysWorking(profile.joined_date):null;

  const publicRows=[
    ["🎂 Age",age?`${age} years old`:null],
    ["⚧ Gender",profile.gender||null],
    ["🏠 Home Town",profile.hometown||null],
    ["📱 Contact",profile.contact_number?formatContact(profile.contact_number):null],
    ["📧 Email",profile.email||null],
    ["📅 Joining Date",profile.joined_date_verified?fmtDate(profile.joined_date):null],
    ["⏳ Been Working",daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎂 Birthday",profile.birthday_verified?fmtDate(profile.birthday):null],
    ["🎮 Hobby",profile.hobby||null],
    ["🍜 Fav Food",profile.favorite_food||null],
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
      {showBannerFull&&(
        <div style={{position:"fixed",inset:0,background:"#000",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowBannerFull(false)}>
          {bn?<img src={bn} alt="banner" style={{width:"100%",maxHeight:"100vh",objectFit:"contain"}}/>:<div style={{color:"#fff",fontSize:15}}>No banner set</div>}
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
      )}
      {showAvatarFull&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAvatarFull(false)}>
          <div style={{width:280,height:280,borderRadius:"50%",background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80,fontWeight:700,color:ACC,overflow:"hidden"}}>
            {!av&&(profile.avatar||"?")}
          </div>
          <button style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.2)",border:"none",borderRadius:"50%",width:36,height:36,color:"#fff",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
      )}

      {/* Banner */}
      <div onClick={()=>!editing&&setShowBannerFull(true)}
        style={{height:130,background:bn?`url(${bn}) center/cover`:`linear-gradient(135deg,${ACC},#0e2140)`,position:"relative",cursor:!editing?"zoom-in":"default"}}>
        {editing&&(
          <>
            <button onClick={e=>{e.stopPropagation();document.getElementById("bnP").click();}}
              style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.55)",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:SF}}>
              Change Banner
            </button>
            <input id="bnP" type="file" accept="image/*" onChange={handleBannerSelect} style={{display:"none"}}/>
          </>
        )}
      </div>

      {/* Avatar + Edit */}
      <div style={{padding:"0 16px",marginTop:-44,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div style={{position:"relative"}}>
          <div onClick={()=>!editing&&setShowAvatarFull(true)}
            style={{width:84,height:84,borderRadius:"50%",background:av?`url(${av}) center/cover`:`linear-gradient(145deg,${ORG},#ffb940)`,border:`3px solid ${BG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:ACC,overflow:"hidden",cursor:!editing?"zoom-in":"default"}}>
            {!av&&(profile.avatar||"?")}
          </div>
          {editing&&(
            <button onClick={()=>document.getElementById("avP").click()}
              style={{position:"absolute",bottom:2,right:2,width:26,height:26,background:ACC,border:`2px solid ${BG}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13}}>
              📷
            </button>
          )}
          <input id="avP" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
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

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,padding:"0 16px",marginBottom:16}}>
        {[{l:"Points",v:(profile.xp||0).toLocaleString()},{l:"Contrib.",v:score.toLocaleString()},{l:"Missions",v:completedCount}].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:13,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:ACC}}>{s.v}</div>
            <div style={{fontSize:10,color:LB3,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,padding:"0 16px",marginBottom:14}}>
        {[["public","Public Info"],["private","Private 🔒"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSection(id)} className="btn"
            style={{flex:1,padding:"9px",background:section===id?ACC:"rgba(0,0,0,.06)",color:section===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PUBLIC ── */}
      {section==="public"&&(
        editing?(
          <div style={{padding:"0 16px"}}>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:10}}>
              {[
                {label:"Full Name",key:"name",ph:"Ahmad Farid"},
                {label:"Nickname",key:"nickname",ph:"e.g. Farid"},
                {label:"Hobby",key:"hobby",ph:"e.g. Gaming"},
                {label:"Favourite Food",key:"favorite_food",ph:"e.g. Nasi Lemak"},
                {label:"Home Town",key:"hometown",ph:"e.g. Kuala Lumpur"},
                {label:"Email",key:"email",ph:"your@email.com",type:"email"},
              ].map(({label,key,ph,type="text"},i,a)=>(
                <div key={key} style={{padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>
                  <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph} type={type}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                </div>
              ))}
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Contact</div>
                <input value={form.contact_number} onChange={e=>set("contact_number",e.target.value.replace(/\D/g,""))} placeholder="0123456789" type="tel"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                {form.contact_number&&<div style={{fontSize:12,color:ACC,marginTop:3}}>Preview: {formatContact(form.contact_number)}</div>}
              </div>
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Gender</div>
                <div style={{position:"relative"}}>
                  <select value={form.gender} onChange={e=>set("gender",e.target.value)}
                    style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:form.gender?LBL:LB3,appearance:"none",WebkitAppearance:"none",cursor:"pointer",fontFamily:SF}}>
                    <option value="">Select…</option>
                    {GENDERS.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",fontSize:14,color:LB3,pointerEvents:"none"}}>▾</div>
                </div>
              </div>
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
                <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Short description…" rows={3}
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",fontFamily:SF,lineHeight:1.45}}/>
              </div>
              {/* Birthday */}
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>Birthday</div>
                  <VerifBadge field="birthday"/>
                </div>
                {profile.birthday_verified
                  ?<div style={{fontSize:16,color:LB3}}>{fmtDate(profile.birthday)} (locked)</div>
                  :<input type="date" value={form.birthday} onChange={e=>set("birthday",e.target.value)}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                }
                {!profile.birthday_verified&&form.birthday&&<div style={{fontSize:11,color:"#ff9500",marginTop:3}}>⏳ Will require admin verification to display</div>}
              </div>
              {/* Joining Date */}
              <div style={{padding:"11px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>Joining Date</div>
                  <VerifBadge field="joined_date"/>
                </div>
                {profile.joined_date_verified
                  ?<div style={{fontSize:16,color:LB3}}>{fmtDate(profile.joined_date)} (locked)</div>
                  :<input type="date" value={form.joined_date} onChange={e=>set("joined_date",e.target.value)}
                      style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
                }
                {!profile.joined_date_verified&&form.joined_date&&<div style={{fontSize:11,color:"#ff9500",marginTop:3}}>⏳ Shown after admin verification</div>}
              </div>
            </div>
            <button onClick={()=>setEditing(false)}
              style={{width:"100%",padding:"14px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:13,fontSize:16,color:"#ff3b30",cursor:"pointer",fontFamily:SF,marginBottom:16}}>
              Cancel
            </button>
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
              {publicRows.length===0&&<div style={{padding:"20px 16px",fontSize:15,color:LB3,textAlign:"center"}}>Tap Edit Profile to add your info.</div>}
            </div>
          </div>
        )
      )}

      {/* ── PRIVATE ── */}
      {section==="private"&&(
        <div style={{padding:"0 16px"}}>
          <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC,lineHeight:1.7}}>
            🔒 Visible only to you and admin.<br/>
            <strong>IC & EPF</strong> are locked after verification.<br/>
            <strong>Bank</strong> can always be updated (needs re-approval).
          </div>
          {/* IC */}
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>IC Number</div>
                <VerifBadge field="ic_number"/>
              </div>
              <div style={{fontSize:16,color:LBL,marginBottom:8}}>{profile.ic_number||"Not provided"}</div>
              {!profile.ic_verified&&(
                privateEditing==="ic"?(
                  <div style={{borderTop:`1px solid ${SEP}`,paddingTop:12}}>
                    <input value={privateForm.ic_number} onChange={e=>setPrivateForm(p=>({...p,ic_number:formatIC(e.target.value)}))} placeholder="XXXXXX-XX-XXXX"
                      style={{width:"100%",background:"#f2f2f7",border:`1px solid ${SEP}`,borderRadius:9,padding:"10px 12px",fontSize:16,color:LBL,outline:"none",marginBottom:6,letterSpacing:1}}/>
                    <div style={{fontSize:12,color:getICDigits(privateForm.ic_number).length===12?"#34c759":LB3,marginBottom:8}}>{getICDigits(privateForm.ic_number).length}/12 digits</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPrivateEditing(null)} style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:9,fontSize:14,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                      <button onClick={()=>submitPrivate("ic_number",privateForm.ic_number)} disabled={submittingPrivate||getICDigits(privateForm.ic_number).length!==12}
                        style={{flex:2,padding:"10px",background:ACC,border:"none",borderRadius:9,fontSize:14,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF}}>Submit</button>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>setPrivateEditing("ic")} style={{width:"100%",padding:"10px",background:`${ACC}10`,border:"none",borderRadius:9,fontSize:14,color:ACC,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                    {profile.ic_number?"Update IC":"Add IC Number"}
                  </button>
                )
              )}
            </div>
          </div>
          {/* EPF */}
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>EPF Number</div>
                <VerifBadge field="epf_number"/>
              </div>
              <div style={{fontSize:16,color:LBL,marginBottom:8}}>{profile.epf_number||"Not provided"}</div>
              {!profile.epf_verified&&(
                privateEditing==="epf"?(
                  <div style={{borderTop:`1px solid ${SEP}`,paddingTop:12}}>
                    <input value={privateForm.epf_number} onChange={e=>setPrivateForm(p=>({...p,epf_number:e.target.value.replace(/\D/g,"")}))} placeholder="XXXXXXXXXXXX" type="tel"
                      style={{width:"100%",background:"#f2f2f7",border:`1px solid ${SEP}`,borderRadius:9,padding:"10px 12px",fontSize:16,color:LBL,outline:"none",marginBottom:8}}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPrivateEditing(null)} style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:9,fontSize:14,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                      <button onClick={()=>submitPrivate("epf_number",privateForm.epf_number)} disabled={submittingPrivate||!privateForm.epf_number}
                        style={{flex:2,padding:"10px",background:ACC,border:"none",borderRadius:9,fontSize:14,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF}}>Submit</button>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>setPrivateEditing("epf")} style={{width:"100%",padding:"10px",background:`${ACC}10`,border:"none",borderRadius:9,fontSize:14,color:ACC,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                    {profile.epf_number?"Update EPF":"Add EPF Number"}
                  </button>
                )
              )}
            </div>
          </div>
          {/* Bank — always editable */}
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            <div style={{padding:"11px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>Bank Account</div>
                <VerifBadge field="bank_account"/>
              </div>
              <div style={{fontSize:16,color:LBL,marginBottom:2}}>{profile.bank_account||"Not provided"}</div>
              {profile.bank_type&&<div style={{fontSize:13,color:LB3,marginBottom:8}}>{profile.bank_type}</div>}
              {privateEditing==="bank"?(
                <div style={{borderTop:`1px solid ${SEP}`,paddingTop:12}}>
                  <input value={privateForm.bank_account} onChange={e=>setPrivateForm(p=>({...p,bank_account:e.target.value.replace(/\D/g,"")}))} placeholder="Numbers only" type="tel"
                    style={{width:"100%",background:"#f2f2f7",border:`1px solid ${SEP}`,borderRadius:9,padding:"10px 12px",fontSize:16,color:LBL,outline:"none",marginBottom:8}}/>
                  <div style={{position:"relative",marginBottom:8}}>
                    <select value={privateForm.bank_type} onChange={e=>setPrivateForm(p=>({...p,bank_type:e.target.value}))}
                      style={{width:"100%",background:"transparent",border:`1px solid ${SEP}`,borderRadius:9,padding:"10px 32px 10px 12px",fontSize:16,color:LBL,appearance:"none",WebkitAppearance:"none",cursor:"pointer",outline:"none"}}>
                      {BANK_TYPES.map(b=><option key={b} value={b}>{b}</option>)}
                    </select>
                    <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:LB3,pointerEvents:"none"}}>▾</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setPrivateEditing(null)} style={{flex:1,padding:"10px",background:"rgba(0,0,0,.05)",border:"none",borderRadius:9,fontSize:14,color:LB2,cursor:"pointer",fontFamily:SF}}>Cancel</button>
                    <button onClick={()=>submitPrivate("bank_account",privateForm.bank_account,privateForm.bank_type)} disabled={submittingPrivate||!privateForm.bank_account}
                      style={{flex:2,padding:"10px",background:ACC,border:"none",borderRadius:9,fontSize:14,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF}}>Submit</button>
                  </div>
                </div>
              ):(
                <button onClick={()=>setPrivateEditing("bank")} style={{width:"100%",padding:"10px",background:`${ACC}10`,border:"none",borderRadius:9,fontSize:14,color:ACC,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  {profile.bank_account?"Update Bank Account":"Add Bank Account"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
