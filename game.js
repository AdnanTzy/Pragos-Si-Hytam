document.addEventListener('DOMContentLoaded', () => {
  // Elemen DOM
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const gameWrapper = document.getElementById("gameWrapper");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalScore = document.getElementById("finalScore");
  const finalBestScore = document.getElementById("finalBestScore");
  const particlesContainer = document.getElementById("particles");
  const touchControl = document.getElementById("touchControl");

  const startBtn = document.getElementById("startBtn");
  const heroBtn = document.getElementById("heroBtn");
  const heroSelect = document.getElementById("heroSelect");
  const restartBtn = document.getElementById("restartBtn");
  const restartBtnGameOver = document.getElementById("restartBtnGameOver");
  const mainMenuBtn = document.getElementById("mainMenuBtn");
  const bestScoreText = document.getElementById("bestScoreText");
  const pauseBtn = document.getElementById("pauseBtn");
  const pauseMenu = document.getElementById("pauseMenu");
  const resumeBtn = document.getElementById("resumeBtn");
  const menuBtn = document.getElementById("menuBtn");
  const backBtn = document.getElementById("backBtn");

  // Responsif canvas
  function resizeCanvas() {
    const container = document.querySelector('.game-container');
    let ratio = window.devicePixelRatio || 1;

    // Limit pixel ratio on mobile for better performance
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile && ratio > 2) {
      ratio = 2; // Cap at 2x for mobile performance
    }

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // Ensure minimum dimensions for gameplay
    const minWidth = 320;
    const minHeight = 480;
    const finalWidth = Math.max(cw, minWidth);
    const finalHeight = Math.max(ch, minHeight);

    canvas.width = Math.floor(finalWidth * ratio);
    canvas.height = Math.floor(finalHeight * ratio);
    canvas.style.width = finalWidth + "px";
    canvas.style.height = finalHeight + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // adjust bird size if exists
    if (bird) {
      let baseBirdWidth = 75;
      let baseBirdHeight = 53;
      if (selectedHero === 'Fakriskuy') {
        baseBirdWidth = 108;
        baseBirdHeight = 76;
      }
      if (selectedHero === 'Nikskuy') {
        baseBirdWidth = 113;
        baseBirdHeight = 80;
      }
      bird.width = baseBirdWidth * (canvas.width / (420 * ratio));
      bird.height = baseBirdHeight * (canvas.height / (700 * ratio));
      bird.x = (canvas.width / ratio) * 0.2;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);

  // Assets
  const bgDay = new Image(); bgDay.src = "assets/background-day.png";
  const bgNight = new Image(); bgNight.src = "assets/background-night.png";
  const ground = new Image(); ground.src = "assets/base.png";
  const pipeImg = new Image(); pipeImg.src = "assets/pipe-green.png";
  const numbers = [];
  for (let i = 0; i <= 9; i++){ const img = new Image(); img.src = `assets/${i}.png`; numbers.push(img); }

  const heroes = {
    Pragos: "assets/Pragos.png",
    Nikskuy: "assets/Nikskuy.png",
    Fakriskuy: "assets/Fakriskuy.png",
    Ohim: "assets/Ohim.png",
    Tongskuy: "assets/Tongskuy.png"
  };
  let selectedHero = "Pragos";
  let birdImg = new Image();
  birdImg.src = heroes[selectedHero];

  // Audio (preload but don't force play)
  const wingSound = new Audio("audio/wing.wav");
  const pointSound = new Audio("audio/point.wav");
  const hitSound = new Audio("audio/hit.wav");
  const dieSound = new Audio("audio/die.wav");
  const swooshSound = new Audio("audio/swoosh.wav");

  // Mobile audio optimization
  let audioEnabled = false;
  let audioContext = null;

  function initAudio() {
    if (isMobile) {
      // Create audio context for mobile
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
      } catch(e) {
        console.log('Audio context not supported');
      }
    }
  }

  function enableAudio() {
    audioEnabled = true;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  [wingSound, pointSound, hitSound, dieSound, swooshSound].forEach(s => {
    try {
      s.preload = 'auto';
      s.volume = isMobile ? 0.7 : 1.0; // Slightly lower volume on mobile
      s.load();
    } catch(e){ /* ignore */ }
  });

  // Game state
  let bird = null, pipes = [], score = 0, gameRunning = false, gamePaused = false, gameState = 'ready', readyGroundOffset = 0;
  let pipeStartDelay = 0; // 2 second delay before pipes start (60 FPS * 2 seconds)
  const gravity = 0.5;
  const jump = 7;
  let pipeGap = 150;
  let groundOffset = 0;
  let lastTapTime = 0;
  const tapDelay = 200;
  const deviceKey = btoa(navigator.userAgent + screen.width + "x" + screen.height);
  const storageKey = "flappyHighScore_" + deviceKey;
  let highScore = parseInt(localStorage.getItem(storageKey)) || 0;
  bestScoreText.textContent = `Best Score: ${highScore}`;

  // Mobile performance optimizations
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const targetFPS = isMobile ? 50 : 60; // Slightly higher FPS for smoother gameplay
  const frameInterval = 1000 / targetFPS;
  let lastFrameTime = 0;
  let frameCount = 0;
  let fpsCounter = 0;
  let lastFpsUpdate = 0;

  let currentBg = "day";
  let bgCycleTimer = null;
  let bgTransitionProgress = 0;
  let bgTransitionDirection = 0;
  let bgState = 'stay';
  let bgStayTimer = 0;

  // Helper: create particles
  function createParticles() {
    particlesContainer.innerHTML = '';
    const count = 14;
    for (let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random()*30 + 6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random()*100) + '%';
      p.style.top = (Math.random()*100) + '%';
      p.style.opacity = 0.08 + Math.random()*0.35;
      p.style.animationDuration = 5 + Math.random()*6 + 's';
      particlesContainer.appendChild(p);
    }
  }

  // Set menu background
  function setMenuBackground(){
    menu.style.background = `url('assets/background-${currentBg}.png') center/cover`;
  }

  // reset bird
  function resetBird(){
    let baseW = 75, baseH = 53;
    if (selectedHero === 'Fakriskuy') {
      baseW = 108;
      baseH = 76;
    }
    if (selectedHero === 'Nikskuy') {
      baseW = 113;
      baseH = 80;
    }
    const ratio = window.devicePixelRatio || 1;
    const bw = baseW * ((canvas.width / ratio) / 420);
    const bh = baseH * ((canvas.height / ratio) / 700);
    bird = {
      x: (canvas.width / ratio) * 0.2,
      y: (canvas.height / ratio) / 2 - bh/2,
      width: bw,
      height: bh,
      velocity: -jump / 2,
      rotation: 0
    };
  }

  // Start game
  function startGame(){
      // get selected hero
      const checked = document.querySelector('input[name="hero"]:checked');
      if (checked) selectedHero = checked.value;
      birdImg.src = heroes[selectedHero];
  
      menu.style.display = 'none';
      gameWrapper.style.display = 'flex';
      gameWrapper.setAttribute('aria-hidden','false');
      gameOverScreen.style.display = 'none';
      pauseMenu.style.display = 'none';
  
      resetBird();
      pipes = [];
      score = 0;
      gameRunning = true;
      gamePaused = false;
      gameState = 'ready';
  
      currentBg = Math.random() > 0.5 ? "day" : "night";
      if (bgCycleTimer) clearInterval(bgCycleTimer);
  
      enableTouchControls();
      resizeCanvas();
      loop();
  }

  // Touch / keyboard
  function enableTouchControls(){
    // remove duplicates safely
    canvas.onclick = handleFlap;
    canvas.ontouchstart = handleFlap;
    touchControl.ontouchstart = handleFlap;
    document.onkeydown = (e)=>{ if(e.code==='Space') { e.preventDefault(); handleFlap(); } };

    // Add visual feedback for mobile
    function addTouchFeedback(){
      const feedback = document.createElement('div');
      feedback.style.position = 'absolute';
      feedback.style.width = '100px';
      feedback.style.height = '100px';
      feedback.style.borderRadius = '50%';
      feedback.style.background = 'rgba(255, 215, 0, 0.3)';
      feedback.style.pointerEvents = 'none';
      feedback.style.zIndex = '1000';
      feedback.style.animation = 'touchFeedback 0.3s ease-out';
      return feedback;
    }

    const touchFeedbackStyle = document.createElement('style');
    touchFeedbackStyle.textContent = `
      @keyframes touchFeedback {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    document.head.appendChild(touchFeedbackStyle);
  }

  function handleFlap(e){
    if (e) {
      e.preventDefault();
      e.stopPropagation();

      // Add visual feedback on mobile
      if ('ontouchstart' in window && e.touches) {
        const touch = e.touches[0] || e.changedTouches[0];
        const feedback = document.createElement('div');
        feedback.style.position = 'fixed';
        feedback.style.left = (touch.clientX - 50) + 'px';
        feedback.style.top = (touch.clientY - 50) + 'px';
        feedback.style.width = '100px';
        feedback.style.height = '100px';
        feedback.style.borderRadius = '50%';
        feedback.style.background = 'rgba(255, 215, 0, 0.4)';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '1000';
        feedback.style.animation = 'touchFeedback 0.3s ease-out forwards';
        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), 300);

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }

    flap();
  }

  function flap(){
    if (!gameRunning || gamePaused) return;
    if (gameState === 'ready') {
      gameState = 'starting'; // New state for the delay period
      pipeStartDelay = 120; // 2 seconds at 60 FPS
    }
    bird.velocity = -jump;
    bird.rotation = -30;
    if (!audioEnabled) enableAudio();
    try { if (audioEnabled) { wingSound.currentTime = 0; wingSound.play(); } } catch(e){}
  }

  function restartGame(){ startGame(); }

  function backToMenu(){
      gameRunning = false;
      if (bgCycleTimer) clearInterval(bgCycleTimer);
      gameWrapper.style.display = 'none';
      gameWrapper.setAttribute('aria-hidden','true');
      gameOverScreen.style.display = 'none';
      pauseMenu.style.display = 'none';
      menu.style.display = 'flex';
      setMenuBackground();
      heroSelect.style.display = 'none';
      bestScoreText.textContent = `Best Score: ${highScore}`;
  }

  function togglePause(){
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    pauseMenu.style.display = gamePaused ? 'flex' : 'none';
    if (!gamePaused) {
      loop();
    }
  }

  function playPointSound(){
    if (!audioEnabled) enableAudio();
    try{ pointSound.currentTime=0; if (audioEnabled) pointSound.play(); }catch(e){}
  }
  function playHit(){
    if (!audioEnabled) enableAudio();
    try{ hitSound.currentTime=0; if (audioEnabled) hitSound.play(); }catch(e){}
  }
  function playDie(){
    if (!audioEnabled) enableAudio();
    try{ dieSound.currentTime=0; if (audioEnabled) dieSound.play(); }catch(e){}
  }
  function playSwoosh(){
    if (!audioEnabled) enableAudio();
    try{ swooshSound.currentTime=0; if (audioEnabled) swooshSound.play(); }catch(e){}
  }

  // GAME OVER
  function gameOver(){
    gameRunning = false;
    if (bgCycleTimer) clearInterval(bgCycleTimer);
    currentBg = 'day';
    bgTransitionProgress = 0;
    bgTransitionDirection = 0;
    bgState = 'stay';
    bgStayTimer = 0;
    playHit();
    setTimeout(()=>playDie(), 300);

    if (score > highScore){
      highScore = score;
      localStorage.setItem(storageKey, highScore);
    }
    finalScore.textContent = `Skor: ${score}`;
    finalBestScore.textContent = `Rekor: ${highScore}`;
    gameOverScreen.style.display = 'flex';
    touchControl.style.display = 'none';
  }

  // DRAW SCORE using number sprites
  function drawScore(number, cx, cy){
    const s = number.toString();
    const digitW = (canvas.width / (window.devicePixelRatio||1)) * 0.07;
    const digitH = digitW * 1.6;
    const total = s.length * digitW;
    let x = cx - total/2;
    for (const ch of s){
      const n = parseInt(ch);
      if (numbers[n] && numbers[n].complete) ctx.drawImage(numbers[n], x, cy, digitW, digitH);
      else {
        // fallback draw simple text
        ctx.font = `${digitW}px Arial`;
        ctx.fillStyle = '#fff';
        ctx.fillText(ch, x, cy + digitH*0.8);
      }
      x += digitW;
    }
  }

  // Main loop
  function loop(currentTime = 0){
   if (!gameRunning || gamePaused) return;

   // Frame rate limiting for smooth performance
   if (currentTime - lastFrameTime < frameInterval) {
     requestAnimationFrame(loop);
     return;
   }

   const deltaTime = currentTime - lastFrameTime;
   lastFrameTime = currentTime;

   frameCount++;
   fpsCounter++;

   // Update FPS counter every second
   if (currentTime - lastFpsUpdate > 1000) {
     // Could use fpsCounter for debugging if needed
     fpsCounter = 0;
     lastFpsUpdate = currentTime;
   }

   // Clear canvas efficiently
   ctx.clearRect(0,0,canvas.width,canvas.height);

   const vw = canvas.width / (window.devicePixelRatio || 1);
   const vh = canvas.height / (window.devicePixelRatio || 1);

   // Cache commonly used values for better performance
   const halfVw = vw * 0.5;
   const cachedGroundH = vh * 0.115;
   const cachedGroundY = vh - cachedGroundH;

   // ground
   const drawGroundH = cachedGroundH;
   const drawGroundW = drawGroundH * (ground.width / (ground.height || 1));
   const groundY = cachedGroundY;
   if (gameState === 'ready' || gameState === 'starting') {
     readyGroundOffset = (readyGroundOffset + 2) % drawGroundW;
   }

   // Background
   if (bgState === 'stay') {
     if (score >= 30) {
       bgState = 'transition';
       bgTransitionDirection = 1;
     }
   } else {
     bgTransitionProgress += 0.005 * bgTransitionDirection;
     if (bgTransitionProgress >= 1) {
       bgTransitionProgress = 1;
       bgState = 'stay';
       currentBg = 'night';
       bgTransitionDirection = 0;
     }
   }

   if (bgDay && bgDay.complete && bgNight && bgNight.complete){
     const aspect = bgDay.width / bgDay.height || 1.5;
     let bh = vh;
     let bw = bh * aspect;
     if (bw < vw) { bw = vw; bh = bw / aspect; }
     const bx = (vw - bw) / 2;
     const by = (vh - bh) / 2;

     ctx.globalAlpha = 1 - bgTransitionProgress;
     ctx.drawImage(bgDay, bx, by, bw, bh);
     ctx.globalAlpha = bgTransitionProgress;
     ctx.drawImage(bgNight, bx, by, bw, bh);
     ctx.globalAlpha = 1;
   } else {
     ctx.fillStyle = '#07102a';
     ctx.fillRect(0,0,vw,vh);
   }

   if (gameState === 'starting') {
     // Countdown the delay
     pipeStartDelay--;
     if (pipeStartDelay <= 0) {
       gameState = 'playing';
     }
   }

   if (gameState === 'playing') {
     // Pipes: create and move
     const pipeW = vw * 0.12;
     pipeGap = vh * 0.2;
     const minY = vh * 0.12;
     const maxY = vh * 0.6 - pipeGap;
     const speedMultiplier = 1 + 0.2 * Math.floor(score / 10);
     const speed = vw * 0.010 * speedMultiplier;
     const pipeHeight = 320 * (vh/700);
     const fixedGap = 10;
     const minTopY = pipeHeight;
     const maxTopY = vh - drawGroundH - pipeHeight - fixedGap - pipeHeight;

     if (pipes.length === 0 || pipes[pipes.length-1].x < vw * 0.25){
       const topY = Math.random() * (maxTopY - minTopY) + minTopY;
       const bottomY = topY + pipeHeight + fixedGap;
       pipes.push({ x: vw, y: topY, width: pipeW, height: pipeHeight, bottomY: bottomY, passed: false });
     }

     // draw pipes
     for (let i = pipes.length - 1; i >= 0; i--){
       const p = pipes[i];
       // top (flipped)
       ctx.save();
       ctx.translate(p.x + p.width/2, p.y - p.height/2);
       ctx.scale(1, -1);
       if (pipeImg.complete) ctx.drawImage(pipeImg, -p.width/2, -p.height/2, p.width, p.height);
       ctx.restore();
       // bottom
       if (pipeImg.complete) ctx.drawImage(pipeImg, p.x, p.bottomY, p.width, p.height);
       p.x -= speed;

       // hitbox
       const hb = { x: bird.x + bird.width*0.18, y: bird.y + bird.height*0.18, w: bird.width*0.64, h: bird.height*0.64 };
       if (hb.x + hb.w > p.x && hb.x < p.x + p.width && (hb.y < p.y || hb.y + hb.h > p.bottomY)){
         return gameOver();
       }

       if (!p.passed && p.x + p.width < bird.x){
         p.passed = true;
         score++;
         playPointSound();
       }

       if (p.x + p.width < -50) pipes.splice(i,1);
     }
   }

    // ground
    if (ground.complete) {
      const tiles = Math.ceil(vw / drawGroundW) + 1;
      const offset = (gameState === 'ready' || gameState === 'starting') ? readyGroundOffset : 0;
      for (let i = 0; i < tiles; i++) {
        ctx.drawImage(ground, i * drawGroundW - offset, groundY, drawGroundW, drawGroundH);
      }
    }

    // physics
    if (gameState === 'ready') {
      bird.y = (vh / 2 - bird.height/2) + Math.sin(frameCount * 0.05) * 4;
      bird.velocity = 0;
    } else {
      bird.velocity += gravity * (vh / 700);
      bird.y += bird.velocity;
    }
    // rotation
    if (gameState === 'ready') {
      bird.rotation = 0;
    } else {
      bird.rotation = Math.min(90, bird.rotation + 2.4);
      if (bird.velocity < 0) bird.rotation = Math.max(-30, bird.rotation - 6);
    }

    // draw bird
    ctx.save();
    ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
    ctx.rotate(bird.rotation * Math.PI/180);
    if (birdImg.complete) ctx.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
    ctx.restore();

    // collisions ground
    const hb = { x: bird.x + bird.width*0.18, y: bird.y + bird.height*0.18, w: bird.width*0.64, h: bird.height*0.64 };
    if (hb.y + hb.h >= vh - drawGroundH) return gameOver();
    if (bird.y < 0){ bird.y = 0; bird.velocity = 0; }

    // draw score
    drawScore(score, halfVw, vh * 0.08);
    requestAnimationFrame(loop);
  }

  // listeners
  startBtn.addEventListener('click', ()=>{
    playSwoosh();
    startGame();
  });
  restartBtn.addEventListener('click', ()=>{ playSwoosh(); restartGame(); });
  restartBtnGameOver.addEventListener('click', ()=>{ playSwoosh(); restartGame(); });
  mainMenuBtn.addEventListener('click', ()=>{ playSwoosh(); backToMenu(); });
  menuBtn.addEventListener('click', ()=>{ playSwoosh(); backToMenu(); });
  heroBtn.addEventListener('click', ()=>{
    playSwoosh();
    menu.style.display = 'none';
    heroSelect.style.display = 'flex';
    heroSelect.style.background = `url('assets/background-${currentBg}.png') center/cover`;
  });
  backBtn.addEventListener('click', ()=>{
    playSwoosh();
    heroSelect.style.display = 'none';
    menu.style.display = 'flex';
  });
  pauseBtn.addEventListener('click', togglePause);
  resumeBtn.addEventListener('click', togglePause);


  // init visuals
  setMenuBackground();
  createParticles();
  setInterval(createParticles, 10000);

  // initial canvas and menu
  resizeCanvas();
  backToMenu();

  // Initialize audio for mobile
  initAudio();
});
