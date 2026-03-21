import{useState,useEffect,useRef,useCallback}from"react";
import{ACC,SF}from"./constants";

export default function CircleCrop({src,onCrop,onCancel}){
  const[imgNat,setImgNat]=useState({w:0,h:0});
  const[offset,setOffset]=useState({x:0,y:0});
  const[zoom,setZoom]=useState(1);
  const[dims,setDims]=useState({vw:window.innerWidth,vh:window.innerHeight});
  const[isDrag,setIsDrag]=useState(false);

  const dragRef=useRef(null);
  const pinchRef=useRef(null);
  const zoomRef=useRef(zoom);
  zoomRef.current=zoom;

  // Responsive circle radius — 40% of smaller dimension, max 200
  const R=Math.min(Math.min(dims.vw,dims.vh)*0.4,200);
  const cx=dims.vw/2;
  const cy=dims.vh/2;

  // Window resize
  useEffect(()=>{
    const h=()=>setDims({vw:window.innerWidth,vh:window.innerHeight});
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);

  // Lock body scroll
  useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=prev;};
  },[]);

  // Load image + set initial zoom to fill crop circle
  useEffect(()=>{
    if(!src)return;
    const img=new Image();
    img.onload=()=>{
      const w=img.naturalWidth,h=img.naturalHeight;
      setImgNat({w,h});
      const minDim=Math.min(w,h);
      setZoom((R*2)/minDim);
      setOffset({x:0,y:0});
    };
    img.src=src;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[src]);

  const getTouchDist=touches=>{
    const dx=touches[0].clientX-touches[1].clientX;
    const dy=touches[0].clientY-touches[1].clientY;
    return Math.sqrt(dx*dx+dy*dy);
  };

  const onMouseDown=useCallback(e=>{
    // Don't hijack button/range clicks
    if(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT')return;
    e.preventDefault();
    dragRef.current={lastX:e.clientX,lastY:e.clientY};
    setIsDrag(true);
  },[]);

  const onMouseMove=useCallback(e=>{
    if(!dragRef.current)return;
    const dx=e.clientX-dragRef.current.lastX;
    const dy=e.clientY-dragRef.current.lastY;
    dragRef.current={lastX:e.clientX,lastY:e.clientY};
    setOffset(o=>({x:o.x+dx,y:o.y+dy}));
  },[]);

  const onMouseUp=useCallback(()=>{
    dragRef.current=null;
    setIsDrag(false);
  },[]);

  const onWheel=useCallback(e=>{
    e.preventDefault();
    const factor=e.deltaY<0?1.09:0.92;
    setZoom(z=>Math.max(0.05,Math.min(20,z*factor)));
  },[]);

  const onTouchStart=useCallback(e=>{
    if(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT')return;
    e.preventDefault();
    if(e.touches.length>=2){
      pinchRef.current={dist:getTouchDist(e.touches),zoom:zoomRef.current};
      dragRef.current=null;
    }else{
      dragRef.current={lastX:e.touches[0].clientX,lastY:e.touches[0].clientY};
      pinchRef.current=null;
    }
  },[]);

  const onTouchMove=useCallback(e=>{
    if(e.target.tagName==='INPUT')return;
    e.preventDefault();
    if(e.touches.length>=2&&pinchRef.current){
      const newDist=getTouchDist(e.touches);
      const scale=newDist/pinchRef.current.dist;
      setZoom(Math.max(0.05,Math.min(20,pinchRef.current.zoom*scale)));
    }else if(e.touches.length===1&&dragRef.current){
      const dx=e.touches[0].clientX-dragRef.current.lastX;
      const dy=e.touches[0].clientY-dragRef.current.lastY;
      dragRef.current={lastX:e.touches[0].clientX,lastY:e.touches[0].clientY};
      setOffset(o=>({x:o.x+dx,y:o.y+dy}));
    }
  },[]);

  const onTouchEnd=useCallback(e=>{
    if(e.touches.length<2)pinchRef.current=null;
    if(e.touches.length===0){
      dragRef.current=null;
    }else if(e.touches.length===1){
      dragRef.current={lastX:e.touches[0].clientX,lastY:e.touches[0].clientY};
    }
  },[]);

  const crop=useCallback(()=>{
    const size=Math.round(R*2);
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');
    const imgW=imgNat.w*zoom;
    const imgH=imgNat.h*zoom;
    // Image screen position (centered on cx+offset.x, cy+offset.y)
    const imgScreenLeft=cx+offset.x-imgW/2;
    const imgScreenTop=cy+offset.y-imgH/2;
    // Crop square starts at (cx-R, cy-R)
    const relX=imgScreenLeft-(cx-R);
    const relY=imgScreenTop-(cy-R);
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,relX,relY,imgW,imgH);
      onCrop(canvas.toDataURL('image/png'));
    };
    img.src=src;
  },[cx,cy,R,imgNat,zoom,offset,src,onCrop]);

  const imgW=imgNat.w*zoom;
  const imgH=imgNat.h*zoom;
  const imgLeft=cx+offset.x-imgW/2;
  const imgTop=cy+offset.y-imgH/2;

  return(
    <div
      style={{
        position:'fixed',inset:0,zIndex:9999,
        background:'#000',overflow:'hidden',
        touchAction:'none',userSelect:'none',
        cursor:isDrag?'grabbing':'grab',
        fontFamily:SF,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Image */}
      {imgNat.w>0&&(
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position:'absolute',
            left:imgLeft,top:imgTop,
            width:imgW,height:imgH,
            pointerEvents:'none',userSelect:'none',
          }}
        />
      )}

      {/* Dark overlay with circular cutout via radial-gradient */}
      <div
        style={{
          position:'absolute',inset:0,pointerEvents:'none',
          background:`radial-gradient(circle ${R}px at ${cx}px ${cy}px, transparent ${R-1}px, rgba(0,0,0,0.72) ${R}px)`,
        }}
      />

      {/* Circle border */}
      <svg
        style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'visible'}}
        width={dims.vw} height={dims.vh}
      >
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2"/>
        {/* Rule-of-thirds guides inside circle */}
        <line x1={cx-R} y1={cy} x2={cx+R} y2={cy} stroke="rgba(255,255,255,0.18)" strokeWidth="1" clipPath={`circle(${R}px at ${cx}px ${cy}px)`}/>
        <line x1={cx} y1={cy-R} x2={cx} y2={cy+R} stroke="rgba(255,255,255,0.18)" strokeWidth="1" clipPath={`circle(${R}px at ${cx}px ${cy}px)`}/>
      </svg>

      {/* Header */}
      <div
        style={{
          position:'absolute',top:0,left:0,right:0,
          padding:'env(safe-area-inset-top,20px) 24px 20px',
          paddingTop:'max(env(safe-area-inset-top,20px),20px)',
          background:'linear-gradient(to bottom,rgba(0,0,0,0.75) 0%,transparent 100%)',
          textAlign:'center',pointerEvents:'none',
        }}
      >
        <div style={{fontSize:17,fontWeight:600,color:'#fff',marginBottom:4}}>Adjust Your Photo</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Pinch to zoom · Drag to reposition</div>
      </div>

      {/* Zoom slider */}
      <div
        style={{
          position:'absolute',bottom:130,left:24,right:24,
          display:'flex',alignItems:'center',gap:12,
          pointerEvents:'auto',
        }}
        onMouseDown={e=>e.stopPropagation()}
      >
        <span style={{fontSize:20,color:'rgba(255,255,255,0.5)',lineHeight:1,userSelect:'none'}}>−</span>
        <input
          type="range" min={0.05} max={10} step={0.005}
          value={zoom}
          onChange={e=>setZoom(+e.target.value)}
          style={{flex:1,accentColor:ACC,height:4,cursor:'pointer'}}
        />
        <span style={{fontSize:20,color:'rgba(255,255,255,0.5)',lineHeight:1,userSelect:'none'}}>+</span>
      </div>

      {/* Action buttons */}
      <div
        style={{
          position:'absolute',bottom:40,left:24,right:24,
          display:'flex',gap:10,
          pointerEvents:'auto',
        }}
        onMouseDown={e=>e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          style={{
            flex:1,padding:'14px 0',
            background:'rgba(255,255,255,0.14)',color:'#fff',
            border:'none',borderRadius:14,fontSize:16,
            cursor:'pointer',fontFamily:SF,
          }}
        >
          Cancel
        </button>
        <button
          onClick={crop}
          style={{
            flex:2,padding:'14px 0',
            background:ACC,color:'#fff',
            border:'none',borderRadius:14,fontSize:16,fontWeight:600,
            cursor:'pointer',fontFamily:SF,
          }}
        >
          Use Photo ✓
        </button>
      </div>
    </div>
  );
}
