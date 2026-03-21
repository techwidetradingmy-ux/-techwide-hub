import{useState,useEffect,useRef}from"react";
import{ACC,SF}from"./constants";

export default function CircleCrop({src,onCrop,onCancel}){
  const canvasRef=useRef(null);
  const imgRef=useRef(null);
  const [pos,setPos]=useState({x:0,y:0});
  const [zoom,setZoom]=useState(1);
  const [drag,setDrag]=useState(false);
  const [last,setLast]=useState({x:0,y:0});
  const [ready,setReady]=useState(false);
  const S=280;

  useEffect(()=>{
    const img=new Image();
    img.onload=()=>{
      imgRef.current=img;
      const sc=Math.max(S/img.width,S/img.height)*1.1;
      setZoom(sc);
      setPos({x:(S-img.width*sc)/2,y:(S-img.height*sc)/2});
      setReady(true);
    };
    img.src=src;
  },[src]);

  useEffect(()=>{
    if(!ready||!canvasRef.current||!imgRef.current)return;
    const c=canvasRef.current,ctx=c.getContext('2d'),img=imgRef.current;
    ctx.clearRect(0,0,S,S);
    ctx.globalAlpha=0.35;
    ctx.drawImage(img,pos.x,pos.y,img.width*zoom,img.height*zoom);
    ctx.globalAlpha=1;
    ctx.save();
    ctx.beginPath();
    ctx.arc(S/2,S/2,S/2-2,0,Math.PI*2);
    ctx.clip();
    ctx.drawImage(img,pos.x,pos.y,img.width*zoom,img.height*zoom);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(S/2,S/2,S/2-2,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,.9)';
    ctx.lineWidth=2.5;
    ctx.stroke();
  },[ready,pos,zoom]);

  const getXY=(e,rect)=>({
    x:(e.touches?e.touches[0].clientX:e.clientX)-rect.left,
    y:(e.touches?e.touches[0].clientY:e.clientY)-rect.top
  });
  const onDown=e=>{
    e.preventDefault();
    setDrag(true);
    setLast(getXY(e,canvasRef.current.getBoundingClientRect()));
  };
  const onMove=e=>{
    e.preventDefault();
    if(!drag)return;
    const cur=getXY(e,canvasRef.current.getBoundingClientRect());
    setPos(p=>({x:p.x+(cur.x-last.x),y:p.y+(cur.y-last.y)}));
    setLast(cur);
  };
  const onUp=()=>setDrag(false);

  const crop=()=>{
    const out=document.createElement('canvas');
    out.width=out.height=S;
    const ctx=out.getContext('2d');
    ctx.beginPath();
    ctx.arc(S/2,S/2,S/2,0,Math.PI*2);
    ctx.clip();
    ctx.drawImage(imgRef.current,pos.x,pos.y,imgRef.current.width*zoom,imgRef.current.height*zoom);
    onCrop(out.toDataURL('image/png'));
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',paddingTop:'8vh',paddingLeft:24,paddingRight:24,paddingBottom:24,fontFamily:SF}}>
      <div style={{fontSize:17,fontWeight:600,color:'#fff',marginBottom:6}}>Adjust Your Photo</div>
      <div style={{fontSize:13,color:'rgba(255,255,255,.45)',marginBottom:20,textAlign:'center'}}>Drag to reposition · Slider to zoom</div>
      {!ready?<div style={{width:S,height:S,borderRadius:'50%',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.3)',fontSize:15}}>Loading…</div>:(
        <canvas ref={canvasRef} width={S} height={S}
          style={{cursor:drag?'grabbing':'grab',display:'block',marginBottom:20,touchAction:'none'}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
      )}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,width:'100%',maxWidth:S}}>
        <span style={{fontSize:16,color:'rgba(255,255,255,.5)'}}>−</span>
        <input type="range" min={0.3} max={5} step={0.01} value={zoom} onChange={e=>setZoom(+e.target.value)} style={{flex:1,accentColor:ACC}}/>
        <span style={{fontSize:16,color:'rgba(255,255,255,.5)'}}>+</span>
      </div>
      <div style={{display:'flex',gap:10,width:'100%',maxWidth:S}}>
        <button onClick={onCancel} style={{flex:1,padding:'13px',background:'rgba(255,255,255,.12)',color:'#fff',border:'none',borderRadius:12,fontSize:16,cursor:'pointer',fontFamily:SF}}>Cancel</button>
        <button onClick={crop} style={{flex:2,padding:'13px',background:ACC,color:'#fff',border:'none',borderRadius:12,fontSize:16,fontWeight:600,cursor:'pointer',fontFamily:SF}}>Use Photo ✓</button>
      </div>
    </div>
  );
}
