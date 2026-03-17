import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export function HomeTab({ profile, announcements, myRedemptions, myClaims, missions, lv, pct, checkedIn, doCheckIn, Section, Row, PrimaryBtn, BG2, SEP, LBL, LB2, LB3, ACC, ORG }) {
  return (
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{background:`linear-gradient(145deg,${ACC},#0e2140)`,borderRadius:18,padding:20,marginBottom:8,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:`${ORG}18`,pointerEvents:"none"}}/>
        <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(145deg,${ORG},#ffb940)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,color:ACC,flexShrink:0,boxShadow:`0 4px 16px ${ORG}55`}}>{profile.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:"-.5px",lineHeight:1.1}}>{profile.name}</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.5)",marginTop:2}}>{profile.role}</div>
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
              <div style={{fontSize:14,color:LB3,marginTop:1}}>{profile.streak}-day streak 🔥</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{fontSize:13,color:LB3,letterSpacing:".3px",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Daily Check-In</div>
            <div style={{fontSize:15,color:LB2,marginBottom:14,lineHeight:1.4}}>Earn {profile.streak>=7?100:profile.streak>=3?75:50} XP. You're on a {profile.streak}-day streak.</div>
            <PrimaryBtn onClick={doCheckIn}>Check In  +{profile.streak>=7?100:profile.streak>=3?75:50} XP</PrimaryBtn>
          </>
        )}
      </div>

      <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
        {[{l:"Total XP",v:profile.xp.toLocaleString(),e:"⚡"},{l:"Streak",v:`${profile.streak}d`,e:"🔥"},{l:"Missions",v:myClaims.filter(c=>c.completed).length,e:"✅"}].map((s,i)=>(
          <div key={i} style={{background:BG2,borderRadius:13,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.e}</div>
            <div style={{fontSize:20,fontWeight:700,color:ACC,letterSpacing:"-.5px",lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:11,color:LB3,marginTop:3}}>{s.l}</div>
          </div>
        ))}
      </div>

      {announcements.filter(a=>a.pinned)[0] && (() => { const a=announcements.find(x=>x.pinned); return (
        <div className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:`3px solid ${ORG}`}}>
          <div style={{fontSize:11,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:5}}>📌 Pinned</div>
          <div style={{fontSize:16,color:LBL,fontWeight:500,letterSpacing:"-.3px",marginBottom:4}}>{a.title}</div>
          <div style={{fontSize:14,color:LB3,lineHeight:1.5}}>{a.body}</div>
        </div>
      );})()}

      {myRedemptions.length>0&&(
        <div className="fade">
          <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"12px 4px 8px"}}>Pending Rewards</div>
          <Section>{myRedemptions.slice(0,3).map((r,i,a)=><Row key={r.id} label={r.prize_name} badge={r.status} last={i===a.length-1}/>)}</Section>
        </div>
      )}
    </div>
  );
}

