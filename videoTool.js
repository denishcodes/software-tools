/* === element references === */
const videoUpload      = document.getElementById('videoUpload');
const photoUpload      = document.getElementById('photoUpload');
const bgMusicUpload    = document.getElementById('bgMusicUpload');
const videoPlayer      = document.getElementById('videoPlayer');
const photoPreview     = document.getElementById('photoPreview');

const playPauseBtn     = document.getElementById('playPauseBtn');
const startTime        = document.getElementById('startTime');
const endTime          = document.getElementById('endTime');
const trimBtn          = document.getElementById('trimBtn');

const overlayText      = document.getElementById('overlayText');
const textPosition     = document.getElementById('textPosition');
const addTextBtn       = document.getElementById('addTextBtn');
const removeOverlayBtn = document.getElementById('removeOverlayBtn');

const screenshotBtn    = document.getElementById('screenshotBtn');
const exportBtn        = document.getElementById('exportBtn');
const resetBtn         = document.getElementById('resetBtn');

const overlayContainer = document.getElementById('overlayContainer');
const statusField      = document.getElementById('status');

/* === editor state === */
let overlaySpan = null;
let trimStart   = 0;
let trimEnd     = Infinity;
let bgAudio     = null;

let mediaRecorder;
let recordedChunks = [];

/* === helpers === */
function setStatus(msg){ statusField.textContent = msg }

/* === load video === */
videoUpload.addEventListener('change', () => {
  const file = videoUpload.files[0];
  if(!file) return;
  videoPlayer.src = URL.createObjectURL(file);
  videoPlayer.style.display = 'block';
  photoPreview.style.display = 'none';
  setStatus('Video loaded');
});

/* === load photo === */
photoUpload.addEventListener('change', () => {
  const file = photoUpload.files[0];
  if(!file) return;
  photoPreview.src = URL.createObjectURL(file);
  photoPreview.style.display = 'block';
  videoPlayer.style.display = 'none';
  setStatus('Photo loaded');
});

/* === load background music === */
bgMusicUpload.addEventListener('change', () => {
  const file = bgMusicUpload.files[0];
  if(!file) return;
  if(bgAudio) bgAudio.pause();
  bgAudio = new Audio(URL.createObjectURL(file));
  bgAudio.loop = true;
  setStatus('Background music ready');
});

/* === play / pause toggle === */
playPauseBtn.addEventListener('click', () => {
  if(videoPlayer.paused){
    videoPlayer.play();
    if(bgAudio) bgAudio.play();
    playPauseBtn.textContent = '⏸ Pause';
  }else{
    videoPlayer.pause();
    if(bgAudio) bgAudio.pause();
    playPauseBtn.textContent = '▶ Play';
  }
});

/* === trim preview === */
trimBtn.addEventListener('click', () => {
  trimStart = +startTime.value || 0;
  trimEnd   = +endTime.value   || videoPlayer.duration || Infinity;
  if(trimStart >= trimEnd){
    alert('Start must be less than End');
    return;
  }
  videoPlayer.currentTime = trimStart;
  videoPlayer.play();
  if(bgAudio) bgAudio.play();
  setStatus(Previewing ${trimStart}s – ${trimEnd}s);
});
videoPlayer.addEventListener('timeupdate', () => {
  if(videoPlayer.currentTime >= trimEnd){
    videoPlayer.pause();
    if(bgAudio) bgAudio.pause();
    videoPlayer.currentTime = trimStart;
    playPauseBtn.textContent = '▶ Play';
  }
});

/* === add / remove overlay === */
addTextBtn.addEventListener('click', () => {
  const txt = overlayText.value.trim();
  if(!txt) return;

  // remove old
  if(overlaySpan) overlaySpan.remove();

  overlaySpan = document.createElement('div');
  overlaySpan.className = overlay-text overlay-${textPosition.value};
  overlaySpan.textContent = txt;
  overlayContainer.appendChild(overlaySpan);

  setStatus('Overlay added');
});
removeOverlayBtn.addEventListener('click', () => {
  if(overlaySpan){
    overlaySpan.remove();
    overlaySpan = null;
    setStatus('Overlay removed');
  }
});

/* === screenshot current frame === */
screenshotBtn.addEventListener('click', () => {
  if(videoPlayer.readyState < 2){ alert('Load a video first'); return; }

  const c = document.createElement('canvas');
  c.width  = videoPlayer.videoWidth;
  c.height = videoPlayer.videoHeight;
  const ctx = c.getContext('2d');

  // draw video frame
  ctx.drawImage(videoPlayer, 0, 0, c.width, c.height);

  // draw overlay text if present
  if(overlaySpan){
    ctx.fillStyle = 'white';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';

    const pos = overlaySpan.classList.contains('overlay-top')   ? 0.15 :
                overlaySpan.classList.contains('overlay-middle')? 0.50 :
                                                                 0.85;
    ctx.fillText(overlaySpan.textContent, c.width/2, c.height*pos);
  }

  // download PNG
  const a = document.createElement('a');
  a.download = 'screenshot.png';
  a.href = c.toDataURL('image/png');
  a.click();

  setStatus('Screenshot saved');
});

/* === export trimmed segment (simple screen-record) === */
exportBtn.addEventListener('click', () => {
  if(videoPlayer.readyState < 2){ alert('Load a video first'); return; }

  recordedChunks = [];
  const stream = videoPlayer.captureStream();
  mediaRecorder = new MediaRecorder(stream, { mimeType:'video/webm' });

  mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type:'video/webm' });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported_trim.webm';
    a.click();

    setStatus('Export finished (WEBM)');
  };

  // start recording & play segment
  videoPlayer.currentTime = trimStart;
  mediaRecorder.start();

  videoPlayer.play();
  if(bgAudio) bgAudio.play();

  setStatus('Recording…');

  const duration = Math.max(0, trimEnd - trimStart);
  setTimeout(() => {
    videoPlayer.pause();
    if(bgAudio) bgAudio.pause();
    mediaRecorder.stop();
  }, duration * 1000);
});

/* === reset everything === */
resetBtn.addEventListener('click', () => {
  videoPlayer.pause();
  if(bgAudio) bgAudio.pause();

  videoPlayer.currentTime = 0;
  trimStart = 0; trimEnd = Infinity;
  startTime.value = ''; endTime.value = '';
  overlayText.value = '';

  if(overlaySpan){ overlaySpan.remove(); overlaySpan = null; }
  playPauseBtn.textContent = '▶ Play';
  setStatus('Reset complete');
});