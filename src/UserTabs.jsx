export function LeaderboardTab({profile,allProfiles,SF,BG,BG2,SEP,LBL,LB2,LB3,ACC,ORG,getLevel,getLvlPct,getTier,calcScore,Section,setDmTarget,setViewingProfile}){
  const ranked=allProfiles.filter(s=>!s.is_admin);
  return(
    <div style={{padding:"0 16px 12px"}}>
      <div style={{background:BG2,borderRadius:13,overflow:"hidden"}}>
        {ranked.map((s,i)=>{
          const me=s.id===profile.id;
          const medal=["🥇","🥈","🥉"][i]||null;
          const sTier=getTier(calcScore(s.joined_date,0));
          return(
            <div key={s.id}
              onClick={()=>setViewingProfile&&setViewingProfile(s)}
              className="card-press"
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
