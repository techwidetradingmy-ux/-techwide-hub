import{useState,useEffect,useRef}from"react";
import{supabase}from"./supabaseClient";
import UserApp from"./UserApp";
import AdminApp from"./AdminApp";
import CircleCrop from"./CircleCrop";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,WELCOME,formatIC,getICDigits,formatContact,normalizeContact,validateContact,BANK_TYPES}from"./constants";

// ── ONBOARDING ─────────────────────────────────────────────────────────────
function OnboardingFlow({user,onComplete}){
  const [step,setStep]=useState(1);
  const [errors,setErrors]=useState({});
  const [form,setForm]=useState({
    name:user.name||"",nickname:"",birthday:"",
    joined_date:new Date().toISOString().split("T")[0],
    contact_number:"",bio:"",hobby:"",favorite_food:"",
    ic_number:"",epf_number:"",bank_account:"",bank_type:"Maybank",
    avatar_url:""
  });
  const [loading,setLoading]=useState(false);
  const [rawImg,setRawImg]=useState(null);
  const [showCrop,setShowCrop]=useState(false);
  const TOTAL=5;
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const clearErr=k=>setErrors(p=>({...p,[k]:undefined}));

  const validate=()=>{
    const e={};
    if(step===1){
      if(!form.name.trim())e.name="Full name is required";
      if(!form.birthday)e.birthday="Birthday is required";
    }
    if(step===2){
      if(!form.contact_number)e.contact_number="Contact number is required";
      else if(!validateContact(form.contact_number))e.contact_number="Enter a valid Malaysian number (e.g. 0123456789)";
    }
    if(step===4){
      const digits=getICDigits(form.ic_number);
      if(!form.ic_number)e.ic_number="IC number is required";
      else if(digits.length!==12)e.ic_number="IC must be exactly 12 digits";
      if(form.bank_account&&!/^\d+$/.test(form.bank_account))e.bank_account="Numbers only";
    }
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const next=()=>{if(validate())setStep(s=>s+1);};

  const handleFileSelect=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{setRawImg(ev.target.result);setShowCrop(true);};
    reader.readAsDataURL(file);
  };

  const handleSubmit=async()=>{
    setLoading(true);
    const contact=normalizeContact(form.contact_number);
    await supabase.from("profiles").update({...form,contact_number:contact,onboarded:true}).eq("id",user.id);
    const reqs=[];
    if(form.ic_number)reqs.push({user_id:user.id,field_name:"ic_number",field_value:form.ic_number,status:"Pending"});
    if(form.epf_number)reqs.push({user_id:user.id,field_name:"epf_number",field_value:form.epf_number,status:"Pending"});
    if(form.bank_account)reqs.push({user_id:user.id,field_name:"bank_account",field_value:form.bank_account,extra_value:form.bank_type,status:"Pending"});
    if(reqs.length>0)await supabase.from("verification_requests").insert(reqs);
    for(const msg of WELCOME){
      await supabase.from("messages").insert({user_id:user.id,sender_name:"Techwide Hub",sender_avatar:"TW",content:msg,is_system:true});
    }
    setLoading(false);
    onComplete();
  };

  const FR=(label,children,last=false,required=false)=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{display:"flex",gap:4,marginBottom:5}}>
        <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>{label}</div>
        {required&&<div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>}
      </div>
      {children}
    </div>
  );

  const inpStyle={width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF};

  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      {showCrop&&rawImg&&<CircleCrop src={rawImg} onCrop={url=>{set("avatar_url",url);setShowCrop(false);setRawImg(null);}} onCancel={()=>{setShowCrop(false);setRawImg(null);}}/>}
      <div style={{padding:"52px 16px 24px"}}>
        <img src="/TECHWIDE_LOGO.png" alt="" style={{width:36,height:36,borderRadius:8,objectFit:"cover",marginBottom:16}}/>
        <div style={{fontSize:13,color:LB3,marginBottom:6}}>Step {step} of {TOTAL}</div>
        <div style={{background:SEP,borderRadius:99,height:4,overflow:"hidden",marginBottom:24}}>
          <div style={{width:`${(step/TOTAL)*100}%`,height:"100%",background:ACC,borderRadius:99,transition:"width .3s"}}/>
        </div>
        <div style={{fontSize:25,fontWeight:700,color:LBL,letterSpacing:"-.6px",lineHeight:1.2,marginBottom:6}}>
          {step===1&&"Welcome! Let's set up 👋"}
          {step===2&&"Contact details 📱"}
          {step===3&&"Tell us about yourself ✨"}
          {step===4&&"Private information 🔒"}
          {step===5&&"Profile photo 📸"}
        </div>
        <div style={{fontSize:15,color:LB3,marginBottom:24,lineHeight:1.5}}>
          {step===1&&"Basic info visible to your team"}
          {step===2&&"How your team can reach you"}
          {step===3&&"Your personality and interests"}
          {step===4&&"Admin only — kept secure & confidential"}
          {step===5&&"Upload a photo for your profile"}
        </div>
      </div>

      <div style={{padding:"0 16px 24px"}}>
        {step===1&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:8}}>
            {FR("Full Name",
              <div>
                <input value={form.name} onChange={e=>{set("name",e.target.value);clearErr("name");}} placeholder="e.g. Ahmad Farid" style={inpStyle}/>
                {errors.name&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors.name}</div>}
              </div>,false,true
            )}
            {FR("Nickname",<input value={form.nickname} onChange={e=>set("nickname",e.target.value)} placeholder="e.g. Farid" style={inpStyle}/>)}
            {FR("Birthday",
              <div>
                <input value={form.birthday} onChange={e=>{set("birthday",e.target.value);clearErr("birthday");}} type="date" style={inpStyle}/>
                {errors.birthday&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors.birthday}</div>}
              </div>,false,true
            )}
            {FR("Joining Date",<input value={form.joined_date} onChange={e=>set("joined_date",e.target.value)} type="date" style={inpStyle}/>,true)}
          </div>
        )}

        {step===2&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              📱 Enter numbers only — no spaces or dashes<br/>
              Example: <strong>0123456789</strong><br/>
              For 011 numbers: <strong>01112345678</strong> (11 digits)
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
              {FR("Contact Number",
                <div>
                  <input value={form.contact_number} onChange={e=>{set("contact_number",e.target.value.replace(/\D/g,''));clearErr("contact_number");}} placeholder="0123456789" type="tel" style={inpStyle}/>
                  {form.contact_number&&<div style={{fontSize:13,color:ACC,marginTop:4}}>Preview: {formatContact(normalizeContact(form.contact_number))}</div>}
                  {errors.contact_number&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors.contact_number}</div>}
                </div>,true,true
              )}
            </div>
          </>
        )}

        {step===3&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
              <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>About Me</div>
              <textarea value={form.bio} onChange={e=>set("bio",e.target.value)} placeholder="Write something about yourself…" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",lineHeight:1.45,fontFamily:SF}}/>
            </div>
            {FR("Hobby",<input value={form.hobby} onChange={e=>set("hobby",e.target.value)} placeholder="e.g. Gaming, Reading" style={inpStyle}/>)}
            {FR("Favourite Food",<input value={form.favorite_food} onChange={e=>set("favorite_food",e.target.value)} placeholder="e.g. Nasi Lemak" style={inpStyle}/>,true)}
          </div>
        )}

        {step===4&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              🔒 Only visible to admin — IC, EPF & Bank will be verified before approval.
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
              {FR("IC Number",
                <div>
                  <input value={form.ic_number} onChange={e=>{set("ic_number",formatIC(e.target.value));clearErr("ic_number");}} placeholder="XXXXXX-XX-XXXX" style={{...inpStyle,letterSpacing:1}}/>
                  <div style={{fontSize:12,color:getICDigits(form.ic_number).length===12?"#34c759":LB3,marginTop:4}}>
                    {getICDigits(form.ic_number).length}/12 digits {getICDigits(form.ic_number).length===12&&"✓"}
                  </div>
                  {errors.ic_number&&<div style={{fontSize:12,color:"#ff3b30",marginTop:2}}>{errors.ic_number}</div>}
                </div>,false,true
              )}
              {FR("EPF Number",<input value={form.epf_number} onChange={e=>set("epf_number",e.target.value)} placeholder="XXXXXXXXXXXX" style={inpStyle}/>)}
              {FR("Bank Account Number",
                <div>
                  <input value={form.bank_account} onChange={e=>{set("bank_account",e.target.value.replace(/\D/g,''));clearErr("bank_account");}} placeholder="Numbers only" type="tel" style={inpStyle}/>
                  {errors.bank_account&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors.bank_account}</div>}
                </div>
              )}
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Bank Type</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {BANK_TYPES.map(b=>(
                    <button key={b} onClick={()=>set("bank_type",b)} style={{padding:"8px 10px",background:form.bank_type===b?ACC:"rgba(0,0,0,.05)",color:form.bank_type===b?"#fff":LBL,border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontFamily:SF,textAlign:"left",fontWeight:form.bank_type===b?600:400}}>{b}</button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step===5&&(
          <div style={{textAlign:"center",marginBottom:24}}>
            <div onClick={()=>document.getElementById("avOnboard").click()}
              style={{width:160,height:160,borderRadius:"50%",margin:"0 auto 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:`2px dashed ${form.avatar_url?"transparent":ACC}`,background:form.avatar_url?`url(${form.avatar_url}) center/cover`:`${ACC}10`}}>
              {!form.avatar_url&&<div style={{textAlign:"center"}}><div style={{fontSize:36,marginBottom:6}}>📸</div><div style={{fontSize:13,color:ACC,fontWeight:600}}>Tap to Upload</div></div>}
            </div>
            <input id="avOnboard" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
            {form.avatar_url&&<button onClick={()=>document.getElementById("avOnboard").click()} style={{fontSize:15,color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:SF}}>Change Photo</button>}
            <div style={{fontSize:13,color:LB3,marginTop:12,lineHeight:1.6}}>Photo will be cropped to a circle.<br/>You can update this anytime in your profile.</div>
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:8}}>
          {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"15px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:17,color:LBL,cursor:"pointer",fontFamily:SF}}>Back</button>}
          {step<TOTAL
            ?<button onClick={next} style={{flex:2,padding:"15px",background:ACC,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF}}>Continue →</button>
            :<button onClick={handleSubmit} disabled={loading} style={{flex:2,padding:"15px",background:ORG,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
              {loading?"Setting up…":"Let's Go! 🚀"}
            </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState("login"); // login | register
  const [loginEmail,setLoginEmail]=useState("");
  const [loginPass,setLoginPass]=useState("");
  const [loginErr,setLoginErr]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);

  // Register state
  const [regPrefix,setRegPrefix]=useState("");
  const [regPass,setRegPass]=useState("");
  const [regPass2,setRegPass2]=useState("");
  const [regErr,setRegErr]=useState("");
  const [regLoading,setRegLoading]=useState(false);
  const [regDone,setRegDone]=useState(false);

  const DOMAIN="@techwide.com";
  // Only allow letters, numbers, symbols — no emoji, no @
  const cleanPrefix=v=>v.replace(/[^a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~.]/g,'').slice(0,50);

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=`*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}body{background:${BG};font-family:${SF};}::-webkit-scrollbar{display:none;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes barFill{from{width:0}to{width:var(--w)}}.fade{animation:fadeUp .28s cubic-bezier(.4,0,.2,1) both}.bar{animation:barFill .7s cubic-bezier(.4,0,.2,1) both}.pressable:active{opacity:.6;transform:scale(.98);transition:all .1s;}input,textarea,button{font-family:${SF};}`;
    document.head.appendChild(el);
    return()=>document.head.removeChild(el);
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if(session)loadProfile(session.user.id);
      else setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s);
      if(!s){setProfile(null);setLoading(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadProfile=async uid=>{
    setLoading(true);
    const{data}=await supabase.from("profiles").select("*").eq("id",uid).single();
    if(data)setProfile(data);
    setLoading(false);
  };

  const doLogin=async()=>{
    setLoginErr("");setLoginLoading(true);
    const{error}=await supabase.auth.signInWithPassword({email:loginEmail.trim(),password:loginPass});
    if(error){setLoginErr(error.message);setLoginLoading(false);}
    else{const uid=(await supabase.auth.getUser()).data.user.id;await loadProfile(uid);setLoginLoading(false);}
  };

  const doRegister=async()=>{
    setRegErr("");
    if(!regPrefix.trim()){setRegErr("Please enter your email prefix");return;}
    if(regPass.length<6){setRegErr("Password must be at least 6 characters");return;}
    if(regPass!==regPass2){setRegErr("Passwords do not match");return;}
    const email=regPrefix.trim()+DOMAIN;
    setRegLoading(true);
    // Check if email already exists
    const{error}=await supabase.auth.signUp({email,password:regPass});
    if(error){setRegErr(error.message);setRegLoading(false);return;}
    // Create a basic profile
    const uid=(await supabase.auth.getUser()).data.user?.id;
    if(uid){
      await supabase.from("profiles").insert({
        id:uid,name:"",role:"Staff",avatar:regPrefix.slice(0,2).toUpperCase(),
        xp:0,streak:0,badges:[],is_admin:false,onboarded:false,
        joined_date:new Date().toISOString().split("T")[0],contribution_score:0
      });
    }
    await supabase.auth.signOut();
    setRegLoading(false);
    setRegDone(true);
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:ACC,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:SF}}>
      <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover"}}/>
      <div style={{width:24,height:24,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  if(!session||!profile){
    const inpStyle={width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF};
    return(
      <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
        <div className="fade" style={{textAlign:"center",marginBottom:32}}>
          <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:90,height:90,borderRadius:20,objectFit:"cover",margin:"0 auto 14px",display:"block",boxShadow:"0 8px 28px rgba(28,50,88,.2)"}}/>
          <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px"}}>Techwide Hub</div>
          <div style={{fontSize:13,color:LB3,marginTop:6,lineHeight:2}}>Sincerity · Love · Responsible · Respectful</div>
        </div>

        {/* Toggle tabs */}
        <div className="fade" style={{width:"100%",maxWidth:360,marginBottom:16}}>
          <div style={{display:"flex",background:"rgba(0,0,0,.06)",borderRadius:12,padding:3}}>
            {[["login","Sign In"],["register","Create Account"]].map(([id,label])=>(
              <button key={id} onClick={()=>{setMode(id);setLoginErr("");setRegErr("");setRegDone(false);}}
                style={{flex:1,padding:"9px",background:mode===id?BG2:"transparent",color:mode===id?LBL:LB3,border:"none",borderRadius:10,fontSize:15,fontWeight:mode===id?600:400,cursor:"pointer",fontFamily:SF,boxShadow:mode===id?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .2s"}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* LOGIN */}
        {mode==="login"&&(
          <div className="fade" style={{width:"100%",maxWidth:360}}>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
              <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email</div>
                <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="your@techwide.com" type="email" autoComplete="email" style={inpStyle}/>
              </div>
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password</div>
                <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" onKeyDown={e=>e.key==="Enter"&&doLogin()} style={inpStyle}/>
              </div>
            </div>
            {loginErr&&<div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12}}>{loginErr}</div>}
            <button onClick={doLogin} disabled={loginLoading} style={{width:"100%",background:loginLoading?"#e5e5ea":ACC,color:loginLoading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
              {loginLoading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
              Sign In
            </button>
          </div>
        )}

        {/* REGISTER */}
        {mode==="register"&&(
          <div className="fade" style={{width:"100%",maxWidth:360}}>
            {regDone?(
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:48,marginBottom:16}}>🎉</div>
                <div style={{fontSize:20,fontWeight:700,color:LBL,letterSpacing:"-.4px",marginBottom:8}}>Account Created!</div>
                <div style={{fontSize:15,color:LB3,lineHeight:1.6,marginBottom:24}}>Your account <strong style={{color:ACC}}>{regPrefix+DOMAIN}</strong> is ready.<br/>Sign in to complete your profile setup.</div>
                <button onClick={()=>{setMode("login");setLoginEmail(regPrefix+DOMAIN);setRegDone(false);setRegPrefix("");setRegPass("");setRegPass2("");}}
                  style={{width:"100%",background:ACC,color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",fontFamily:SF}}>
                  Sign In Now →
                </button>
              </div>
            ):(
              <>
                <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:ACC,lineHeight:1.7}}>
                  📧 Your email will be <strong>{regPrefix?regPrefix:"yourname"}{DOMAIN}</strong><br/>
                  You can use letters, numbers, or symbols — no emojis
                </div>
                <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
                  {/* Email prefix field */}
                  <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                    <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email Address</div>
                    <div style={{display:"flex",alignItems:"center",gap:0}}>
                      <input
                        value={regPrefix}
                        onChange={e=>setRegPrefix(cleanPrefix(e.target.value))}
                        placeholder="yourname"
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        style={{...inpStyle,flex:1,minWidth:0}}
                      />
                      <div style={{fontSize:16,color:LB3,flexShrink:0,letterSpacing:"-.3px"}}>{DOMAIN}</div>
                    </div>
                    {regPrefix&&(
                      <div style={{fontSize:12,color:"#34c759",marginTop:4}}>
                        ✓ {regPrefix}{DOMAIN}
                      </div>
                    )}
                  </div>
                  {/* Password */}
                  <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
                    <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password <span style={{color:"#ff3b30"}}>*</span></div>
                    <input value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Minimum 6 characters" type="password" style={inpStyle}/>
                    {regPass&&<div style={{fontSize:12,color:regPass.length>=6?"#34c759":"#ff9500",marginTop:4}}>{regPass.length>=6?"✓ Strong enough":"Too short — min 6 characters"}</div>}
                  </div>
                  {/* Confirm password */}
                  <div style={{padding:"11px 16px"}}>
                    <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Confirm Password <span style={{color:"#ff3b30"}}>*</span></div>
                    <input value={regPass2} onChange={e=>setRegPass2(e.target.value)} placeholder="Repeat your password" type="password" onKeyDown={e=>e.key==="Enter"&&doRegister()} style={inpStyle}/>
                    {regPass2&&<div style={{fontSize:12,color:regPass===regPass2?"#34c759":"#ff3b30",marginTop:4}}>{regPass===regPass2?"✓ Passwords match":"✗ Passwords don't match"}</div>}
                  </div>
                </div>
                {regErr&&<div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,lineHeight:1.4}}>{regErr}</div>}
                <button onClick={doRegister} disabled={regLoading||!regPrefix.trim()||regPass.length<6||regPass!==regPass2}
                  style={{width:"100%",background:(regLoading||!regPrefix.trim()||regPass.length<6||regPass!==regPass2)?"#e5e5ea":ACC,color:(regLoading||!regPrefix.trim()||regPass.length<6||regPass!==regPass2)?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
                  {regLoading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
                  {regLoading?"Creating Account…":"Create Account"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if(!profile.onboarded)return<OnboardingFlow user={profile} onComplete={()=>loadProfile(session.user.id)}/>;
  if(profile.is_admin)return<AdminApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
  return<UserApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
}
