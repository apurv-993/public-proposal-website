const $ = (s) => document.querySelector(s);
const screens = [...document.querySelectorAll('.screen')];
const photoInput = $('#photoInput'), photoPreview = $('#photoPreview'), toast = $('#toast');
const musicFileInput = $('#musicFileInput'), musicUrlInput = $('#musicUrlInput'), chosenMusicStatus = $('#chosenMusicStatus');
const customSongPlayer = $('#customSongPlayer'), customSongAudio = $('#customSongAudio'), customSongToggle = $('#customSongToggle');
let chosenMusicFile = null;
let selectedPhotos = [], proposal = {sender:'',recipient:'',gender:'her',description:'',message:'',photos:[],musicData:'',musicUrl:'',musicName:''};
let toastTimer, audioContext = null, musicNodes = [], musicOn = false;
const SUPABASE_READY = window.supabase && window.LILAC_SUPABASE_URL && !window.LILAC_SUPABASE_URL.includes('YOUR-PROJECT-REF') && window.LILAC_SUPABASE_ANON_KEY && !window.LILAC_SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');
const db = SUPABASE_READY ? window.supabase.createClient(window.LILAC_SUPABASE_URL, window.LILAC_SUPABASE_ANON_KEY) : null;
function showScreen(id){screens.forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo({top:0,behavior:'smooth'});}
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2700);}
const petals=$('#petals');for(let i=0;i<36;i++){const p=document.createElement('span');p.className='petal';p.style.left=`${Math.random()*100}%`;p.style.animationDuration=`${8+Math.random()*13}s`;p.style.animationDelay=`${-Math.random()*20}s`;p.style.opacity=`${.25+Math.random()*.6}`;p.style.width=`${7+Math.random()*8}px`;p.style.height=`${12+Math.random()*12}px`;petals.appendChild(p);}

// Gentle synthesized ambient chords; starts only after the visitor taps Play.
async function toggleMusic(){
  try{
    if(musicOn){musicNodes.forEach(n=>{try{n.stop();}catch{}});musicNodes=[];musicOn=false;$('#musicButton').innerHTML='♫ <span>Play music</span>';$('#musicButton').setAttribute('aria-pressed','false');return;}
    const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx){showToast('Background audio is not supported in this browser.');return;}
    audioContext ||= new AudioCtx();await audioContext.resume();
    const master=audioContext.createGain();master.gain.value=.035;master.connect(audioContext.destination);
    // Soft, slow-moving pad chord (C major 7) made with gentle sine waves.
    [130.81,164.81,196,246.94].forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.value=i===0?.45:.22;osc.connect(gain);gain.connect(master);osc.start();musicNodes.push(osc);});musicNodes.push({stop:()=>master.disconnect()});musicOn=true;$('#musicButton').innerHTML='♫ <span>Pause music</span>';$('#musicButton').setAttribute('aria-pressed','true');
  }catch(e){showToast('Could not start music. Tap the music button again.');}
}
$('#musicButton').addEventListener('click',toggleMusic);

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
musicFileInput?.addEventListener('change', () => {
  chosenMusicFile = musicFileInput.files?.[0] || null;
  if (!chosenMusicFile) { chosenMusicStatus.textContent = 'No custom song selected'; return; }
  if (!chosenMusicFile.type.startsWith('audio/')) {
    chosenMusicFile = null; musicFileInput.value = '';
    chosenMusicStatus.textContent = 'Please choose a valid audio file.';
    showToast('Please choose an audio file.'); return;
  }
  if (chosenMusicFile.size > 20 * 1024 * 1024) {
    chosenMusicFile = null; musicFileInput.value = '';
    chosenMusicStatus.textContent = 'That file is larger than 20 MB. Please choose a smaller audio file.';
    showToast('Audio files must be 20 MB or smaller.');
    return;
  }
  musicUrlInput.value = '';
  chosenMusicStatus.textContent = `Selected: ${chosenMusicFile.name}`;
});
function setupRecipientSong({ tryAutoplay = true } = {}) {
  const source = proposal.musicData || proposal.musicUrl || '';
  if (!source) {
    customSongPlayer.hidden = true;
    customSongAudio.pause();
    customSongAudio.removeAttribute('src');
    customSongAudio.load();
    return false;
  }

  customSongPlayer.hidden = false;
  customSongAudio.pause();
  customSongAudio.src = source;
  customSongAudio.load();
  customSongToggle.textContent = 'Play song ▶';
  customSongToggle.setAttribute('aria-pressed', 'false');
  customSongPlayer.classList.remove('playing');
  $('#songFileLabel').textContent = proposal.musicName || 'A song chosen just for this moment';

  customSongAudio.onerror = () => {
    customSongToggle.textContent = 'Play song ▶';
    customSongToggle.setAttribute('aria-pressed', 'false');
    customSongPlayer.classList.remove('playing');
    showToast('This audio file could not be decoded or loaded. Try an MP3, WAV, or M4A file, or a direct audio URL.');
  };

  if (tryAutoplay) {
    customSongAudio.play().then(() => {
      customSongToggle.textContent = 'Pause song ❚❚';
      customSongToggle.setAttribute('aria-pressed', 'true');
      customSongPlayer.classList.add('playing');
    }).catch((error) => {
      // Audible autoplay is commonly blocked until the recipient taps the control.
      console.info('Autoplay was blocked or audio could not start:', error);
      customSongToggle.textContent = 'Play song ▶';
      customSongToggle.setAttribute('aria-pressed', 'false');
      customSongPlayer.classList.remove('playing');
    });
  }
  return true;
}

