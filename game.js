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

  // Responsif canvas with performance optimization
  function resizeCanvas() {
    const container = document.querySelector('.game-container');
    let ratio = window.devicePixelRatio || 1;

    // Reduce pixel ratio on mobile for better performance
    if (isMobile && ratio > 2) {
      ratio = 2; // Cap at 2x for mobile devices
    } else if (isMobile && ratio > 1.5) {
      ratio = 1.5; // Further reduce for lower-end mobile devices
    }

    let cw = container.clientWidth;
    let ch = container.clientHeight;

    // Ensure minimum dimensions for mobile
    const minWidth = 320;
    const minHeight = 480;
    if (cw < minWidth) cw = minWidth;
    if (ch < minHeight) ch = minHeight;

    canvas.width = Math.floor(cw * ratio);
    canvas.height = Math.floor(ch * ratio);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Optimize canvas context for mobile performance
    if (isMobile) {
      ctx.imageSmoothingEnabled = false; // Disable anti-aliasing for better performance
      ctx.globalCompositeOperation = 'source-over'; // Ensure default composition
    } else {
      ctx.imageSmoothingEnabled = true; // Keep anti-aliasing on desktop
    }

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

      // Better scaling for mobile - use smaller base dimensions for mobile
      const isMobile = window.innerWidth <= 768;
      const scaleFactor = isMobile ? 0.8 : 1.0;
      const baseCanvasWidth = isMobile ? 360 : 420;
      const baseCanvasHeight = isMobile ? 640 : 700;

      bird.width = baseBirdWidth * scaleFactor * (canvas.width / (baseCanvasWidth * ratio));
      bird.height = baseBirdHeight * scaleFactor * (canvas.height / (baseCanvasHeight * ratio));
      bird.x = (canvas.width / ratio) * 0.2;
    }
  }
  window.addEventListener('resize', () => {
    resizeCanvas();
    updatePerformanceMode();
  });
  window.addEventListener('orientationchange', () => {
    resizeCanvas();
    updatePerformanceMode();
  });

  // Assets with optimized loading
  const bgDay = new Image();
  const bgNight = new Image();
  const ground = new Image();
  const pipeImg = new Image();
  const numbers = [];

  // Function to load images with error handling
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
        resolve(null); // Resolve with null to prevent blocking
      };
      img.src = src;
    });
  }

  // Load critical assets first
  async function loadAssets() {
    try {
      const [bgDayImg, bgNightImg, groundImg, pipeImgLoaded] = await Promise.all([
        loadImage("assets/background-day.png"),
        loadImage("assets/background-night.png"),
        loadImage("assets/base.png"),
        loadImage("assets/pipe-green.png")
      ]);

      // Assign loaded images
      if (bgDayImg) bgDay.src = bgDayImg.src;
      if (bgNightImg) bgNight.src = bgNightImg.src;
      if (groundImg) ground.src = groundImg.src;
      if (pipeImgLoaded) pipeImg.src = pipeImgLoaded.src;

      // Load number sprites
      const numberPromises = [];
      for (let i = 0; i <= 9; i++) {
        numberPromises.push(loadImage(`assets/${i}.png`));
      }
      const numberImages = await Promise.all(numberPromises);
      numberImages.forEach((img, i) => {
        if (img) {
          numbers[i] = img;
        } else {
          numbers[i] = null;
        }
      });
    } catch (error) {
      console.warn('Asset loading error:', error);
    }
  }

  const heroes = {
    Pragos: "assets/Pragos.png",
    Nikskuy: "assets/Nikskuy.png",
    Fakriskuy: "assets/Fakriskuy.png",
    Ohim: "assets/Ohim.png",
    Tongskuy: "assets/Tongskuy.png"
  };
  let selectedHero = "Pragos";
  let birdImg = new Image();

  // Load hero images with optimization
  const heroImages = {};
  async function loadHeroImages() {
    const heroPromises = Object.entries(heroes).map(async ([name, src]) => {
      const img = await loadImage(src);
      if (img) {
        heroImages[name] = img;
      }
    });
    await Promise.all(heroPromises);
  }

  // Audio (preload but don't force play)
  const wingSound = new Audio("audio/wing.wav");
  const pointSound = new Audio("audio/point.wav");
  const hitSound = new Audio("audio/hit.wav");
  const dieSound = new Audio("audio/die.wav");
  const swooshSound = new Audio("audio/swoosh.wav");
  [wingSound, pointSound, hitSound, dieSound, swooshSound].forEach(s => {
    try { s.preload = 'auto'; s.load(); } catch(e){ /* ignore */ }
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

  let currentBg = "day";
  let bgCycleTimer = null;
  let bgTransitionProgress = 0;
  let bgTransitionDirection = 0;
  let bgState = 'stay';
  let bgStayTimer = 0;

  // Performance optimization for mobile
  let isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let targetFPS = isMobile ? 30 : 60;
  let frameInterval = 1000 / targetFPS;
  let lastFrameTime = 0;
  let frameCount = 0;
  let performanceMode = isMobile ? 'low' : 'high';

  // Performance monitoring
  let fpsCounter = 0;
  let fpsTimer = 0;
  let currentFPS = 60;
  let performanceHistory = [];

  // Helper: create particles with mobile optimization
  function createParticles() {
    particlesContainer.innerHTML = '';
    // Reduce particle count on mobile for better performance
    const count = isMobile ? 6 : 14;
    for (let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random()*30 + 6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random()*100) + '%';
      p.style.top = (Math.random()*100) + '%';
      p.style.opacity = 0.08 + Math.random()*0.35;
      // Slower animation on mobile
      const duration = isMobile ? (8 + Math.random()*8) : (5 + Math.random()*6);
      p.style.animationDuration = duration + 's';
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
      // Use preloaded hero image
      if (heroImages[selectedHero]) {
        birdImg = heroImages[selectedHero];
      } else {
        birdImg.src = heroes[selectedHero];
      }
  
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
    canvas.onclick = flap;
    canvas.ontouchstart = (e) => {
      e.preventDefault();
      flap();
    };
    touchControl.ontouchstart = (e) => {
      e.preventDefault();
      flap();
    };
    document.onkeydown = (e) => {
      if(e.code==='Space') {
        e.preventDefault();
        flap();
      }
    };

    // Add touch feedback for mobile
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      canvas.style.cursor = 'pointer';
      touchControl.style.cursor = 'pointer';
    }
  }

  function flap(){
    if (!gameRunning || gamePaused) return;
    if (gameState === 'ready') {
      gameState = 'starting'; // New state for the delay period
      pipeStartDelay = 120; // 2 seconds at 60 FPS
    }
    bird.velocity = -jump;
    bird.rotation = -30;
    try { wingSound.currentTime = 0; wingSound.play(); } catch(e){}
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

  function playPointSound(){ try{ pointSound.currentTime=0; pointSound.play(); }catch(e){} }
  function playHit(){ try{ hitSound.currentTime=0; hitSound.play(); }catch(e){} }
  function playDie(){ try{ dieSound.currentTime=0; dieSound.play(); }catch(e){} }
  function playSwoosh(){ try{ swooshSound.currentTime=0; swooshSound.play(); }catch(e){} }

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

  // Main loop with performance optimization
  function loop(currentTime = 0){
    if (!gameRunning || gamePaused) return;

    // Performance monitoring
    fpsCounter++;
    if (currentTime - fpsTimer >= 1000) {
      currentFPS = fpsCounter;
      fpsCounter = 0;
      fpsTimer = currentTime;

      // Adaptive performance adjustment
      adjustPerformance(currentFPS);
    }

    // Throttle frame rate for mobile devices
    if (currentTime - lastFrameTime < frameInterval) {
      requestAnimationFrame(loop);
      return;
    }
    lastFrameTime = currentTime;
    frameCount++;

    // Clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const vw = canvas.width / (window.devicePixelRatio || 1);
    const vh = canvas.height / (window.devicePixelRatio || 1);

   // ground
   const drawGroundH = vh * 0.115;
   const drawGroundW = drawGroundH * (ground.width / (ground.height || 1));
   const groundY = vh - drawGroundH;
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
     // Slower background transition on mobile
     const transitionSpeed = isMobile ? 0.003 : 0.005;
     bgTransitionProgress += transitionSpeed * bgTransitionDirection;
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
     // Reduce pipe speed on mobile
     const baseSpeed = isMobile ? 0.008 : 0.010;
     const speed = vw * baseSpeed * speedMultiplier;
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

    // physics with mobile optimization
    if (gameState === 'ready') {
      // Reduce animation frequency on mobile
      const animationSpeed = isMobile ? 0.03 : 0.05;
      bird.y = (vh / 2 - bird.height/2) + Math.sin(frameCount * animationSpeed) * 4;
      bird.velocity = 0;
    } else {
      const gravityMultiplier = isMobile ? 0.8 : 1.0; // Reduce gravity effect on mobile
      bird.velocity += gravity * (vh / 700) * gravityMultiplier;
      bird.y += bird.velocity;
    }
    // rotation with reduced complexity on mobile
    if (gameState === 'ready') {
      bird.rotation = 0;
    } else {
      const rotationSpeed = isMobile ? 1.8 : 2.4; // Slower rotation on mobile
      bird.rotation = Math.min(90, bird.rotation + rotationSpeed);
      if (bird.velocity < 0) {
        const recoverySpeed = isMobile ? 4 : 6; // Slower recovery on mobile
        bird.rotation = Math.max(-30, bird.rotation - recoverySpeed);
      }
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
    drawScore(score, vw/2, vh * 0.08);
    requestAnimationFrame(loop);
  }

  // Update performance settings when device changes
  function updatePerformanceMode() {
    const newIsMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (newIsMobile !== isMobile) {
      isMobile = newIsMobile;
      targetFPS = isMobile ? 30 : 60;
      frameInterval = 1000 / targetFPS;
      performanceMode = isMobile ? 'low' : 'high';
    }
  }

  // Adaptive performance adjustment based on FPS
  function adjustPerformance(fps) {
    performanceHistory.push(fps);
    if (performanceHistory.length > 10) {
      performanceHistory.shift();
    }

    const avgFPS = performanceHistory.reduce((a, b) => a + b) / performanceHistory.length;

    // Adjust target FPS based on performance
    if (avgFPS < 20 && targetFPS > 20) {
      targetFPS = 20;
      frameInterval = 1000 / targetFPS;
      console.log('Performance: Reduced to 20 FPS');
    } else if (avgFPS > 35 && targetFPS < 30 && isMobile) {
      targetFPS = 30;
      frameInterval = 1000 / targetFPS;
      console.log('Performance: Increased to 30 FPS');
    } else if (avgFPS > 50 && targetFPS < 60 && !isMobile) {
      targetFPS = 60;
      frameInterval = 1000 / targetFPS;
      console.log('Performance: Increased to 60 FPS');
    }
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

  // prevent scroll when interacting with canvas/touchControl
  ['touchstart','touchmove'].forEach(ev=>{
    document.addEventListener(ev, function(e){
      if (e.target === canvas || e.target === touchControl) e.preventDefault();
    }, { passive: false });
  });


  // init visuals
  setMenuBackground();
  createParticles();
  // Reduce particle recreation frequency on mobile
  const particleInterval = isMobile ? 20000 : 10000; // 20s on mobile, 10s on desktop
  setInterval(createParticles, particleInterval);

  // Load assets asynchronously
  loadAssets().then(() => {
    loadHeroImages().then(() => {
      // Set default hero image
      if (heroImages[selectedHero]) {
        birdImg = heroImages[selectedHero];
      } else {
        birdImg.src = heroes[selectedHero];
      }
    });
  });

  // initial canvas and menu
  resizeCanvas();
  backToMenu();
});
