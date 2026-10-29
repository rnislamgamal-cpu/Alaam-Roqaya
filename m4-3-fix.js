/* M4.3 hub DOM safety fix.
   Keeps action cards outside image clipping contexts after every app render.
*/
(() => {
  const screen = document.getElementById('screen');
  if (!screen) return;

  let busy = false;

  function inviteLink(){
    const match = location.hash.match(/^#room=([A-Z2-9]{8})$/);
    if (!match) return location.href;
    return `${location.origin}${location.pathname}#room=${match[1]}`;
  }

  async function shareInvite(){
    const link = inviteLink();
    const code = location.hash.match(/^#room=([A-Z2-9]{8})$/)?.[1] || '';
    try{
      if (navigator.share){
        await navigator.share({
          title:'مدرسة وعالم رقية',
          text:`تعالي ندخل المدرسة سوا 💜${code ? ` — كود الغرفة: ${code}` : ''}`,
          url:link
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      alert('✅ تم نسخ رابط الدعوة');
    }catch(err){
      if (err?.name === 'AbortError') return;
      try{
        await navigator.clipboard.writeText(link);
        alert('✅ تم نسخ رابط الدعوة');
      }catch(_){
        prompt('انسخ رابط الدعوة:', link);
      }
    }
  }

  function repair(){
    if (busy) return;
    busy = true;
    try{
      const captions = [...screen.querySelectorAll('.hub-stage > .hub-stage-caption')];
      for (const caption of captions){
        const stage = caption.parentElement;
        if (!stage) continue;

        let wrap = stage.parentElement;
        if (!wrap?.classList.contains('hub-screen-wrap')){
          wrap = document.createElement('div');
          wrap.className = 'hub-screen-wrap';
          stage.before(wrap);
          wrap.append(stage);
        }

        caption.classList.add('hub-stage-caption-static');
        wrap.append(caption);

        const roomLine = caption.querySelector('.hub-room-line');
        const waitNote = caption.querySelector('.hub-wait-note');

        if (roomLine && waitNote && !caption.querySelector('.hub-share-fix')){
          const share = document.createElement('button');
          share.type = 'button';
          share.className = 'hub-share-fix';
          share.textContent = '📤 ابعت رابط الدعوة لرقية';
          share.addEventListener('click', shareInvite);
          roomLine.after(share);
        }
      }

      // If a previous render already produced a static caption, enforce visibility.
      screen.querySelectorAll('.hub-stage-caption-static').forEach(el => {
        el.style.display = 'block';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });
    } finally {
      busy = false;
    }
  }

  const observer = new MutationObserver(() => queueMicrotask(repair));
  observer.observe(screen,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',repair,{once:true});
  window.addEventListener('pageshow',repair);
  repair();
})();