export function MissionsTab({ missions, myClaims, doClaimMission, doComplete, Chip, ACC, BG2, LBL, LB2, LB3, ORG, SF, CAT_C, DIFF_C }) {
  const [f,setF] = useState("All");
  const cats = ["All","Sales","Teamwork","Admin","Creativity"];
  const list = f==="All" ? missions : missions.filter(m=>m.category===f);
  return (
    <div style={{padding:"0 16px 12px"}}>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:8}} className="fade">
        {cats.map(c=>(
          <button key={c} onClick={()=>setF(c)} style={{flexShrink:0,padding:"6px 15px",borderRadius:99,fontSize:14,fontWeight:f===c?600:400,background:f===c?ACC:"rgba(0,0,0,.06)",color:f===c?"#fff":LB2,border:"none",cursor:"pointer",transition:"all .15s",fontFamily:SF}}>{c}</button>
        ))}
      </div>
      {list.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No missions yet</div>}
      {list.map(m=>{
        const claim=myClaims.find(c=>c.mission_id===m.id), done=claim?.completed;
        return (
          <div key={m.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,opacity:done?.6:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,marginRight:12}}>
                <div style={{fontSize:17,color:done?LB3:LBL,fontWeight:500,letterSpacing:"-.35px",textDecoration:done?"line-through":"none",marginBottom:3}}>{m.title}</div>
                <div style={{fontSize:14,color:LB3,lineHeight:1.45}}>{m.description}</div>
              </div>
              <div style={{background:`${ACC}14`,borderRadius:9,padding:"6px 10px",textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:18,fontWeight:700,color:ACC,lineHeight:1}}>+{m.xp}</div>
                <div style={{fontSize:10,color:LB3}}>XP</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <Chip color={CAT_C[m.category]||"#8e8e93"}>{m.category}</Chip>
              <Chip color={DIFF_C[m.difficulty]}>{m.difficulty}</Chip>
              <Chip color="#8e8e93">{m.period}</Chip>
            </div>
            {done
              ? <div style={{fontSize:14,color:"#34c759",fontWeight:600}}>Completed ✓</div>
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

export function PrizesTab({ profile, prizes, doRedeem, Chip, ACC, BG2, LBL, LB2, LB3, ORG, SF, CAT_C }) {
  return (
    <div style={{padding:"0 16px 12px"}}>
      <div className="fade" style={{background:BG2,borderRadius:13,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:15,color:LB2}}>Your balance</div>
        <div style={{fontSize:22,fontWeight:700,color:ACC,letterSpacing:"-.8px"}}>{profile.xp.toLocaleString()} <span style={{fontSize:14,fontWeight:500,color:LB3}}>XP</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {prizes.map(p=>{
          const can=profile.xp>=p.cost, out=p.stock<1;
          return (
            <div key={p.id} className="fade" style={{background:BG2,borderRadius:13,padding:"16px 14px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",opacity:out?.5:1}}>
              <div style={{fontSize:36,marginBottom:8}}>{p.icon}</div>
              <div style={{fontSize:15,color:LBL,fontWeight:500,marginBottom:4,lineHeight:1.3}}>{p.name}</div>
              <Chip color={CAT_C[p.category]||"#8e8e93"}>{p.category}</Chip>
              <div style={{marginTop:10,fontSize:20,fontWeight:700,color:can&&!out?ACC:"#8e8e93"}}>{p.cost.toLocaleString()}</div>
              <div style={{fontSize:11,color:LB3,marginTop:2,marginBottom:12}}>XP  •  {p.stock} left</div>
              <button onClick={()=>doRedeem(p.id)} disabled={!can||out} style={{width:"100%",padding:"10px",background:(!can||out)?"rgba(0,0,0,.06)":ACC,color:(!can||out)?LB3:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:(!can||out)?"default":"pointer",fontFamily:SF}}>
                {out?"Sold Out":can?"Redeem":"Need More XP"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeaderboardTab({ profile, allProfiles, ACC, BG2, LBL, LB3, ORG, SEP, SF, getLevel, getLvlPct, Section }) {
  return (
    <div style={{padding:"0 16px 12px"}}>
      <Section className="fade">
        {allProfiles.map((s,i)=>{
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
                <div style={{fontSize:16,fontWeight:700,color:ACC}}>{s.xp.toLocaleString()}</div>
                <div style={{fontSize:11,color:LB3,marginTop:1}}>XP</div>
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

export function NewsTab({ announcements, BG2, LBL, LB2, LB3, ORG }) {
  return (
    <div style={{padding:"0 16px 12px"}}>
      {announcements.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No announcements yet</div>}
      {announcements.map(a=>(
        <div key={a.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:a.pinned?`3px solid ${ORG}`:"none"}}>
          {a.pinned&&<div style={{fontSize:11,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:5}}>📌 Pinned</div>}
          <div style={{fontSize:17,color:LBL,fontWeight:500,letterSpacing:"-.35px",marginBottom:5}}>{a.title}</div>
          <div style={{fontSize:15,color:LB2,lineHeight:1.5,marginBottom:10}}>{a.body}</div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div style={{fontSize:13,color:LB3}}>{new Date(a.created_at).toLocaleDateString()}</div>
            <div style={{fontSize:13,color:LB3}}>by {a.author}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminTab({ allProfiles, today, mForm, setMForm, aForm, setAForm, pForm, setPForm, addMission, addAnnouncement, addPrize, Section, Row, PrimaryBtn, FormRow, StyledInput, ACC, BG2, LBL, LB3, ORG, SEP, SF }) {
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
          ?<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No redemptions yet</div>
          :allRed.slice(0,10).map((r,i,a)=><Row key={r.id} label={r.profiles?.name||"Unknown"} detail={r.prize_name} badge={r.status} last={i===a.length-1}/>)
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