customSongToggle?.addEventListener('click', async () => {
  if (!customSongAudio.src) {
    showToast('No song is loaded. Add a music file when creating the proposal.');
    return;
  }
  if (customSongAudio.paused) {
    try {
      await customSongAudio.play();
      customSongToggle.textContent = 'Pause song ❚❚';
      customSongToggle.setAttribute('aria-pressed', 'true');
      customSongPlayer.classList.add('playing');
    } catch (error) {
      console.error('Audio playback failed:', error);
      showToast('The song could not play. Try a standard MP3 file and check that the browser tab is not muted.');
    }
  } else {
    customSongAudio.pause();
    customSongToggle.textContent = 'Play song ▶';
    customSongToggle.setAttribute('aria-pressed', 'false');
    customSongPlayer.classList.remove('playing');
  }
});
customSongAudio?.addEventListener('play', () => {
  customSongToggle.textContent = 'Pause song ❚❚';
  customSongToggle.setAttribute('aria-pressed', 'true');
  customSongPlayer.classList.add('playing');
});
customSongAudio?.addEventListener('pause', () => {
  customSongToggle.textContent = 'Play song ▶';
  customSongToggle.setAttribute('aria-pressed', 'false');
  customSongPlayer.classList.remove('playing');
});
customSongAudio?.addEventListener('ended', () => {
  customSongToggle.textContent = 'Play song ▶';
  customSongToggle.setAttribute('aria-pressed', 'false');
  customSongPlayer.classList.remove('playing');
});

