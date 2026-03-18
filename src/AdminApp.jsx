import {useState,useEffect} from "react";
import {supabase} from "./supabaseClient";
import {SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,PRIZES,getTier,calcScore} from "./constants";

export default function AdminApp({profile:initialProfile,onProfileUpdate}){
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
      if(prof)await supabase.from("profiles").update({xp:(prof.xp||0)+(sub.missions?.xp||100)}).eq("id",sub.user_id);
    }
    await loadAll();
    showToast(approve?"✅ Approved! Points awarded.":"❌ Submission rejected.");
  };

  const approveRedemption=async id=>{
    await supabase.from("redemptions").update({status:"Approved"}).eq("id",id);
    await loadAll();
    showToast("✅ Redemption approved!");
  };

  const addMission=async()=>{
    if(!mForm.title.trim())return;
    await supabase.from("missions").insert({...mForm,xp:+mForm.xp,active:true});
    await loadAll();
    setMForm({title:"",description:"",xp:150,category:"Sales",difficulty:"Medium",period:"Daily"});
    showToast("Mission added");
  };
  const addAnn=async()=>{
    if(!aForm.title.trim())return;
    await supabase.from("announcements").insert(aForm);
    await loadAll();
    setAForm({title:"",body:"",pinned:false});
    showToast("Announcement posted");
  };
  const addPrize=async()=>{
    if(!pForm.name.trim())return;
    await supabase.from("prizes").insert({...pForm,cost:+pForm.cost,stock:+pForm.stock,active:true});
    await loadAll();
    setPForm({name:"",cost:500,stock:10,icon:"🎁",category:"Cash",desc:""});
    showToast("Prize added");
  };

  const today=new Date().toISOString().split("T")[0];
  const pendingSubs=submissions.filter(s=>s.status==="Pending").length;
  const pendingReds=redemptions.filter(r=>r.status==="Pending").length;

  const Section=({children,style={}})=><div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8,...style}}>{children}</div>;
  const SHead=({t})=><div style={{fontSize:13,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,margin:"16px 4px 8px"}}>{t}</div>;
  const Inp=({value,onChange,placeholder,type="text",multiline})=>multiline
    ?<textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",padding:0,lineHeight:1.45,fontFamily:SF}}/>
    :<input value={value} onChange={onChange} placeholder={placeholder} type={type} style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>;
  const FR=({label,children,last})=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      {label&&<div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>{label}</div>}
      {children}
    </div>
  );
  const PBtn=({children,onClick,color})=>(
    <button onClick={onClick} style={{width:"100%",background:color||ACC,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF}}>{children}</button>
  );

  function DashTab(){
    const checkedInToday=allProfiles.filter(p=>p.last_checkin===today).length;
    return(
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {[
            {l:"Total Staff",   v:allProfiles.length,  i:"👥", c:ACC},
            {l:"Checked In",    v:checkedInToday,      i:"✅", c:"#34c759"},
            {l:"Pending Proofs",v:pendingSubs,          i:"📋", c:"#ff9500"},
            {l:"Pending Redeem",v:pendingReds,          i:"🎁", c:"#ff3b30"},
          ].map((s,i)=>(
            <div key={i} style={{background:BG2,borderRadius:13,padding:"14px 16px"}}>
              <div style={{fontSize:22,marginBottom:6}}>{s.i}</div>
              <div style={{fontSize:26,fontWeight:700,color:s.c,letterSpacing:"-1px",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:12,color:LB3,marginTop:3}}>{s.l}</div>
            </div>
          ))}
        </div>
        <SHead t="Top Performers"/>
        <Section>
          {allProfiles.slice(0,5).map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderBottom:i<4?`1px solid ${SEP}`:"none"}}>
              <div style={{fontWeight:700,fontSize:i<3?18:13,color:i<3?ORG:"#8e8e93",width:24,textAlign:"center",flexShrink:0}}>{["🥇","🥈","🥉"][i]||`#${i+1}`}</div>
              <div style={{width:36,height:36,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0,overflow:"hidden"}}>{!s.avatar_url&&(s.avatar||"?")}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,color:LBL,letterSpacing:"-.3px"}}>{s.nickname||s.name}</div>
                <div style={{fontSize:12,color:LB3}}>{s.role}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:ACC}}>{s.xp.toLocaleString()}</div>
                <div style={{fontSize:10,color:LB3}}>pts</div>
              </div>
            </div>
          ))}
        </Section>
        <SHead t="Recent Submissions"/>
        <Section>
          {submissions.slice(0,5).length===0
            ?<div style={{padding:"14px 16px",fontSize:15,color:LB3}}>No submissions yet</div>
            :submissions.slice(0,5).map((s,i,a)=>(
              <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1?`1px solid ${SEP}`:"none"}}>
                <div>
                  <div style={{fontSize:15,color:LBL}}>{s.profiles?.name||"Unknown"}</div>
                  <div style={{fontSize:13,color:LB3}}>{s.missions?.title}</div>
                </div>
                <div style={{background:s.status==="Pending"?"#ff950018":s.status==="Approved"?"#34c75918":"#ff3b3018",color:s.status==="Pending"?"#ff9500":s.status==="Approved"?"#34c759":"#ff3b30",fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99}}>{s.status}</div>
              </div>
            ))
          }
        </Section>
      </div>
    );
  }

  function StaffTab(){
    return(
      <div style={{padding:"0 16px 12px"}}>
        <SHead t={`Staff (${allProfiles.length})`}/>
        <Section>
          {allProfiles.map((s,i)=>{
            const sTier=getTier(calcScore(s.joined_date,0));
            return(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:s.avatar_url?`url(${s.avatar_url}) center/cover`:`linear-gradient(145deg,${ACC},${ORG})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0,overflow:"hidden"}}>{!s.avatar_url&&(s.avatar||"?")}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{fontSize:15,color:LBL,letterSpacing:"-.3px",fontWeight:500}}>{s.name}</div>
                    <span style={{fontSize:13}}>{sTier.emoji}</span>
                  </div>
                  <div style={{fontSize:12,color:LB3}}>{s.role}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:600,color:ACC}}>{s.xp.toLocaleString()} pts</div>
                  <div style={{fontSize:11,color:s.last_checkin===today?"#34c759":"#ff3b30",marginTop:1}}>{s.last_checkin===today?"✓ In":"— Out"}</div>
                </div>
              </div>
            );
          })}
        </Section>

        <SHead t="Private Staff Info (Admin Only)"/>
        <Section>
          {allProfiles.map((s,i)=>(
            <div key={s.id} style={{padding:"12px 16px",borderBottom:i<allProfiles.length-1?`1px solid ${SEP}`:"none"}}>
              <div style={{fontSize:15,color:LBL,fontWeight:500,marginBottom:4}}>{s.name}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                {[["IC",s.ic_number],["EPF",s.epf_number],["Bank",s.bank_account],["WhatsApp",s.whatsapp]].map(([label,val])=>(
                  <div key={label}>
                    <div style={{fontSize:10,color:LB3,letterSpacing:".2px"}}>{label}</div>
                    <div style={{fontSize:13,color:val?LBL:LB3}}>{val||"Not provided"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      </div>
    );
  }

  function ApprovalsTab(){
    const [sec,setSec]=useState("missions");
    const pending=submissions.filter(s=>s.status==="Pending");
    const pendReds=redemptions.filter(r=>r.status==="Pending");
    return(
      <div style={{padding:"0 16px 12px"}}>
        <div className="fade" style={{display:"flex",gap:8,marginBottom:14}}>
          {[["missions","Submissions",pending.length],["redemptions","Redemptions",pendReds.length]].map(([id,label,count])=>(
            <button key={id} onClick={()=>setSec(id)} style={{flex:1,padding:"10px",background:sec===id?ACC:"rgba(0,0,0,.06)",color:sec===id?"#fff":LB2,border:"none",borderRadius:10,fontSize:13,fontWeight:sec===id?600:400,cursor:"pointer",fontFamily:SF,position:"relative"}}>
              {label}
              {count>0&&<span style={{marginLeft:5,background:sec===id?"rgba(255,255,255,.3)":ORG,color:"#fff",fontSize:11,padding:"1px 6px",borderRadius:99}}>{count}</span>}
            </button>
          ))}
        </div>
        {sec==="missions"&&(
          <>
            {pending.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>All clear! No pending submissions 🎉</div>}
            {pending.map(sub=>(
              <div key={sub.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:LB3,marginBottom:2}}>{sub.profiles?.name}</div>
                    <div style={{fontSize:16,color:LBL,fontWeight:500,letterSpacing:"-.3px"}}>{sub.missions?.title}</div>
                  </div>
                  <div style={{background:`${ACC}14`,borderRadius:8,padding:"4px 9px",fontSize:13,color:ACC,fontWeight:700}}>+{sub.missions?.xp||100} pts</div>
                </div>
                {sub.submission_text&&<div style={{background:"#f2f2f7",borderRadius:10,padding:"10px 12px",fontSize:14,color:LB2,lineHeight:1.5,marginBottom:8}}>{sub.submission_text}</div>}
                {sub.submission_image&&<img src={sub.submission_image} alt="proof" style={{width:"100%",borderRadius:10,marginBottom:8,maxHeight:200,objectFit:"cover"}}/>}
                <div style={{fontSize:11,color:LB3,marginBottom:10}}>{new Date(sub.submitted_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>approveSubmission(sub,false)} style={{flex:1,padding:"10px",background:"#ff3b3012",color:"#ff3b30",border:"1px solid #ff3b3030",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Reject</button>
                  <button onClick={()=>approveSubmission(sub,true)} style={{flex:2,padding:"10px",background:ACC,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Approve ✓</button>
                </div>
              </div>
            ))}
          </>
        )}
        {sec==="redemptions"&&(
          <>
            {pendReds.length===0&&<div style={{textAlign:"center",padding:40,color:LB3,fontSize:15}}>No pending redemptions 🎉</div>}
            {pendReds.map(r=>(
              <div key={r.id} className="fade" style={{background:BG2,borderRadius:13,padding:"14px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:13,color:LB3,marginBottom:2}}>{r.profiles?.name||"Unknown"}</div>
                    <div style={{fontSize:16,color:LBL,fontWeight:500}}>{r.prize_name}</div>
                  </div>
                  <div style={{background:"#ff950018",color:"#ff9500",fontSize:12,fontWeight:600,padding:"3px 9px",borderRadius:99}}>{r.status}</div>
                </div>
                <div style={{fontSize:12,color:LB3,marginBottom:10}}>{new Date(r.redeemed_at).toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})}</div>
                <button onClick={()=>approveRedemption(r.id)} style={{width:"100%",padding:"10px",background:ACC,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:SF}}>Mark as Delivered ✓</button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  function ContentTab(){
    return(
      <div style={{padding:"0 16px 12px"}}>
        <SHead t="Add Mission"/>
        <Section>
          <FR label="Title"><Inp value={mForm.title} onChange={e=>setMForm(p=>({...p,title:e.target.value}))} placeholder="Mission title"/></FR>
          <FR label="Description"><Inp value={mForm.description} onChange={e=>setMForm(p=>({...p,description:e.target.value}))} placeholder="What needs to be done" multiline/></FR>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
            <FR label="Pts Reward"><Inp value={mForm.xp} onChange={e=>setMForm(p=>({...p,xp:e.target.value}))} placeholder="150" type="number"/></FR>
            <FR label="Category"><Inp value={mForm.category} onChange={e=>setMForm(p=>({...p,category:e.target.value}))} placeholder="Sales"/></FR>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
            <FR label="Difficulty"><Inp value={mForm.difficulty} onChange={e=>setMForm(p=>({...p,difficulty:e.target.value}))} placeholder="Easy / Medium / Hard"/></FR>
            <FR label="Period" last><Inp value={mForm.period} onChange={e=>setMForm(p=>({...p,period:e.target.value}))} placeholder="Daily / Weekly"/></FR>
          </div>
        </Section>
        <div style={{marginBottom:16}}><PBtn onClick={addMission}>Add Mission</PBtn></div>

        <SHead t="Post Announcement"/>
        <Section>
          <FR label="Title"><Inp value={aForm.title} onChange={e=>setAForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title"/></FR>
          <FR label="Body"><Inp value={aForm.body} onChange={e=>setAForm(p=>({...p,body:e.target.value}))} placeholder="Write your announcement…" multiline/></FR>
          <FR label="Pin to Top" last>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:17,color:LBL}}>Pin</div>
              <div onClick={()=>setAForm(p=>({...p,pinned:!p.pinned}))} style={{width:50,height:30,borderRadius:99,background:aForm.pinned?ACC:"#e5e5ea",position:"relative",cursor:"pointer",transition:"background .2s"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:aForm.pinned?22:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
              </div>
            </div>
          </FR>
        </Section>
        <div style={{marginBottom:16}}><PBtn onClick={addAnn}>Post Announcement</PBtn></div>

        <SHead t="Add Prize"/>
        <Section>
          <FR label="Prize Name"><Inp value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Bubble Tea Voucher"/></FR>
          <FR label="Description"><Inp value={pForm.desc} onChange={e=>setPForm(p=>({...p,desc:e.target.value}))} placeholder="Short description of prize"/></FR>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
            <FR label="Pts Cost"><Inp value={pForm.cost} onChange={e=>setPForm(p=>({...p,cost:e.target.value}))} placeholder="500" type="number"/></FR>
            <FR label="Stock"><Inp value={pForm.stock} onChange={e=>setPForm(p=>({...p,stock:e.target.value}))} placeholder="10" type="number"/></FR>
            <FR label="Icon" last><Inp value={pForm.
