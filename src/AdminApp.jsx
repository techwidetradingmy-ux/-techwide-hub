import {useState,useEffect} from "react";
import {supabase} from "./supabaseClient";
import {SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore} from "./constants";

export default function AdminApp({profile,onProfileUpdate}){
  const [tab,setTab]=useState("dash");
  const [allProfiles,setAllProfiles]=useState([]);
  const [missions,setMissions]=useState([]);
  const [submissions,setSubmissions]=useState([]);
  const [prizes,setPrizes]=useState([]);
  const [announcements,setAnnouncements]=useState([]);
  const [redemptions,setRedemptions]=useState([]);
  const [toast,setToast]=useState(null);
  const [mForm,setMForm]=useState({title:"",description:"",xp:150,category:"Sales",difficulty:"Medium",period:"Daily"});
  const [aForm,setAForm]=useState({title:"",body:"",pinned:false});
  const [pForm,setPForm]=useState({name:"",cost:500,stock:10,icon:"🎁",category:"Cash",desc:""});

  useEffect(()=>{loadAll();},[]);

  const loadAll=async()=>{
    const[pr,mi,su,pz,an,re]=await Promise.all([
      supabase.from("profiles").select("*").order("xp",{ascending:false}),
      supabase.from("missions").select("*").eq("active",true),
      supabase.from("mission_submissions").select("*, profiles(name,avatar), missions(title,xp)").order("submitted_at",{ascending:false}),
      supabase.from("prizes").select("*").eq("active",true),
      supabase.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}),
      supabase.from("redemptions").select("*, profiles(name)").order("redeemed_at",{ascending:false}),
    ]);
    if(pr.data)setAllProfiles(pr.data);
    if(mi.data)setMissions(mi.data);
    if(su.data)setSubmissions(su.data);
    if(pz.data)setPrizes(pz.data.length>0?pz.data:PRIZES.map(x=>({...x,cost:x.pts,category:x.cat})));
    if(an.data)setAnnouncements(an.data);
    if(re.data)setRedemptions(re.data);
  };

  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2800);};

  const approveSubmission=async(sub,approve)=>{
    const status=approve?"Approved":"Rejected";
    await supabase.from("mission_submissions").update({status,reviewed_at:new Date().toISOString()}).eq("id",sub.id);
    if(approve){
      await supabase.from("mission_claims").update({completed:true}).eq("id",sub.claim_id);
      const prof=allProfiles.find(p=>p.id===sub.user_id);
      if(prof){
        await supabase.from("profiles").update({xp:(prof.xp||0)+(sub.missions?.xp||100)}).eq("id",sub.user_id);
      }
    }
    await loadAll();
    showToast(approve?"✅ Approved! Points awarded.":"❌ Submission rejected.");
  };

  const approveRedemption=async id=>{
    await supabase.from("redemptions").update({status:"Approved"}).eq("id",id);
    await loadAll();
    showToast("✅ Redemption approved!");
  };

  const deleteMission=async id=>{
    await supabase.from("missions").update({active:false}).eq("id",id);
    await loadAll();
    showToast("Mission removed");
  };

  const deleteAnnouncement=async id=>{
    await supabase.from("announcements").delete().eq("id",id);
    await loadAll();
    showToast("Announcement deleted");
  };

  const addMission=async()=>{
    if(!mForm.title.trim())return;
    await supabase.from("missions").insert({...mForm,xp:+mForm.xp,active:true});
    await loadAll();
    setMForm({title:"",description:"",xp:150,category:"Sales",difficulty:"Medium",period:"Daily"});
    showToast("Mission added ✅");
  };

  const addAnn=async()=>{
    if(!aForm.title.trim())return;
    await supabase.from("announcements").insert(aForm);
    await loadAll();
    setAForm({title:"",body:"",pinned:false});
    showToast("Announcement posted ✅");
  };

  const addPrize=async()=>{
    if(!pForm.name.trim())return;
    await supabase.from("prizes").insert({...pForm,cost:+pForm.cost,stock:+pForm.stock,active:true});
    await loadAll();
    setPForm({name:"",cost:500,stock:10,icon:"🎁",category:"Cash",desc:""});
    showToast("Prize added ✅");
  };

  const today=new Date().toISOString().split("T")[0];
  const pendingSubs=submissions.filter(s=>s.status==="Pending").length;
  const pendingReds=redemptions.filter(r=>r.status==="Pending").length;

  // ── Shared UI Components ──
  const Section=({children,style={}})=>(
    <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8,...style}}>
      {children}
    </div>
  );

  const SHead=({t})=>(
    <div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>
      {t}
    </div>
  );

  const Inp=({value,onChange,placeholder,type="text",multiline})=>multiline
    ?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
        style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",padding:0,lineHeight:1.45,fontFamily:SF}}/>
    :<input value={value} onChange={onChange} placeholder={placeholder} type={type}
        style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>;

  const FR=({label,children,last})=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      {label&&<div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>}
      {children}
    </div>
  );

  const PBtn=({children,onClick,color,disabled})=>(
    <button onClick={onClick} disabled={disabled}
      style={{width:"100%",background:disabled?"#e5e5ea":color||ACC,color:disabled?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:disabled?"default":"pointer",fontFamily:SF}}>
      {children}
    </button>
  );

  const StatusBadge=({status})=>{
    const c=status==="Pending"?"#ff9500":status==="Approved"?"#34c759":"#ff3b30";
    return <div style={{background:c+"18",color:c,fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99,flexShrink:0}}>{status}</div>;
  };

  // ── DASHBOARD TAB ──
  function DashTab(){
    const checkedInToday=allProfiles.filter(p=>p.last_checkin===today).length;
    const totalXP=allProfiles.reduce((a,p)=>a+(p.xp||0),0);
    const completedToday=submissions.filter(s=>s.submitted_at?.startsWith(today)).length;

    return(
      <div style={{padding:"0 16px 12px"}}>
        {/* Stats grid */}
        <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {[
            {l:"Total Staff",   v:allProfiles.length,              i:"👥", c:ACC},
            {l:"Checked In",    v:`${checkedInToday}/${allProfiles.length}`, i:"✅", c:"#34c759"},
            {l:"Pending Proofs",v:pendingSubs,                     i:"📋", c:"#ff9500"},
            {l:"Pending Redeem",v:pendingReds,                     i:"🎁", c:"#ff3b30"},
          ].map((s,i)=>(
            <div key={i} style={{background:BG2,borderRadius:13,padding:"16px"}}>
              <div style={{fontSize:24,marginBottom:8}}>{s.i}</div>
              <div style={{fontSize:28,fontWeight:700,color:s.c,letterSpacing:"-1px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:13,color:LB3,marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Top performers */}
        <SHead t="🏆 Top Performers"/>
        <Section>
          {allProfiles.slice(0,5).map((s,i)=>{
            const sTier=getTier(calcScore(s.joined_date,0));
            return(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<4?`1px solid ${SEP}`:"none"}}>
                <div style={{fontWeight:700,fontSize:i<3?18:14,color:i<3?ORG:"#8e8e93",width:26,textAlign:"center",flexShrink:0}}>
                  {["🥇","🥈","🥉"][i]||`#${i+1}`}
                </div>
                <div style={{width:38,height:38,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                  {!s.avatar_url&&(s.avatar||"?")}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{fontSize:15,color:LBL,letterSpacing:"-.3px"}}>{s.nickname||s.name}</div>
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
        </Section>

        {/* Recent submissions */}
        <SHead t="📋 Recent Submissions"/>
        <Section>
          {submissions.slice(0,5).length===0
            ?<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No submissions yet</div>
            :submissions.slice(0,5).map((s,i,a)=>(
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,color:LBL,letterSpacing:"-.2px"}}>{s.profiles?.name||"Unknown"}</div>
                  <div style={{fontSize:12,color:LB3,marginTop:1}}>{s.missions?.title}</div>
                </div>
                <StatusBadge status={s.status}/>
              </div>
            ))
          }
        </Section>

        {/* Today's check-ins */}
        <SHead t="📅 Today's Attendance"/>
        <Section>
          {allProfiles.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:s.last_checkin===today?"#34c759":"#e5e5ea",flexShrink:0}}/>
              <div style={{flex:1,fontSize:15,color:LBL,letterSpacing:"-.2px"}}>{s.name}</div>
              <div style={{fontSize:13,color:s.last_checkin===today?"#34c759":"#ff3b30",fontWeight:500}}>
                {s.last_checkin===today?"✓ Present":"Absent"}
              </div>
            </div>
          ))}
        </Section>
      </div>
    );
  }

  // ── STAFF TAB ──
  function StaffTab(){
    const [view,setView]=useState("list");
    return(
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{display:"flex",gap:8,marginBottom:14}}>
          {[["list","Staff List"],["private","Private Info"]].map(([id,label])=>(
            <button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"10px",background:view===id?ACC:"rgba(0,0,0,.06)",color:view===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:view===id?600:400,cursor:"pointer",fontFamily:SF}}>
              {label}
            </button>
          ))}
        </div>

        {view==="list"&&(
          <>
            <SHead t={`All Staff (${allProfiles.length})`}/>
            <Section>
              {allProfiles.map((s,i)=>{
                const sTier=getTier(calcScore(s.joined_date,0));
                return(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0,overflow:"hidden"}}>
                      {!s.avatar_url&&(s.avatar||"?")}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{fontSize:16,color:LBL,fontWeight:500,letterSpacing:"-.3px"}}>{s.name}</div>
                        <span style={{fontSize:13}}>{sTier.emoji}</span>
                      </div>
                      <div style={{fontSize:13,color:LB3,marginTop:1}}>{s.role}</div>
                      <div style={{fontSize:12,color:LB3,marginTop:1}}>
                        {s.nickname&&`"${s.nickname}" · `}
                        Joined {s.joined_date?new Date(s.joined_date).toLocaleDateString("en-MY",{month:"short",year:"numeric"}):"N/A"}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:700,color:ACC}}>{(s.xp||0).toLocaleString()} pts</div>
                      <div style={{fontSize:11,color:s.last_checkin===today?"#34c759":"#ff3b30",marginTop:2}}>
                        {s.last_checkin===today?"✓ In Today":"— Not In"}
                      </div>
                      <div style={{fontSize:11,color:sTier.color,marginTop:1}}>{sTier.name}</div>
                    </div>
                  </div>
                );
              })}
            </Section>
          </>
        )}

        {view==="private"&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC,lineHeight:1.6}}>
              🔒 This information is strictly confidential and only visible to admin.
            </div>
            {allProfiles.map(s=>(
              <div key={s.id} style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${SEP}`}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",overflow:"hidden"}}>
                    {!s.avatar_url&&(s.avatar||"?")}
                  </div>
                  <div>
                    <div style={{fontSize:16,color:LBL,fontWeight:500}}>{s.name}</div>
                    <div style={{fontSize:13,color:LB3}}>{s.role}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    ["📋 IC Number",     s.ic_number],
                    ["💰 EPF Number",    s.epf_number],
                    ["🏦 Bank Account", s.bank_account],
                    ["📱 WhatsApp",      s.whatsapp],
                    ["📧 Email",         s.email||"N/A"],
                    ["🎂 Birthday",      s.birthday?new Date(s.birthday).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"}):"N/A"],
                  ].map(([label,val])=>(
                    <div key={label}>
                      <div style={{fontSize:11,color:LB3,marginBottom:2}}>{label}</div>
                      <div style={{fontSize:13,color:val&&val!=="N/A"?LBL:LB3,fontWeight:val&&val!=="N/A"?500:400}}>{val||"Not provided"}</div>
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

  // ── APPROVALS TAB ──
  function ApprovalsTab(){
    const [sec,setSec]=useState("missions");
    const pending=submissions.filter(s=>s.status==="Pending");
    const pendReds=redemptions.filter(r=>r.status==="Pending");
    const allSubs=submissions.filter(s=>s.status!=="Pending");
    const allReds=redemptions.filter(r=>r.status!=="Pending");

    return(
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{display:"flex",gap:8,marginBottom:14}}>
          {[
            ["missions",    "Submissions", pending.length],
            ["redemptions", "Redemptions", pendReds.length],
          ].map(([id,label,count])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{flex:1,padding:"10px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF,position:"relative"}}>
              {label}
              {count>0&&<span style={{marginLeft:5,background:sec===id?"rgba(255,255,255,.3)":ORG,color:"#fff",fontSize:11,padding:"1px 6px",borderRadius:99,fontWeight:700}}>{count}</span>}
            </button>
          ))}
        </div>

        {sec==="missions"&&(
          <>
            {pending.length>0&&<SHead t={`⏳ Pending (${pending.length})`}/>}
            {pending.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:LB3,fontSize:15}}>All clear! No pending submissions 🎉</div>}
            {pending.map(sub=>(
              <div key={sub.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontSize:12,color:LB3,marginBottom:3,letterSpacing:"-.1px"}}>{sub.profiles?.name||"Unknown"}</div>
                    <div style={{fontSize:17,color:LBL,fontWeight:500,letterSpacing:"-.35px"}}>{sub.missions?.title}</div>
                  </div>
                  <div style={{background:`${ACC}14`,borderRadius:9,padding:"5px 10px",textAlign:"center",flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:700,color:ACC,lineHeight:1}}>+{sub.missions?.xp||100}</div>
                    <div style={{fontSize:10,color:LB3}}>pts</div>
                  </div>
                </div>
                {sub.submission_text&&(
                  <div style={{background:"#f2f2f7",borderRadius:10,padding:"10px 12px",fontSize:14,color:LB2,lineHeight:1.55,marginBottom:10,whiteSpace:"pre-wrap"}}>
                    {sub.submission_text}
                  </div>
                )}
                {sub.submission_image&&(
                  <img src={sub.submission_image} alt="proof" style={{width:"100%",borderRadius:10,marginBottom:10,maxHeight:220,objectFit:"cover"}}/>
                )}
                <div style={{fontSize:11,color:LB3,marginBottom:12}}>
                  Submitted {new Date(sub.submitted_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>approveSubmission(sub,false)}
                    style={{flex:1,padding:"11px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                    Reject
                  </button>
                  <button onClick={()=>approveSubmission(sub,true)}
                    style={{flex:2,padding:"11px",background:"#34c759",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                    Approve ✓
                  </button>
                </div>
              </div>
            ))}

            {allSubs.length>0&&(
              <>
                <SHead t="✅ Previously Reviewed"/>
                <Section>
                  {allSubs.slice(0,10).map((s,i,a)=>(
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,color:LBL,letterSpacing:"-.2px"}}>{s.profiles?.name||"Unknown"}</div>
                        <div style={{fontSize:12,color:LB3,marginTop:1}}>{s.missions?.title}</div>
                      </div>
                      <StatusBadge status={s.status}/>
                    </div>
                  ))}
                </Section>
              </>
            )}
          </>
        )}

        {sec==="redemptions"&&(
          <>
            {pendReds.length>0&&<SHead t={`⏳ Pending (${pendReds.length})`}/>}
            {pendReds.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:LB3,fontSize:15}}>No pending redemptions 🎉</div>}
            {pendReds.map(r=>(
              <div key={r.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,color:LB3,marginBottom:3}}>{r.profiles?.name||"Unknown"}</div>
                    <div style={{fontSize:17,color:LBL,fontWeight:500,letterSpacing:"-.3px"}}>{r.prize_name}</div>
                  </div>
                  <StatusBadge status={r.status}/>
                </div>
                <div style={{fontSize:12,color:LB3,marginBottom:12}}>
                  Redeemed {new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}
                </div>
                <button onClick={()=>approveRedemption(r.id)}
                  style={{width:"100%",padding:"11px",background:ACC,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  Mark as Delivered ✓
                </button>
              </div>
            ))}

            {allReds.length>0&&(
              <>
                <SHead t="✅ Delivered"/>
                <Section>
                  {allReds.slice(0,10).map((r,i,a)=>(
                    <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none",gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,color:LBL}}>{r.profiles?.name||"Unknown"}</div>
                        <div style={{fontSize:12,color:LB3,marginTop:1}}>{r.prize_name}</div>
                      </div>
                      <StatusBadge status={r.status}/>
                    </div>
                  ))}
                </Section>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ── CONTENT TAB ──
  function ContentTab(){
    const [sec,setSec]=useState("missions");
    return(
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto"}}>
          {[["missions","Missions"],["announcements","Announcements"],["prizes","Prizes"]].map(([id,label])=>(
            <button key={id} onClick={()=>setSec(id)}
              style={{flexShrink:0,padding:"8px 16px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:14,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF}}>
              {label}
            </button>
          ))}
        </div>

        {sec==="missions"&&(
          <>
            <SHead t="➕ Add New Mission"/>
            <Section>
              <FR label="Title"><Inp value={mForm.title} onChange={e=>setMForm(p=>({...p,title:e.target.value}))} placeholder="Mission title"/></FR>
              <FR label="Description"><Inp value={mForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="What needs to be done" multiline/></FR>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
                <FR label="Points Reward"><Inp value={mForm.xp} onChange={e=>setMForm(p=>({...p,xp:e.target.value}))} placeholder="150" type="number"/></FR>
                <FR label="Category"><Inp value={mForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))} placeholder="Sales"/></FR>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
                <FR label="Difficulty"><Inp value={mForm.difficulty} onChange={e=>setMForm(p=>({...p,difficulty:e.target.value}))} placeholder="Easy / Medium / Hard"/></FR>
                <FR label="Period" last><Inp value={mForm.period} onChange={e=>setMForm(p=>({...p,period:e.target.value}))} placeholder="Daily / Weekly"/></FR>
              </div>
            </Section>
            <div style={{marginBottom:16}}><PBtn onClick={addMission}>Add Mission</PBtn></div>

            <SHead t="📋 Active Missions"/>
            <Section>
              {missions.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No missions yet</div>}
              {missions.map((m,i)=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<missions.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,color:LBL,letterSpacing:"-.2px"}}>{m.title}</div>
                    <div style={{fontSize:12,color:LB3,marginTop:1}}>{m.category} · {m.difficulty} · {m.period}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:ACC,flexShrink:0}}>{m.xp} pts</div>
                  <button onClick={()=>deleteMission(m.id)}
                    style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF,flexShrink:0}}>
                    Remove
                  </button>
                </div>
              ))}
            </Section>
          </>
        )}

        {sec==="announcements"&&(
          <>
            <SHead t="📢 Post Announcement"/>
            <Section>
              <FR label="Title"><Inp value={aForm.title} onChange={e=>setAForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title"/></FR>
              <FR label="Body"><Inp value={aForm.body} onChange={e=>setAForm(p=>({...p,body:e.target.value}))} placeholder="Write your announcement…" multiline/></FR>
              <FR label="Pin to Top" last>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:17,color:LBL}}>Pin to top</div>
                  <div onClick={()=>setAForm(p=>({...p,pinned:!p.pinned}))}
                    style={{width:50,height:30,borderRadius:99,background:aForm.pinned?ACC:"#e5e5ea",position:"relative",cursor:"pointer",transition:"background .2s"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:aForm.pinned?22:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
                  </div>
                </div>
              </FR>
            </Section>
            <div style={{marginBottom:16}}><PBtn onClick={addAnn}>Post Announcement</PBtn></div>

            <SHead t="📌 Current Announcements"/>
            {announcements.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:LB3,fontSize:15}}>No announcements yet</div>}
            {announcements.map(a=>(
              <div key={a.id} style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8,borderLeft:a.pinned?`3px solid ${ORG}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,marginRight:10}}>
                    {a.pinned&&<div style={{fontSize:11,color:ORG,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase",marginBottom:4}}>📌 Pinned</div>}
                    <div style={{fontSize:16,color:LBL,fontWeight:500,letterSpacing:"-.3px"}}>{a.title}</div>
                  </div>
                  <button onClick={()=>deleteAnnouncement(a.id)}
                    style={{background:"#ff3b3012",color:"#ff3b30",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontFamily:SF,flexShrink:0}}>
                    Delete
                  </button>
                </div>
                <div style={{fontSize:14,color:LB3,lineHeight:1.5}}>{a.body}</div>
                <div style={{fontSize:11,color:LB3,marginTop:8}}>{new Date(a.created_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
              </div>
            ))}
          </>
        )}

        {sec==="prizes"&&(
          <>
            <SHead t="🎁 Add New Prize"/>
            <Section>
              <FR label="Prize Name"><Inp value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Bubble Tea Voucher"/></FR>
              <FR label="Description"><Inp value={pForm.desc} onChange={e=>setPForm(p=>({...p,desc:e.target.value}))} placeholder="Short description of prize"/></FR>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                <FR label="Pts Cost"><Inp value={pForm.cost} onChange={e=>setPForm(p=>({...p,cost:e.target.value}))} placeholder="500" type="number"/></FR>
                <FR label="Stock"><Inp value={pForm.stock} onChange={e=>setPForm(p=>({...p,stock:e.target.value}))} placeholder="10" type="number"/></FR>
                <FR label="Icon" last><Inp value={pForm.icon} onChange={e=>setPForm(p=>({...p,icon:e.target.value}))} placeholder="🎁"/></FR>
              </div>
            </Section>
            <div style={{marginBottom:16}}><PBtn onClick={addPrize}>Add Prize</PBtn></div>

            <SHead t="🛍️ Active Prizes"/>
            <Section>
              {prizes.length===0&&<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No prizes yet</div>}
              {prizes.map((p,i)=>(
                <div key={p.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<prizes.length-1?`1px solid ${SEP}`:"none"}}>
                  <div style={{fontSize:26,flexShrink:0}}>{p.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,color:LBL,letterSpacing:"-.2px"}}>{p.name}</div>
                    <div style={{fontSize:12,color:LB3,marginTop:1}}>{p.stock??p.stock} left · {(p.pts||p.cost)?.toLocaleString()} pts</div>
                  </div>
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    );
  }

  // ── TABS CONFIG ──
  const TABS=[
    {id:"dash",      label:"Dashboard", emoji:"📊"},
    {id:"staff",     label:"Staff",     emoji:"👥"},
    {id:"approvals", label:"Approvals", emoji:"📋", badge:pendingSubs+pendingReds},
    {id:"content",   label:"Content",   emoji:"✏️"},
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
            <button onClick={()=>supabase.auth.signOut()}
              style={{fontSize:13,color:"#ff3b30",fontWeight:500,background:"rgba(255,59,48,.1)",padding:"4px 9px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:SF}}>
              Sign Out
            </button>
          </div>
        </div>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",marginTop:6}}>
          {tab==="dash"      &&"Dashboard 📊"}
          {tab==="staff"     &&"Staff 👥"}
          {tab==="approvals" &&"Approvals 📋"}
          {tab==="content"   &&"Content ✏️"}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 0 90px"}}>
        {tab==="dash"      &&<DashTab/>}
        {tab==="staff"     &&<StaffTab/>}
        {tab==="approvals" &&<ApprovalsTab/>}
        {tab==="content"   &&<ContentTab/>}
      </div>

      {/* Tab Bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(249,249,249,.94)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,.1)",display:"flex",zIndex:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"7px 2px 11px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
            <div style={{fontSize:tab===t.id?21:17,lineHeight:1,filter:tab===t.id?"none":"grayscale(1) opacity(.35)",transition:"font-size .15s"}}>{t.emoji}</div>
            <div style={{fontSize:9,fontWeight:tab===t.id?600:400,color:tab===t.id?ACC:"#8e8e93",fontFamily:SF}}>{t.label}</div>
            {t.badge>0&&(
              <div style={{position:"absolute",top:4,right:"16%",minWidth:16,height:16,background:"#ff3b30",borderRadius:99,fontSize:9,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>
                {t.badge}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.78)",backdropFilter:"blur(16px)",borderRadius:99,padding:"10px 20px",fontSize:14,color:"#fff",fontWeight:500,whiteSpace:"nowrap",zIndex:50,pointerEvents:"none",maxWidth:"85vw",textAlign:"center"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