function renderPhotoEditors(){
  photoPreview.replaceChildren();
  selectedPhotos.forEach((photo,index)=>{
    const row=document.createElement('div');row.className='photo-editor-item';
    const img=document.createElement('img');img.alt=`Photo ${index+1} preview`;img.src=URL.createObjectURL(photo.file);
    const field=document.createElement('div');field.className='photo-editor-fields';
    const label=document.createElement('label');label.textContent=`Photo ${index+1} caption (optional)`;label.htmlFor=`photoCaption${index}`;
    const input=document.createElement('input');input.id=`photoCaption${index}`;input.type='text';input.maxLength=180;input.placeholder='A little memory behind this photo…';input.value=photo.caption;input.dataset.photoCaption=String(index);
    input.addEventListener('input',()=>{selectedPhotos[index].caption=input.value;});
    const remove=document.createElement('button');remove.type='button';remove.className='remove-photo-button';remove.textContent='Remove photo';remove.setAttribute('aria-label',`Remove photo ${index+1}`);remove.addEventListener('click',()=>{selectedPhotos.splice(index,1);renderPhotoEditors();});
    field.append(label,input,remove);row.append(img,field);photoPreview.appendChild(row);
  });
  const count=document.createElement('div');count.className='photo-count';count.textContent=`${selectedPhotos.length} of 6 photos selected${selectedPhotos.length<6?' · You can add more below.':''}`;photoPreview.appendChild(count);
}
photoInput.addEventListener('change',()=>{
  const incoming=[...photoInput.files].filter(file=>file.type.startsWith('image/'));
  const slots=Math.max(0,6-selectedPhotos.length);
  const additions=incoming.slice(0,slots).map(file=>({file,caption:''}));
  selectedPhotos.push(...additions);
  renderPhotoEditors();
  if(incoming.length>slots)showToast(slots===0?'You already have six photos. Remove one to add another.':`Only ${slots} more photo${slots===1?'':'s'} fit; the maximum is six.`);
  // Clear the native input so the user can select more photos in a second batch,
  // including a file they previously selected and then removed.
  photoInput.value='';
});
function fileToCompressedDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const image=new Image();image.onerror=reject;image.onload=()=>{const max=420,scale=Math.min(1,max/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.58));};image.src=reader.result;};reader.readAsDataURL(file);});}
function dataURLToBlob(dataURL){const [meta,encoded]=dataURL.split(',');const mime=(meta.match(/data:(.*?);base64/)||[])[1]||'application/octet-stream';const binary=atob(encoded);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime});}
function fileExtension(file){const byType={'audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/wav':'wav','audio/ogg':'ogg','audio/webm':'webm','audio/aac':'aac'};return byType[file.type]||((file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin');}
async function uploadPublicFile(path, file, contentType){const {data,error}=await db.storage.from('proposal-media').upload(path,file,{contentType:contentType||file.type||'application/octet-stream',upsert:false,cacheControl:'3600'});if(error)throw error;const {data:publicData}=db.storage.from('proposal-media').getPublicUrl(data.path);return publicData.publicUrl;}
function currentShareURL(){return `${location.origin}${location.pathname}#proposal=${encodeURIComponent(proposal.id||'')}`;}
async function createProposal(event){
  event.preventDefault();
  if(!db){showToast('Storage is not configured yet. Add your Supabase URL and anon key in supabase-config.js.');return;}
  proposal.sender=$('#senderName').value.trim();proposal.recipient=$('#recipientName').value.trim();proposal.gender=document.querySelector('input[name="recipientGender"]:checked').value;proposal.description=$('#crushDescription').value.trim();proposal.message=$('#proposalText').value.trim();
  if(!proposal.sender||!proposal.recipient||!proposal.description||!proposal.message){showToast('Please fill in all required fields first.');return;}
  const musicUrl=musicUrlInput?.value.trim()||'';
  if(musicUrl&&!/^https?:\/\//i.test(musicUrl)){showToast('Please enter a public URL starting with https:// or http://');return;}
  const id=crypto.randomUUID();
  proposal.id=id;proposal.photos=[];proposal.musicData='';proposal.musicUrl=musicUrl;proposal.musicName='';
  try{
    showToast('Uploading your photos…');
    for(let i=0;i<selectedPhotos.length;i++){
      const photo=selectedPhotos[i];const compressed=await fileToCompressedDataURL(photo.file);const blob=dataURLToBlob(compressed);const url=await uploadPublicFile(`${id}/photo-${i+1}.jpg`,blob,'image/jpeg');
      proposal.photos.push({data:url,caption:photo.caption.trim()});
    }
    if(chosenMusicFile){showToast('Uploading your music…');proposal.musicUrl=await uploadPublicFile(`${id}/music.${fileExtension(chosenMusicFile)}`,chosenMusicFile,chosenMusicFile.type);proposal.musicName=chosenMusicFile.name;}
    const record={id:proposal.id,sender:proposal.sender,recipient:proposal.recipient,gender:proposal.gender,description:proposal.description,message:proposal.message,photos:proposal.photos,music_url:proposal.musicUrl||null,music_name:proposal.musicName||null};
    const {error}=await db.from('proposals').insert(record);if(error)throw error;
    fillProposal();setupRecipientSong({tryAutoplay:false});history.replaceState(null,'',`${location.pathname}${location.search}#proposal=${encodeURIComponent(id)}`);showScreen('buildUpScreen');
    $('#linkStatus').textContent='Your unique link is ready to copy.';showToast('Your proposal is saved online 💜');
  }catch(error){console.error('Save proposal failed:',error);showToast(`Could not save proposal: ${error.message||'check Supabase setup and storage policies'}`);}
}
function fillProposal(){ $('#buildUpTo').textContent=`For ${proposal.recipient}, from ${proposal.sender}`;$('#crushStory').textContent=proposal.description;$('#toLine').textContent=`A question for ${proposal.recipient}`;$('#proposalTitle').textContent='I am already yours, will u be mine?';$('#proposalMessage').textContent=proposal.message; }
$('#setupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#setupForm button[type=submit]');
  if (button) { button.disabled = true; button.textContent = 'Creating your moment…'; }
  try {
    await createProposal(event);
  } catch (error) {
    console.error('Proposal creation error:', error);
    showToast(error && error.message ? `Could not create proposal: ${error.message}` : 'Something went wrong. Check the browser console for details.');
  } finally {
    if (button) { button.disabled = false; button.innerHTML = 'Create the moment <span>♡</span>'; }
  }
});
$('#revealQuestionButton').addEventListener('click',()=>{fillProposal();showScreen('proposalScreen');});
async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;}}
$('#copyLinkButton').addEventListener('click',async()=>{const link=currentShareURL();if(!proposal.id){$('#linkStatus').textContent='Create and save the proposal first.';return;}const ok=await copyText(link);$('#linkStatus').textContent=ok?'Unique proposal link copied! Send it to your person 💜':'Copy was blocked. You can copy the URL from the address bar after generating the link.';if(ok)showToast('Unique proposal link copied 💜');});

