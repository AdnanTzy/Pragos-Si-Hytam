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
  const pauseBtn = document.getElementById("pauseBtn");
  const pauseMenu = document.getElementById("pauseMenu");
  const resumeBtn = document.getElementById("resumeBtn");
  const menuBtn = document.getElementById("menuBtn");
  const backBtn = document.getElementById("backBtn");
  const leaderboardBtn = document.getElementById("leaderboardBtn");
  const leaderboardScreen = document.getElementById("leaderboardScreen");
  const leaderboardList = document.getElementById("leaderboardList");
  const leaderboardBackBtn = document.getElementById("leaderboardBackBtn");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const highScoreInput = document.getElementById("highScoreInput");
  const playerNameInput = document.getElementById("playerNameInput");
  const submitScoreBtn = document.getElementById("submitScoreBtn");

  // API URL
  const API_URL = "https://pragos-production.up.railway.app";

  // Responsif canvas
  function resizeCanvas() {
    const container = document.querySelector('.game-container');
    const ratio = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = Math.floor(cw * ratio);
    canvas.height = Math.floor(ch * ratio);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
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
      if (selectedHero === 'Madskuy') {
        baseBirdWidth = 80;
        baseBirdHeight = 56;
      }
      if (selectedHero === 'Ohim') {
        baseBirdWidth = 68;
        baseBirdHeight = 48;
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
    Tongskuy: "assets/Tongskuy.png",
    Madskuy: "assets/Madskuy.png"
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
  [wingSound, pointSound, hitSound, dieSound, swooshSound].forEach(s => {
    try { s.preload = 'auto'; s.load(); } catch(e){ /* ignore */ }
  });

  // Game state
  let bird = null, pipes = [], score = 0, gameRunning = false, gamePaused = false, gameState = 'ready', frameCount = 0, readyGroundOffset = 0;
  let pipeStartDelay = 0; // 2 second delay before pipes start (60 FPS * 2 seconds)
  const gravity = 0.5;
  const jump = 7;
  let pipeGap = 150;
  let groundOffset = 0;
  let lastTapTime = 0;
  const tapDelay = 200;
  const deviceKey = btoa(navigator.userAgent + screen.width + "x" + screen.height);
  const storageKey = "flappyHighScore_" + deviceKey;
  let highScore = 0;
  localStorage.setItem(storageKey, highScore);

  let currentBg = "day";
  let bgCycleTimer = null;
  let bgTransitionProgress = 0;
  let bgTransitionDirection = 0;
  let bgState = 'stay';
  let bgStayTimer = 0;

  // Leaderboard state
  let leaderboardData = [];
  const sessionUsernameKey = "pragosSessionUsername";

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
    if (selectedHero === 'Madskuy') {
      baseW = 80;
      baseH = 56;
    }
    if (selectedHero === 'Ohim') {
      baseW = 68;
      baseH = 48;
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
    canvas.onclick = flap;
    touchControl.ontouchstart = (e)=>{ e.preventDefault(); flap(); };
    document.onkeydown = (e)=>{ if(e.code==='Space') { e.preventDefault(); flap(); } };
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

  // Leaderboard Functions
  async function fetchLeaderboard() {
    try {
      loadingSpinner.style.display = 'flex';
      const response = await fetch(`${API_URL}/leaderboard`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      leaderboardData = data;
      return data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    } finally {
      loadingSpinner.style.display = 'none';
    }
  }

  function displayLeaderboard(scores) {
    leaderboardList.innerHTML = '';

    if (scores.length === 0) {
      leaderboardList.innerHTML = '<div class="no-results">Belum ada skor</div>';
      return;
    }

    scores.forEach((score, index) => {
      const rank = index + 1;
      const entry = document.createElement('div');
      entry.className = `leaderboard-entry rank-${Math.min(rank, 3)}`;

      const rankDiv = document.createElement('div');
      rankDiv.className = 'leaderboard-rank';
      rankDiv.textContent = rank;

      const nameDiv = document.createElement('div');
      nameDiv.className = 'leaderboard-name';
      nameDiv.textContent = score.username || 'Anonymous';

      const scoreDiv = document.createElement('div');
      scoreDiv.className = 'leaderboard-score';
      scoreDiv.textContent = score.score;

      entry.appendChild(rankDiv);
      entry.appendChild(nameDiv);
      entry.appendChild(scoreDiv);

      leaderboardList.appendChild(entry);
    });
  }

  async function showLeaderboard() {
    playSwoosh();
    menu.style.display = 'none';
    leaderboardScreen.style.display = 'flex';
    leaderboardScreen.style.background = `url('assets/background-${currentBg}.png') center/cover`;

    // Fetch and display data
    const data = await fetchLeaderboard();
    displayLeaderboard(data);
  }

  function hideLeaderboard() {
    playSwoosh();
    leaderboardScreen.style.display = 'none';
    menu.style.display = 'flex';
  }

  // High Score Submission
  async function submitHighScore(playerName, score) {
    try {
      const response = await fetch(`${API_URL}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: playerName, score: score })
      });

      if (response.ok) {
        highScoreInput.style.display = 'none';
        // For new users, keep the "Skor Tinggi Baru" message
        // For returning users, show success message
        const savedUsername = sessionStorage.getItem(sessionUsernameKey);
        if (savedUsername) {
          // This is a returning user, show success message
          highScoreSection.innerHTML = '<p class="ranking-text" style="color: #4CAF50;">Skor berhasil dikirim ke leaderboard!</p>';
        }
        // For new users, keep the existing "Skor Tinggi Baru" message

        // Refresh leaderboard if it's currently shown
        if (leaderboardScreen.style.display === 'flex') {
          const data = await fetchLeaderboard();
          displayLeaderboard(data);
        }
      } else {
        highScoreSection.innerHTML = '<p class="ranking-text" style="color: #f44336;">Gagal mengirim skor.</p>';
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      highScoreSection.innerHTML = '<p class="ranking-text" style="color: #f44336;">Gagal terhubung ke server.</p>';
    }
  }

  function handleSubmitScore() {
    const playerName = playerNameInput.value.trim();
    if (playerName.length < 1 || playerName.length > 20) {
      alert('Nama harus 1-20 karakter.');
      return;
    }

    // Save username to session storage for this session
    sessionStorage.setItem(sessionUsernameKey, playerName);

    const currentScore = score; // Use the global score variable
    submitHighScore(playerName, currentScore);
    playerNameInput.value = '';
  }

  // GAME OVER
  async function gameOver(){
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

    // Check if this is a high score (top 5)
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      if (response.ok) {
        const leaderboard = await response.json();
        const isHighScore = leaderboard.length < 5 || score > Math.min(...leaderboard.map(s => s.score));

        if (isHighScore) {
          // Check if username exists in session storage
          const savedUsername = sessionStorage.getItem(sessionUsernameKey);
          if (savedUsername) {
            // User already has username, auto-submit score
            highScoreInput.style.display = 'none';
            highScoreSection.innerHTML = '<p class="ranking-text" style="color: #FFD700;">🎉 Skor Tinggi Baru!</p>';
            submitHighScore(savedUsername, score);
          } else {
            // First time, show input UI
            highScoreInput.style.display = 'block';
            playerNameInput.value = '';
            playerNameInput.focus();
            highScoreSection.innerHTML = '';
          }
        } else {
          highScoreInput.style.display = 'none';
          highScoreSection.innerHTML = '';
        }
      }
    } catch (error) {
      console.error('Error checking leaderboard:', error);
      highScoreInput.style.display = 'none';
      highScoreSection.innerHTML = '';
    }
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
  function loop(){
   if (!gameRunning || gamePaused) return;
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
     const speedMultiplier = 1 + 0.1 * Math.floor(score / 20);
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
    drawScore(score, vw/2, vh * 0.08);
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
  leaderboardBtn.addEventListener('click', showLeaderboard);
  leaderboardBackBtn.addEventListener('click', hideLeaderboard);
  submitScoreBtn.addEventListener('click', handleSubmitScore);
  playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSubmitScore();
    }
  });

  // prevent scroll when interacting with canvas/touchControl
  ['touchmove'].forEach(ev=>{
    document.addEventListener(ev, function(e){
      if (e.target === canvas) e.preventDefault();
    }, { passive: false });
  });


  // init visuals
  setMenuBackground();
  createParticles();
  setInterval(createParticles, 10000);

  // Clear session storage for fresh start each time
  sessionStorage.removeItem(sessionUsernameKey);

  // initial canvas and menu
  resizeCanvas();
  backToMenu();
});
