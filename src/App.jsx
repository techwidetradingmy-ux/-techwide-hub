import{useState,useEffect}from"react";
import{supabase}from"./supabaseClient";
import UserApp from"./UserApp";
import AdminApp from"./AdminApp";
import CircleCrop from"./CircleCrop";
import{SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,WELCOME,formatIC,getICDigits,formatContact,normalizeContact,validateContact,BANK_TYPES}from"./constants";

export default function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState("login"); // login | setup
  const [step,setStep]=useState(1);
  const TOTAL=5;

  // Login fields
  const [loginEmail,setLoginEmail]=useState("");
  const [loginPass,setLoginPass]=useState("");
  const [loginErr,setLoginErr]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);

  // Setup form
  const [form,setForm]=useState({
    name:"",nickname:"",birthday:"",
    joined_date:new Date().toISOString().split("T")[0],
    contact_number:"",bio:"",hobby:"",favorite_food:"",
    ic_number:"",epf_number:"",bank_account:"",
    bank_type:"Maybank",avatar_url:""
  });
  const [errors,setErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [rawImg,setRawImg]=useState(null);
  const [showCrop,setShowCrop]=useState(false);

  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const clearErr=k=>setErrors(p=>({...p,[k]:undefined}));

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
    if(data){
      setProfile(data);
      if(!data.onboarded){
        // Pre-fill form with any existing data
        setForm(p=>({...p,
          name:data.name||"",
          nickname:data.nickname||"",
          birthday:data.birthday||"",
          contact_number:data.contact_number||"",
          bio:data.bio||"",
          hobby:data.hobby||"",
          favorite_food:data.favorite_food||"",
          ic_number:data.ic_number||"",
          epf_number:data.epf_number||"",
          bank_account:data.bank_account||"",
          bank_type:data.bank_type||"Maybank",
          avatar_url:data.avatar_url||"",
        }));
        setMode("setup");
        setStep(1);
      }
    }
    setLoading(false);
  };

  const doLogin=async()=>{
    if(!loginEmail.trim()||!loginPass){
      setLoginErr("Please enter your email and password");
      return;
    }
    setLoginErr("");
    setLoginLoading(true);
    try{
      const{data,error}=await supabase.auth.signInWithPassword({
        email:loginEmail.trim(),
        password:loginPass
      });
      if(error){setLoginErr(error.message);setLoginLoading(false);return;}
      if(!data?.user){setLoginErr("Login failed. Please try again.");setLoginLoading(false);return;}
      const{data:prof,error:profErr}=await supabase.from("profiles").select("*").eq("id",data.user.id).single();
      if(profErr||!prof){setLoginErr("Account not set up. Please contact admin.");setLoginLoading(false);return;}
      setProfile(prof);
      if(!prof.onboarded){
        setForm(p=>({...p,name:prof.name||"",nickname:prof.nickname||""}));
        setMode("setup");
        setStep(1);
      }
      setLoginLoading(false);
    }catch(err){
      setLoginErr("Something went wrong: "+err.message);
      setLoginLoading(false);
    }
  };

  // ── VALIDATION ──
  const validate=()=>{
    const e={};
    if(step===1){
      if(!form.name.trim())e.name="Full name is required";
      if(!form.birthday)e.birthday="Birthday is required";
    }
    if(step===2){
      if(!form.contact_number)e.contact_number="Contact number is required";
      else if(!validateContact(form.contact_number))e.contact_number="Enter a valid Malaysian number";
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

  const nextStep=()=>{if(validate())setStep(s=>s+1);};

  const handleFileSelect=e=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{setRawImg(ev.target.result);setShowCrop(true);};
    reader.readAsDataURL(file);
  };

  const handleSubmit=async()=>{
    setSaving(true);
    const contact=normalizeContact(form.contact_number);
    const payload={...form,contact_number:contact,onboarded:true};
    await supabase.from("profiles").update(payload).eq("id",profile.id);
    // Verification requests
    const reqs=[];
    if(form.ic_number)reqs.push({user_id:profile.id,field_name:"ic_number",field_value:form.ic_number,status:"Pending"});
    if(form.epf_number)reqs.push({user_id:profile.id,field_name:"epf_number",field_value:form.epf_number,status:"Pending"});
    if(form.bank_account)reqs.push({user_id:profile.id,field_name:"bank_account",field_value:form.bank_account,extra_value:form.bank_type,status:"Pending"});
    if(reqs.length>0)await supabase.from("verification_requests").insert(reqs);
    // Welcome messages
    for(const msg of WELCOME){
      await supabase.from("messages").insert({user_id:profile.id,sender_name:"Techwide Hub",sender_avatar:"TW",content:msg,is_system:true});
    }
    setSaving(false);
    setMode("login");
    await loadProfile(profile.id);
  };

  // ── SHARED INPUT COMPONENTS ──
  const Field=({label,required,children,last})=>(
    <div style={{padding:"11px 16px",background:BG2,borderBottom:last?"none":`1px solid ${SEP}`}}>
      <div style={{display:"flex",gap:4,marginBottom:5}}>
        <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600}}>{label}</div>
        {required&&<div style={{fontSize:12,color:"#ff3b30",fontWeight:700}}>*</div>}
      </div>
      {children}
    </div>
  );

  const TxtInp=({k,ph,type="text"})=>(
    <div>
      <input value={form[k]} onChange={e=>{
        if(k==="ic_number"){setF("ic_number",formatIC(e.target.value));clearErr("ic_number");}
        else if(k==="bank_account"){setF("bank_account",e.target.value.replace(/\D/g,''));clearErr("bank_account");}
        else if(k==="contact_number"){setF("contact_number",e.target.value.replace(/\D/g,''));clearErr("contact_number");}
        else{setF(k,e.target.value);clearErr(k);}
      }} placeholder={ph} type={type}
        style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
      {errors[k]&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors[k]}</div>}
    </div>
  );

  // ── LOADING ──
  if(loading)return(
    <div style={{minHeight:"100vh",background:ACC,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:SF}}>
      <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover"}}/>
      <div style={{width:24,height:24,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    </div>
  );

  // ── SETUP FLOW (shown after first login) ──
  if(mode==="setup"&&profile&&!profile.onboarded)return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:SF,maxWidth:430,margin:"0 auto"}}>
      {showCrop&&rawImg&&<CircleCrop src={rawImg} onCrop={url=>{setF("avatar_url",url);setShowCrop(false);setRawImg(null);}} onCancel={()=>{setShowCrop(false);setRawImg(null);}}/>}

      {/* Header */}
      <div style={{padding:"52px 16px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <img src="/TECHWIDE_LOGO.png" alt="" style={{width:32,height:32,borderRadius:7,objectFit:"cover"}}/>
          <div style={{fontSize:15,fontWeight:600,color:LBL}}>Techwide Hub</div>
        </div>

        {/* Progress */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:13,color:LB3}}>Step {step} of {TOTAL}</div>
          <div style={{fontSize:13,color:ACC,fontWeight:600}}>{Math.round((step/TOTAL)*100)}% complete</div>
        </div>
        <div style={{background:SEP,borderRadius:99,height:5,overflow:"hidden",marginBottom:28}}>
          <div style={{width:`${(step/TOTAL)*100}%`,height:"100%",background:ACC,borderRadius:99,transition:"width .35s cubic-bezier(.4,0,.2,1)"}}/>
        </div>

        {/* Step title */}
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px",lineHeight:1.2,marginBottom:6}}>
          {step===1&&"Welcome! Let's get you set up 👋"}
          {step===2&&"Contact details 📱"}
          {step===3&&"Tell us about yourself ✨"}
          {step===4&&"Private information 🔒"}
          {step===5&&"Profile photo 📸"}
        </div>
        <div style={{fontSize:15,color:LB3,marginBottom:24,lineHeight:1.5}}>
          {step===1&&"Basic info that your teammates will see"}
          {step===2&&"How your team can reach you"}
          {step===3&&"Let your personality shine!"}
          {step===4&&"Only visible to admin — kept 100% secure"}
          {step===5&&"Put a face to the name!"}
        </div>
      </div>

      {/* Step content */}
      <div style={{padding:"0 16px 120px"}}>

        {step===1&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            <Field label="Full Name" required>
              <TxtInp k="name" ph="e.g. Ahmad Farid"/>
            </Field>
            <Field label="Nickname">
              <TxtInp k="nickname" ph="e.g. Farid"/>
            </Field>
            <Field label="Birthday" required>
              <TxtInp k="birthday" ph="" type="date"/>
            </Field>
            <Field label="Joining Date" last>
              <TxtInp k="joined_date" ph="" type="date"/>
            </Field>
          </div>
        )}

        {step===2&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              📱 Numbers only — no spaces or dashes<br/>
              Format: 01XXXXXXXX<br/>
              For 011 numbers: 011XXXXXXXX (11 digits total)
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
              <Field label="Contact Number" required last>
                <input
                  value={form.contact_number}
                  onChange={e=>{setF("contact_number",e.target.value.replace(/\D/g,''));clearErr("contact_number");}}
                  placeholder="0123456789"
                  type="tel"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}
                />
                {form.contact_number&&<div style={{fontSize:13,color:ACC,marginTop:6,fontWeight:500}}>Preview: {formatContact(normalizeContact(form.contact_number))}</div>}
                {errors.contact_number&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors.contact_number}</div>}
              </Field>
            </div>
          </>
        )}

        {step===3&&(
          <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
            <Field label="About Me">
              <textarea value={form.bio} onChange={e=>setF("bio",e.target.value)} placeholder="Write a short intro about yourself…" rows={3}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,resize:"none",lineHeight:1.45,fontFamily:SF}}/>
            </Field>
            <Field label="Hobby">
              <TxtInp k="hobby" ph="e.g. Gaming, Hiking, Cooking"/>
            </Field>
            <Field label="Favourite Food" last>
              <TxtInp k="favorite_food" ph="e.g. Nasi Lemak, Sushi"/>
            </Field>
          </div>
        )}

        {step===4&&(
          <>
            <div style={{background:`${ACC}10`,borderRadius:12,padding:"12px 14px",marginBottom:12,fontSize:13,color:ACC,lineHeight:1.7}}>
              🔒 Strictly confidential — only admin can see this.<br/>
              IC & EPF will require admin verification.<br/>
              Bank account changes always need re-approval.
            </div>
            <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
              <Field label="IC Number" required>
                <input
                  value={form.ic_number}
                  onChange={e=>{setF("ic_number",formatIC(e.target.value));clearErr("ic_number");}}
                  placeholder="XXXXXX-XX-XXXX"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF,letterSpacing:1}}
                />
                <div style={{fontSize:12,color:getICDigits(form.ic_number).length===12?"#34c759":LB3,marginTop:4,fontWeight:500}}>
                  {getICDigits(form.ic_number).length}/12 digits {getICDigits(form.ic_number).length===12&&"✓"}
                </div>
                {errors.ic_number&&<div style={{fontSize:12,color:"#ff3b30",marginTop:2}}>{errors.ic_number}</div>}
              </Field>
              <Field label="EPF Number">
                <TxtInp k="epf_number" ph="XXXXXXXXXXXX"/>
              </Field>
              <Field label="Bank Account Number">
                <input
                  value={form.bank_account}
                  onChange={e=>{setF("bank_account",e.target.value.replace(/\D/g,''));clearErr("bank_account");}}
                  placeholder="Numbers only"
                  type="tel"
                  style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}
                />
                {errors.bank_account&&<div style={{fontSize:12,color:"#ff3b30",marginTop:4}}>{errors.bank_account}</div>}
              </Field>
              <Field label="Bank Type" last>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:4}}>
                  {BANK_TYPES.map(b=>(
                    <button key={b} onClick={()=>setF("bank_type",b)}
                      style={{padding:"9px 10px",background:form.bank_type===b?ACC:"rgba(0,0,0,.05)",color:form.bank_type===b?"#fff":LBL,border:"none",borderRadius:9,fontSize:13,cursor:"pointer",fontFamily:SF,textAlign:"left",fontWeight:form.bank_type===b?600:400,transition:"all .15s"}}>
                      {b}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </>
        )}

        {step===5&&(
          <div style={{textAlign:"center"}}>
            <div onClick={()=>document.getElementById("avSetup").click()}
              style={{width:160,height:160,borderRadius:"50%",margin:"0 auto 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:`2.5px dashed ${form.avatar_url?"transparent":ACC}`,background:form.avatar_url?`url(${form.avatar_url}) center/cover`:`${ACC}08`,transition:"all .2s"}}>
              {!form.avatar_url&&(
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:40,marginBottom:8}}>📸</div>
                  <div style={{fontSize:14,color:ACC,fontWeight:600}}>Tap to Upload</div>
                </div>
              )}
            </div>
            <input id="avSetup" type="file" accept="image/*" onChange={handleFileSelect} style={{display:"none"}}/>
            {form.avatar_url&&(
              <button onClick={()=>document.getElementById("avSetup").click()}
                style={{fontSize:15,color:ACC,fontWeight:600,background:"none",border:"none",cursor:"pointer",fontFamily:SF,marginBottom:8}}>
                Change Photo
              </button>
            )}
            <div style={{fontSize:13,color:LB3,lineHeight:1.7,marginTop:8}}>
              Your photo is cropped to a circle automatically.<br/>
              You can update this anytime in your profile.<br/>
              <span style={{color:LB3}}>(Optional — you can skip this step)</span>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,padding:"12px 16px 28px",background:`${BG}f0`,backdropFilter:"blur(16px)",borderTop:`1px solid ${SEP}`}}>
        <div style={{display:"flex",gap:10}}>
          {step>1&&(
            <button onClick={()=>setStep(s=>s-1)}
              style={{flex:1,padding:"15px",background:BG2,border:`1px solid ${SEP}`,borderRadius:13,fontSize:17,color:LBL,cursor:"pointer",fontFamily:SF}}>
              ← Back
            </button>
          )}
          {step<TOTAL?(
            <button onClick={nextStep}
              style={{flex:2,padding:"15px",background:ACC,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:600,cursor:"pointer",fontFamily:SF}}>
              Continue →
            </button>
          ):(
            <button onClick={handleSubmit} disabled={saving}
              style={{flex:2,padding:"15px",background:ORG,border:"none",borderRadius:13,fontSize:17,color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {saving&&<div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
              {saving?"Setting up your account…":"Complete Setup 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── LOGIN SCREEN ──
  if(!session||!profile)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:SF}}>
      <div className="fade" style={{textAlign:"center",marginBottom:36}}>
        <img src="/TECHWIDE_LOGO.png" alt="Techwide" style={{width:100,height:100,borderRadius:22,objectFit:"cover",margin:"0 auto 16px",display:"block",boxShadow:"0 8px 28px rgba(28,50,88,.2)"}}/>
        <div style={{fontSize:26,fontWeight:700,color:LBL,letterSpacing:"-.6px"}}>Techwide Hub</div>
        <div style={{fontSize:13,color:LB3,marginTop:8,lineHeight:2}}>Sincerity · Love · Responsible · Respectful</div>
      </div>
      <div className="fade" style={{width:"100%",maxWidth:360}}>
        <div style={{background:BG2,borderRadius:13,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${SEP}`}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Email</div>
            <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="your@email.com" type="email" autoComplete="email"
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
          </div>
          <div style={{padding:"11px 16px"}}>
            <div style={{fontSize:12,color:LB3,letterSpacing:".4px",textTransform:"uppercase",fontWeight:600,marginBottom:5}}>Password</div>
            <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="Password" type="password" autoComplete="current-password"
              onKeyDown={e=>e.key==="Enter"&&doLogin()}
              style={{width:"100%",background:"transparent",border:"none",outline:"none",fontSize:17,color:LBL,fontFamily:SF}}/>
          </div>
        </div>
        {loginErr&&(
          <div style={{fontSize:14,color:"#ff3b30",textAlign:"center",marginBottom:12,background:"#ff3b3010",borderRadius:10,padding:"10px 14px"}}>
            {loginErr}
          </div>
        )}
        <button onClick={doLogin} disabled={loginLoading}
          style={{width:"100%",background:loginLoading?"#e5e5ea":ACC,color:loginLoading?LB3:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:17,fontWeight:600,cursor:loginLoading?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:SF}}>
          {loginLoading&&<div style={{width:18,height:18,border:"2px solid #fff4",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>}
          {loginLoading?"Signing in…":"Sign In"}
        </button>
        <div style={{textAlign:"center",fontSize:13,color:LB3,marginTop:16,lineHeight:1.6}}>
          New staff? Contact your admin for login credentials.<br/>
          You'll set up your profile on first sign in.
        </div>
      </div>
    </div>
  );

  // ── MAIN APP ──
  if(profile.is_admin)return<AdminApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
  return<UserApp profile={profile} session={session} onProfileUpdate={setProfile}/>;
}