function moveNoButton(){const btn=$('#noButton'),area=$('.answer-area');const maxX=Math.max(0,area.clientWidth-btn.offsetWidth),maxY=Math.max(0,area.clientHeight-btn.offsetHeight);let x=Math.random()*maxX,y=Math.random()*maxY;const yes=$('#yesButton').getBoundingClientRect(),areaRect=area.getBoundingClientRect();for(let tries=0;tries<12;tries++){const bx=areaRect.left+x,by=areaRect.top+y;if(bx+btn.offsetWidth<yes.left-8||bx>yes.right+8||by+btn.offsetHeight<yes.top-8||by>yes.bottom+8)break;x=Math.random()*maxX;y=Math.random()*maxY;}btn.style.left=`${x}px`;btn.style.top=`${y}px`;btn.style.transform='none';}
$('#noButton').addEventListener('click',()=>{showToast('dont say no 🥺💔');moveNoButton();});
function launchConfetti(){const symbols=['🌸','💗','🌷','✦','💜'];for(let i=0;i<28;i++){const bit=document.createElement('span');bit.textContent=symbols[Math.floor(Math.random()*symbols.length)];bit.style.cssText=`position:fixed;z-index:4;left:${Math.random()*100}vw;top:-30px;font-size:${14+Math.random()*17}px;pointer-events:none;animation:fall ${5+Math.random()*5}s linear forwards;`;document.body.appendChild(bit);setTimeout(()=>bit.remove(),10500);}}
$('#yesButton').addEventListener('click',()=>{
  const pronoun=proposal.gender==='her'?'She':proposal.gender==='him'?'He':'They';$('#yesHeading').textContent=`${pronoun} said yes!`;$('#yesSubtitle').textContent=`A little moment for ${proposal.recipient} and ${proposal.sender}.`;$('#memoryNames').textContent=`${proposal.sender} ✦ ${proposal.recipient}`;$('#memoryQuote').textContent=`“${proposal.message}”`;$('#signature').textContent=`with love, ${proposal.sender}`;
  const gallery=$('#memoryPhotos');gallery.replaceChildren();
  if(proposal.photos.length){proposal.photos.forEach((photo,i)=>{const figure=document.createElement('figure');figure.className='memory-photo-card';const img=document.createElement('img');img.src=photo.data;img.alt=`Memory photo ${i+1}`;figure.appendChild(img);if(photo.caption){const cap=document.createElement('figcaption');cap.textContent=photo.caption;figure.appendChild(cap);}gallery.appendChild(figure);});}
  else{const fallback=document.createElement('div');fallback.textContent='💐 A memory to keep';fallback.style.cssText='padding:32px 18px;border:1px dashed rgba(237,208,255,.35);border-radius:16px;color:#e7c9ef;grid-column:1/-1';gallery.appendChild(fallback);}
  $('#replyText').value=`Yes, ${proposal.sender} 💗\n${proposal.recipient}`;$('#replyStatus').textContent='';showScreen('yesScreen');launchConfetti();
});
function buildReplyMessage(){return `A little reply 💌\n\nTo: ${proposal.sender}\nFrom: ${proposal.recipient}\n\n${$('#replyText').value.trim()}`;}
$('#replyForm').addEventListener('submit',async e=>{e.preventDefault();const message=buildReplyMessage();if(!$('#replyText').value.trim()){showToast('Write a reply first 💌');return;}if(navigator.share){try{await navigator.share({title:'A little reply 💌',text:message});$('#replyStatus').textContent='Share sheet opened. Choose where you’d like to send it.';}catch(error){if(error.name!=='AbortError')$('#replyStatus').textContent='Sharing wasn’t available. You can copy the message instead.';}}else{const ok=await copyText(message);$('#replyStatus').textContent=ok?'Reply copied. Paste it into your messaging app.':'Please select and copy the reply manually.';}});
$('#copyReplyButton').addEventListener('click',async()=>{const ok=await copyText(buildReplyMessage());$('#replyStatus').textContent=ok?'Copied! Paste it into your chat app.':'Clipboard access was blocked; select and copy the text manually.';if(ok)showToast('Copied to clipboard 💗');else{$('#replyText').focus();$('#replyText').select();}});
$('#startOverButton').addEventListener('click',()=>{customSongAudio.pause();history.replaceState(null,'',`${location.pathname}${location.search}`);$('#setupForm').reset();photoPreview.replaceChildren();selectedPhotos=[];photoInput.value='';proposal={sender:'',recipient:'',gender:'her',description:'',message:'',photos:[],musicData:'',musicUrl:'',musicName:''};showScreen('setupScreen');});

