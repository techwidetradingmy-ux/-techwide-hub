function PublicInfoSection({profile,ACC,BG2,SEP,LBL,LB2,LB3,SF,ORG}){
  const [expanded,setExpanded]=useState(false);

  // Age from birthday (only if verified)
  const age=profile.birthday_verified&&profile.birthday
    ?new Date().getFullYear()-new Date(profile.birthday).getFullYear()
    :null;

  // Days working (only if joining date verified)
  const daysWorking=profile.joined_date_verified&&profile.joined_date
    ?Math.floor((Date.now()-new Date(profile.joined_date))/86400000)
    :null;

  const fmtDate=iso=>{
    if(!iso)return null;
    const p=iso.split("-");
    if(p.length===3)return`${p[2]}/${p[1]}/${p[0]}`;
    return iso;
  };

  // Ordered public info rows
  const allRows=[
    ["🎂 Age",          age?`${age} years old`:null],
    ["⚧ Gender",        profile.gender||null],
    ["🏠 Home Town",    profile.hometown||null],
    ["📱 Contact",      profile.contact_number?formatContact(profile.contact_number):null],
    ["📧 Email",        profile.email||null],
    ["📅 Joining Date", profile.joined_date_verified?fmtDate(profile.joined_date):null],
    ["⏳ Been Working", daysWorking!==null?`${daysWorking.toLocaleString()} days`:null],
    ["🎂 Birthday",     profile.birthday_verified?fmtDate(profile.birthday):null],
    ["🎮 Hobby",        profile.hobby||null],
    ["🍜 Fav Food",     profile.favorite_food||null],
  ].filter(([,v])=>v);

  const SHOW_INITIAL=5;
  const visible=expanded?allRows:allRows.slice(0,SHOW_INITIAL);
  const hasMore=allRows.length>SHOW_INITIAL;

  return(
    <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
      {visible.map(([label,value],i,a)=>(
        <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:i<a.length-1||hasMore?`1px solid ${SEP}`:"none"}}>
          <div style={{fontSize:15,color:LB3,flexShrink:0,marginRight:12}}>{label}</div>
          <div style={{fontSize:15,color:LBL,textAlign:"right",maxWidth:"60%",lineHeight:1.4}}>{value}</div>
        </div>
      ))}
      {hasMore&&(
        <button onClick={()=>setExpanded(p=>!p)} className="btn"
          style={{width:"100%",padding:"11px 16px",background:"none",border:"none",cursor:"pointer",fontSize:14,color:ACC,fontWeight:600,fontFamily:SF,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          {expanded?`Show Less ▲`:`Show More (${allRows.length-SHOW_INITIAL} more) ▾`}
        </button>
      )}
    </div>
  );
}
