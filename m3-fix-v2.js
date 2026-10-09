(function(){
  'use strict';

  const PATCH_VERSION='M3.0';
  const ROOM_KEY='roqaya-hub-last-room-v2';
  const ROOM_RX=/^#room=([A-Z2-9]{8})$/;
  const peerStates=new WeakMap();
  const trackedPeers=new Set();
  let lastGlobalRecovery=0;

  function toast(text,ms=2200){
    const box=document.querySelector('#message');
    if(!box)return;
    box.textContent=text;
    box.hidden=false;
    window.setTimeout(()=>{
      if(box.textContent===text){box.hidden=true;box.textContent='';}
    },ms);
  }

  function currentRoomFromHash(){
    const match=ROOM_RX.exec(location.hash||'');
    return match?.[1]||'';
  }

  function rememberRoom(){
    const code=currentRoomFromHash();
    try{
      if(code)localStorage.setItem(ROOM_KEY,code);
      else if(!location.hash)localStorage.removeItem(ROOM_KEY);
    }catch(_){}
    return code;
  }

  function savedRoom(){
    const fromHash=rememberRoom();
    if(fromHash)return fromHash;
    try{
      const saved=String(localStorage.getItem(ROOM_KEY)||'').toUpperCase();
      return /^[A-Z2-9]{8}$/.test(saved)?saved:'';
    }catch(_){return '';}
  }

  /* Capture every WebRTC peer created by the app before app.js starts.
     This lets the patch detect the "green but silent" state that connectionState misses. */
  const NativePC=window.RTCPeerConnection;
  if(NativePC && !window.__ROQAYA_M3_RTC_WRAPPED__){
    function RoqayaPeerConnection(...args){
      const pc=new NativePC(...args);
      trackedPeers.add(pc);
      peerStates.set(pc,{
        packets:-1,
        bytes:-1,
        lastProgress:Date.now(),
        lastRecovery:0
      });

      pc.addEventListener('track',event=>{
        try{
          const receiver=event.receiver;
          if(receiver){
            if('jitterBufferTarget' in receiver)receiver.jitterBufferTarget=500;
            if('playoutDelayHint' in receiver)receiver.playoutDelayHint=.38;
          }
        }catch(_){}
      });

      pc.addEventListener('connectionstatechange',()=>{
        if(pc.connectionState==='closed'){
          trackedPeers.delete(pc);
          peerStates.delete(pc);
        }
      });

      return pc;
    }

    RoqayaPeerConnection.prototype=NativePC.prototype;
    try{Object.setPrototypeOf(RoqayaPeerConnection,NativePC);}catch(_){}
    for(const key of Object.getOwnPropertyNames(NativePC)){
      if(key in RoqayaPeerConnection)continue;
      try{Object.defineProperty(RoqayaPeerConnection,key,Object.getOwnPropertyDescriptor(NativePC,key));}catch(_){}
    }
    window.RTCPeerConnection=RoqayaPeerConnection;
    window.webkitRTCPeerConnection=RoqayaPeerConnection;
    window.__ROQAYA_M3_RTC_WRAPPED__=true;
  }

  function healRemoteAudio(){
    const audio=document.querySelector('#remote-audio');
    if(!audio?.srcObject)return;

    try{
      const tracks=audio.srcObject.getAudioTracks?.()||[];
      for(const track of tracks){
        /* The app never intentionally disables the remote track; speaker mute uses audio.muted. */
        if(track.readyState==='live' && track.enabled===false)track.enabled=true;
      }
    }catch(_){}

    if(audio.muted)return;
    try{
      audio.volume=1;
      const p=audio.play();
      if(p?.catch)p.catch(()=>{});
    }catch(_){}
  }

  function forceAppVoiceRetry(reason='silent-media'){
    const now=Date.now();
    if(now-lastGlobalRecovery<20000)return false;
    const controls=document.querySelector('#call-controls');
    if(!controls || controls.hidden || !document.querySelector('.call-modern-pill'))return false;

    lastGlobalRecovery=now;
    toast('🔄 بنصلّح صوت المكالمة تلقائيًا…',2300);

    /* The app already has a delegated handler for data-call-action="retry".
       Injecting a hidden retry button calls the app's own safe ICE-restart flow. */
    const retry=document.createElement('button');
    retry.type='button';
    retry.dataset.callAction='retry';
    retry.setAttribute('aria-label','إصلاح الاتصال');
    retry.style.cssText='position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;';
    controls.appendChild(retry);
    retry.click();
    retry.remove();
    return true;
  }

  async function inspectPeer(pc){
    if(!pc || pc.connectionState==='closed')return;
    if(pc.connectionState!=='connected'){
      healRemoteAudio();
      return;
    }

    let state=peerStates.get(pc);
    if(!state){
      state={packets:-1,bytes:-1,lastProgress:Date.now(),lastRecovery:0};
      peerStates.set(pc,state);
    }

    try{
      const reports=await pc.getStats();
      let inbound=null;
      reports.forEach(report=>{
        if(report.type==='inbound-rtp' && (report.kind==='audio' || report.mediaType==='audio') && !report.isRemote){
          inbound=report;
        }
      });

      if(!inbound){
        healRemoteAudio();
        return;
      }

      const packets=Number(inbound.packetsReceived||0);
      const bytes=Number(inbound.bytesReceived||0);
      const now=Date.now();

      if(state.packets<0 || packets>state.packets || bytes>state.bytes){
        state.lastProgress=now;
        state.packets=packets;
        state.bytes=bytes;
      }else{
        state.packets=packets;
        state.bytes=bytes;

        /* If RTP audio has not moved for 30 seconds while WebRTC still says connected,
           the green indicator is a false-positive. Trigger the app's ICE restart.
           30 s avoids reacting to tiny network pauses; the 20 s global cooldown prevents loops. */
        if(now-state.lastProgress>30000 && now-state.lastRecovery>30000){
          state.lastRecovery=now;
          state.lastProgress=now;
          forceAppVoiceRetry('rtp-stalled');
        }
      }
    }catch(_){}

    healRemoteAudio();
  }

  async function voiceWatchdog(){
    healRemoteAudio();
    for(const pc of [...trackedPeers]){
      try{await inspectPeer(pc);}catch(_){}
    }
  }

  /* Refresh recovery.
     subscribeRoom() already keeps the room in #room=XXXXXXXX.
     The old app only pre-filled that code after refresh; M3 presses Join automatically.
     Because Firebase Anonymous Auth persists in the browser, the same host/guest identity
     resumes the existing room and Firebase restores the exact current screen/game. */
  let resumeAttempts=0;
  const resumeTimer=setInterval(()=>{
    const code=savedRoom();
    if(!code){
      if(++resumeAttempts>25)clearInterval(resumeTimer);
      return;
    }

    const input=document.querySelector('#room-input');
    const join=document.querySelector('button[data-action="join"]');

    if(!input || !join){
      /* Once the room UI is restored there is no room-input anymore. */
      if(document.querySelector('[data-hub-target],.lobby-panel,#school-frame,.playing-game'))clearInterval(resumeTimer);
      return;
    }

    input.value=code;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));

    /* Keep trying because the first click can happen before Firebase auth is ready. */
    if(!join.disabled)join.click();
    if(++resumeAttempts>=16)clearInterval(resumeTimer);
  },900);

  addEventListener('hashchange',rememberRoom);
  addEventListener('pageshow',()=>{rememberRoom();setTimeout(healRemoteAudio,400);});
  addEventListener('online',()=>setTimeout(()=>{
    healRemoteAudio();
    if(document.querySelector('.call-modern-pill.live'))forceAppVoiceRetry('network-return');
  },1800));

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      setTimeout(healRemoteAudio,150);
      setTimeout(healRemoteAudio,1000);
    }
  });

  /* Any user tap is a legal opportunity to resume autoplay/audio context on mobile browsers. */
  document.addEventListener('pointerdown',()=>setTimeout(healRemoteAudio,0),{passive:true});

  setInterval(voiceWatchdog,4000);
  setInterval(rememberRoom,2500);

  window.__ROQAYA_M3__={
    version:PATCH_VERSION,
    retryVoice:()=>forceAppVoiceRetry('manual-debug'),
    room:()=>savedRoom()
  };
})();