// A recipient opens a compact link; proposal content and media are fetched from Supabase.
async function loadSharedProposal(){
  const match=location.hash.match(/#proposal=([^&]+)/);if(!match)return;
  const id=decodeURIComponent(match[1]);if(!id)return;
  if(!db){showToast('This shared proposal needs Supabase configuration on the website.');return;}
  try{
    const {data,error}=await db.rpc('get_proposal_by_id',{p_id:id});
    if(error)throw error;
    if(!data || !data.id) throw new Error('Proposal not found. Check the link or ask the creator to make a new one.');
    proposal={id:data.id,sender:String(data.sender||''),recipient:String(data.recipient||''),gender:['her','him','them'].includes(data.gender)?data.gender:'them',description:String(data.description||''),message:String(data.message||''),photos:Array.isArray(data.photos)?data.photos.filter(p=>p&&typeof p.data==='string').slice(0,6).map(p=>({data:p.data,caption:String(p.caption||'')})):[],musicData:'',musicUrl:String(data.music_url||''),musicName:String(data.music_name||'')};
    fillProposal();$('#setupScreen').classList.remove('active');showScreen('buildUpScreen');setupRecipientSong({tryAutoplay:false});$('#linkStatus').textContent='You are viewing a saved proposal.';
  }catch(error){console.error('Could not load proposal:',error);showToast('Could not load this proposal. The link may be invalid or storage is unavailable.');}
}
loadSharedProposal();
