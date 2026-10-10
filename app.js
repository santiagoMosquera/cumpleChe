(() => {
  'use strict';
  const cfg = window.GAME_CONFIG;
  const perRound = cfg.parejasPorRonda;
  if (!Number.isInteger(perRound) || perRound < 1) throw Error('parejasPorRonda debe ser entero positivo');
  const ids = Array.isArray(cfg.idsVideos) ? cfg.idsVideos : Array.from({length: cfg.totalVideos}, (_,i) => i+1);
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !Number.isInteger(id) || id <= 0)) throw Error('La lista de videos debe tener identificadores positivos únicos');
  const storageKey = 'cumple-pares-' + cfg.versionContenido;
  const $ = id => document.getElementById(id);
  const board = $('board'), modal = $('videoModal'), video = $('greetingVideo'), message = $('message');
  const imageUrl = (id, side) => `${cfg.carpetaImagenes}/imagen${id}_${side}.${cfg.extensionImagen}`;
  // Asociaciones configuradas en videos.js, compatible con file:// sin fetch.
  const videoNames = new Map();
  for (const [key, rawName] of Object.entries(window.VIDEOS_POR_PAREJA || {})) {
    const match = key.match(/^imagen([1-9]\d*)$/i);
    if (!match || typeof rawName !== 'string') {
      console.warn('Asociación inválida en videos.js:', key);
      continue;
    }
    const name = rawName.trim();
    if (!name || !/\.mp4$/i.test(name) || /[/\\]/.test(name)) {
      console.warn('Nombre de video inválido en videos.js:', key, name);
      continue;
    }
    videoNames.set(Number(match[1]), name);
  }
  const videoUrl = id => {
    const name = videoNames.get(id);
    return name ? `${cfg.carpetaVideos}/${encodeURIComponent(name)}` : null;
  };
  const missingVideos = ids.filter(id => !videoNames.has(id));
  if (missingVideos.length) console.warn('Videos sin asignar:', missingVideos.map(id => `imagen${id}`).join(', '));
  const totalRounds = Math.ceil(ids.length/perRound);
  let interludeDone = false, soundContext = null, portadaTimers = [];
  let unlocked = new Set(), activeId = null, selected = [], locked = false, mismatchTimeout = null, order = {}, dialogRestoreFocus = null;

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey));
      if (parsed && Array.isArray(parsed.unlocked)) unlocked = new Set(parsed.unlocked.filter(x => ids.includes(x)));
      if (parsed) interludeDone = !!parsed.interludeDone;
      if (parsed && parsed.order && typeof parsed.order === 'object') order = parsed.order;
    } catch (_) { /* Si el navegador bloquea el almacenamiento, funciona durante esta sesión. */ }
  }
  function saveState() {
    try { localStorage.setItem(storageKey, JSON.stringify({unlocked:[...unlocked],order,interludeDone})); }
    catch (_) { message.textContent='El navegador no permite guardar el progreso. Podrás jugar, pero puede perderse al cerrar.'; }
  }
  function shuffle(list) {
    const a = [...list];
    for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function currentRound(){
    const firstPending=ids.findIndex(id=>!unlocked.has(id));
    return firstPending === -1 ? totalRounds - 1 : Math.floor(firstPending/perRound);
  }
  function showMessage(s){message.textContent=s;}
  function render(){
    clearTimeout(mismatchTimeout); mismatchTimeout=null; selected=[];locked=false;
    const round=currentRound(), roundIds=ids.slice(round*perRound,(round+1)*perRound);
    $('levelStat').textContent=`Ronda ${round+1} de ${totalRounds}`;
    $('progressStat').textContent='Recibe el amor de tu familia y amigos';
    $('progressBar').style.width=(unlocked.size/ids.length*100)+'%';
    if(!order[round] || !Array.isArray(order[round]) || order[round].length !== roundIds.length*2 || new Set(order[round]).size !== roundIds.length*2){
      order[round]=shuffle(roundIds.flatMap(id=>[{id,side:'A'},{id,side:'B'}].map(c=>`${c.id}_${c.side}`)));
      saveState();
    }
    board.replaceChildren();
    for(const token of order[round]){
      const [idText,side]=token.split('_'),id=Number(idText);
      const card=document.createElement('button');card.type='button';card.className='card';card.dataset.id=id;card.dataset.token=token;
      card.setAttribute('aria-label','Carta boca abajo');
      card.innerHTML='<span class="cardInner"><span class="face back" aria-hidden="true">🎁</span><span class="face front"><img alt="" loading="lazy"><span class="missing" hidden></span></span></span>';
      const img=card.querySelector('img');img.src=imageUrl(id,side);
      img.addEventListener('error',()=>{img.hidden=true;let missing=card.querySelector('.missing');missing.hidden=false;missing.textContent=`Falta imagen${id}_${side}.${cfg.extensionImagen}`;});
      if(unlocked.has(id)) markMatched(card);
      else card.addEventListener('click',()=>flip(card));
      board.appendChild(card);
    }
    showMessage((cfg.titulosRondas || [])[round] || `RONDA ${round+1}`);
  }
  function markMatched(card){card.classList.add('matched');card.classList.add('flipped');card.disabled=true;card.setAttribute('aria-label','Pareja encontrada');}
  function flip(card){
    if(locked || card.classList.contains('flipped') || card.classList.contains('matched') || modal.hidden===false)return;
    playEffect('flip');card.classList.add('flipped');card.setAttribute('aria-label','Carta revelada');selected.push(card);
    if(selected.length!==2)return;
    locked=true;
    const [a,b]=selected;
    if(a.dataset.id===b.dataset.id){
      const id=Number(a.dataset.id);
      unlocked.add(id);saveState();playEffect('match');
      markMatched(a);markMatched(b);selected=[];
      showMessage('¡Correcto! Has desbloqueado un saludo 🎉');
      window.setTimeout(()=>openVideo(id),350);
    } else {
      playEffect('miss');showMessage('No son pareja. ¡Prueba otra combinación!');
      mismatchTimeout=window.setTimeout(()=>{
        for(const c of selected){c.classList.remove('flipped');c.setAttribute('aria-label','Carta boca abajo');}
        selected=[];locked=false;mismatchTimeout=null;
      },950);
    }
  }
  function openVideo(id){
    activeId=id; dialogRestoreFocus=document.activeElement;
    $('modalTitle').textContent=`Saludo sorpresa ${ids.indexOf(id)+1}`;
    $('videoError').hidden=true;
    const src=videoUrl(id);
    if (src) video.src=src;
    else {video.removeAttribute('src');$('videoError').hidden=false;$('videoError').textContent=`No hay un video asociado a imagen${id} en videos.js.`;}
    modal.hidden=false;
    $('continueBtn').focus();
    if (src) video.play().catch(()=>{/* En móviles puede requerir tocar Play. */});
  }
  function closeVideo(){
    if(modal.hidden)return;
    video.pause();video.removeAttribute('src');video.load();modal.hidden=true;activeId=null;
    if(unlocked.size === ids.length){showFinal();return;}
    if(!interludeDone && ids.slice(0,perRound*3).every(id=>unlocked.has(id))){showInterlude();return;}
    render();
    const next=board.querySelector('.card:not(.matched)');
    (next || $('resetBtn')).focus();
  }
  video.addEventListener('error',()=>{if(activeId!==null)$('videoError').hidden=false;});
  $('continueBtn').addEventListener('click',closeVideo);
  $('closeModalX').addEventListener('click',closeVideo);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!modal.hidden)closeVideo();
    if(e.key==='Tab'&&!modal.hidden){
      const elements=[...modal.querySelectorAll('button,video')].filter(el=>!el.disabled);
      const first=elements[0],last=elements[elements.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  $('resetBtn').addEventListener('click',()=>{
    if(!confirm('¿Reiniciar el juego? Se perderá todo el progreso de este navegador.'))return;
    clearTimeout(mismatchTimeout);clearPortadaTimers();unlocked=new Set();order={};interludeDone=false;stopMusic();$('interludeScreen').hidden=true;$('finalScreen').hidden=true;$('gameScreen').hidden=false;
    try{localStorage.removeItem(storageKey);}catch(_){}
    if(!modal.hidden)closeVideo();render();
  });
  $('coverTitle').textContent=cfg.nombreFestejado;
  $('coverMessage').textContent=cfg.mensajePortada || 'Hay muchos saludos esperando por ti. Descubre cada uno encontrando las parejas.';
  if(cfg.imagenPortada){
    const art=$('coverArt'), img=document.createElement('img');
    img.alt='Imagen de portada';img.src=cfg.imagenPortada;
    img.onload=()=>art.replaceChildren(img);
  }
  $('startBtn').addEventListener('click',()=>{
    playEffect('button');$('coverScreen').hidden=true;
    if(unlocked.size === ids.length){showFinal();return;}
    if(!interludeDone && ids.slice(0,perRound*3).every(id=>unlocked.has(id))){showInterlude();return;}
    $('gameScreen').hidden=false;
    $('resetBtn').focus({preventScroll:true});
  });
  // Efectos generados por Web Audio: no necesitan archivos externos.
  function playEffect(type){
    try {
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      soundContext ||= new AC();
      if(soundContext.state==='suspended')soundContext.resume().catch(()=>{});
      const notes=type==='match'?[[660,0],[880,.09],[1100,.18]]:type==='miss'?[[260,0],[190,.1]]:type==='button'?[[540,0]]:[[430,0]];
      notes.forEach(([hz,offset])=>{
        const osc=soundContext.createOscillator(),vol=soundContext.createGain(),now=soundContext.currentTime+offset;
        osc.type=type==='miss'?'triangle':'sine';osc.frequency.setValueAtTime(hz,now);
        vol.gain.setValueAtTime(.0001,now);vol.gain.exponentialRampToValueAtTime(.08,now+.012);vol.gain.exponentialRampToValueAtTime(.0001,now+.13);
        osc.connect(vol);vol.connect(soundContext.destination);osc.start(now);osc.stop(now+.14);
      });
    } catch(e){/* El juego puede funcionar sin sonido. */}
  }
  function stopMusic(){
    for(const id of ['interludeAudio','finalAudio']){const a=$(id);a.pause();a.currentTime=0;}
  }
  function showInterlude(){
    $('gameScreen').hidden=true;$('interludeScreen').hidden=false;
    const audio=$('interludeAudio');audio.src=cfg.musicaIntermedio;
    $('interludeImage').src=cfg.imagenIntermedio;
    audio.hidden=true;$('playInterlude').textContent='▶ REPRODUCIR CANCIÓN';
  }
  $('playInterlude').addEventListener('click',()=>{
    playEffect('button');const a=$('interludeAudio');a.hidden=false;
    if(a.paused){a.play().then(()=>$('playInterlude').textContent='⏸ PAUSAR CANCIÓN').catch(()=>{$('playInterlude').textContent='▶ TOCA PARA REPRODUCIR';});}
    else {a.pause();$('playInterlude').textContent='▶ REPRODUCIR CANCIÓN';}
  });
  $('continueInterlude').addEventListener('click',()=>{
    playEffect('button');stopMusic();interludeDone=true;saveState();$('interludeScreen').hidden=true;$('gameScreen').hidden=false;render();
  });
  function makeConfetti(){
    const container=$('confetti');if(container.children.length)return;
    const palette=['#ffd684','#ff6b8a','#79e1ea','#c19bfa','#ffffff','#92e09c'];
    for(let i=0;i<85;i++){
      const el=document.createElement('i');el.className='confettiPiece';
      el.style.setProperty('--x',`${Math.random()*100}%`);el.style.setProperty('--w',`${5+Math.random()*7}px`);
      el.style.setProperty('--h',`${8+Math.random()*12}px`);el.style.setProperty('--color',palette[i%palette.length]);
      el.style.setProperty('--rot',`${Math.random()*360}deg`);el.style.setProperty('--duration',`${3+Math.random()*4}s`);
      el.style.setProperty('--delay',`${-Math.random()*7}s`);el.style.setProperty('--drift',`${Math.random()*140-70}px`);
      el.style.setProperty('--static-y',`${Math.random()*100}%`);container.appendChild(el);
    }
  }
  // Revelar las 28 portadas de una en una en orden aleatorio.
  function clearPortadaTimers(){
    portadaTimers.forEach(clearTimeout);
    portadaTimers=[];
  }
  function revealFinalPortadas(){
    clearPortadaTimers();
    const tiles=[...$('finalPortadas').children];
    tiles.forEach(tile=>tile.classList.remove('revealed'));
    shuffle(tiles).forEach((tile,index)=>{
      portadaTimers.push(window.setTimeout(()=>tile.classList.add('revealed'),index*450+250));
    });
  }
  // Las 28 portadas decoran el fondo de la celebración; no son botones.
  function makeFinalPortadas(){
    const container=$('finalPortadas');
    if(container.children.length)return;
    for(let i=1;i<=28;i++){
      const tile=document.createElement('div');tile.className='finalPortada';
      const img=document.createElement('img');
      img.src=`assets/portadas/portada${i}.png`;
      img.alt='';img.loading='eager';img.decoding='async';
      img.onerror=()=>{tile.classList.add('portadaMissing');img.remove();};
      tile.appendChild(img);container.appendChild(tile);
    }
  }
  function showFinal(){
    stopMusic();$('gameScreen').hidden=true;$('interludeScreen').hidden=true;$('finalScreen').hidden=false;
    makeFinalPortadas();revealFinalPortadas();makeConfetti();const a=$('finalAudio');a.src=cfg.musicaFinal;
    a.autoplay=true;
    a.play().catch(()=>{/* Algunos navegadores restringen el audio automático. */});
  }
  $('restartFinal').addEventListener('click',()=>{
    if(!confirm('¿Volver a jugar desde el principio?'))return;
    stopMusic();clearPortadaTimers();unlocked=new Set();order={};interludeDone=false;
    try{localStorage.removeItem(storageKey);}catch(_){}
    $('finalScreen').hidden=true;$('gameScreen').hidden=false;render();
  });
  document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(!b.classList.contains('card'))playEffect('button');}));
  readState();render();
})();
