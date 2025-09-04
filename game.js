// ===== DETEKSI ORIENTASI =====
function checkOrientation() {
  if (window.innerWidth > window.innerHeight) {
    // Landscape mode - tampilkan peringatan
    document.getElementById('orientationWarning').style.display = 'flex';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameWrapper').style.display = 'none';
  } else {
    // Portrait mode - sembunyikan peringatan
    document.getElementById('orientationWarning').style.display = 'none';
    document.getElementById('menu').style.display = 'flex';
  }
}

// Initial check
checkOrientation();

// Listen for orientation changes
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

// ===== INISIALISASI =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const gameWrapper = document.getElementById("gameWrapper");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");
const finalBestScore = document.getElementById("finalBestScore");
const scoreDisplay = document.getElementById("scoreDisplay");
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

// Ukuran canvas menyesuaikan layar (portrait)
function resizeCanvas() {
  // Untuk portrait, kita gunakan fixed width dan scale height
  const targetWidth = Math.min(420, window.innerWidth);
  const targetHeight = Math.min(700, window.innerHeight);
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  // Adjust game elements based on screen size
  if (bird) {
    // Scale bird size based on screen
    const baseBirdWidth = 34 * (targetWidth / 360);
    const baseBirdHeight = 24 * (targetHeight / 640);
    bird.width = baseBirdWidth;
    bird.height = baseBirdHeight;
  }
}

// Initial resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ===== ASSETS & VARIABEL =====
const bgDay = new Image();
bgDay.src = "assets/background-day.png";
const bgNight = new Image();
bgNight.src = "assets/background-night.png";
const ground = new Image();
ground.src = "assets/base.png";
const pipeImg = new Image();
pipeImg.src = "assets/pipe-green.png";
const numbers = [];
for (let i = 0; i <= 9; i++) {
  const img = new Image();
  img.src = `assets/${i}.png`;
  numbers.push(img);
}
const heroes = {
  Pragos: "assets/Pragos.png",
  Nikskuy: "assets/Nikskuy.png",
  Fakriskuy: "assets/Fakriskuy.png"
};
let selectedHero = "Pragos";
let birdImg = new Image();
birdImg.src = heroes[selectedHero];

// Audio
const wingSound = new Audio("audio/wing.wav");
const pointSound = new Audio("audio/point.wav");
const hitSound = new Audio("audio/hit.wav");
const dieSound = new Audio("audio/die.wav");
const swooshSound = new Audio("audio/swoosh.wav");

// Preload audio
[wingSound, pointSound, hitSound, dieSound].forEach(sound => {
  sound.preload = 'auto';
  sound.load();
});

// Variabel game
let bird, pipes, score, gameRunning, gamePaused;
const gravity = 0.5;
const jump = 7;
let pipeGap = 150;
const groundHeight = 80;
let currentBg = Math.random() > 0.5 ? "day" : "night";
let bgCycleTimer;
let groundOffset = 0;
let pipeSpeed = 2.5;
let lastTapTime = 0;
const tapDelay = 300; // ms

// High score unik per device
const deviceKey = btoa(navigator.userAgent + screen.width + "x" + screen.height);
const storageKey = "flappyHighScore_" + deviceKey;
let highScore = parseInt(localStorage.getItem(storageKey)) || 0;
bestScoreText.textContent = `Best Score: ${highScore}`;

// ===== PARTICLE EFFECT =====
function createParticles() {
  particlesContainer.innerHTML = '';
  const particleCount = 15;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random properties
    const size = Math.random() * 4 + 2;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = Math.random() * 5 + 5;
    const opacity = Math.random() * 0.5 + 0.1;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.opacity = opacity;
    
    particlesContainer.appendChild(particle);
  }
}

// ===== SET BACKGROUND =====
function setMenuBackground() {
  menu.style.background = `url('assets/background-${currentBg}.png') center/cover`;
  menu.style.animation = "bgScroll 20s linear infinite";
}

// ===== RESET BIRD =====
function resetBird() {
  const birdWidth = 34;
  const birdHeight = 24;
  bird = { 
    x: canvas.width * 0.2, 
    y: canvas.height / 2 - birdHeight / 2, 
    width: birdWidth, 
    height: birdHeight, 
    velocity: 0, 
    rotation: 0 
  };
}

// ===== START GAME =====
function startGame() {
  if (window.innerWidth > window.innerHeight) {
    alert("Putar perangkat ke mode portrait untuk pengalaman bermain terbaik!");
    return;
  }

  const heroChoice = document.querySelector('input[name="hero"]:checked').value;
  selectedHero = heroChoice;
  birdImg.src = heroes[selectedHero];

  menu.style.display = "none";
  gameWrapper.style.display = "block";
  gameOverScreen.style.display = "none";
  pauseMenu.style.display = "none";
  touchControl.style.display = "block";

  resetBird();
  pipes = [];
  score = 0;
  gameRunning = true;
  gamePaused = false;
  scoreDisplay.textContent = "0";

  // Set background secara acak
  currentBg = Math.random() > 0.5 ? "day" : "night";
  
  bgCycleTimer = setInterval(() => {
    currentBg = currentBg === "day" ? "night" : "day";
  }, 20000);

  // Enable touch controls
  enableTouchControls();
  
  loop();
}

// ===== TOUCH CONTROLS =====
function enableTouchControls() {
  // Clear previous event listeners
  canvas.removeEventListener("click", flap);
  touchControl.removeEventListener("touchstart", handleTouch);
  document.removeEventListener("keydown", handleKeyDown);
  
  // Add new event listeners
  canvas.addEventListener("click", flap);
  touchControl.addEventListener("touchstart", handleTouch, { passive: false });
  document.addEventListener("keydown", handleKeyDown);
}

function handleTouch(e) {
  e.preventDefault();
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTapTime;
  
  if (tapLength < tapDelay && tapLength > 0) {
    // Double tap detected, ignore to prevent accidental flaps
    return;
  }
  
  lastTapTime = currentTime;
  flap();
}

function handleKeyDown(e) {
  if (e.code === "Space") {
    flap();
  }
}

// ===== RESTART =====
function restartGame() {
  startGame();
}

// ===== BACK TO MENU =====
function backToMenu() {
  gameRunning = false;
  clearInterval(bgCycleTimer);
  gameWrapper.style.display = "none";
  touchControl.style.display = "none";
  menu.style.display = "flex";
  setMenuBackground();
  bestScoreText.textContent = `Best Score: ${highScore}`;
}

// ===== PAUSE GAME =====
function togglePause() {
  if (!gameRunning) return;
  
  gamePaused = !gamePaused;
  if (gamePaused) {
    pauseMenu.style.display = "flex";
  } else {
    pauseMenu.style.display = "none";
    loop();
  }
}

// ===== BIRD FLAP =====
function flap() {
  if (!gameRunning || gamePaused) return;
  bird.velocity = -jump;
  bird.rotation = -30; // Rotasi ke atas saat flap
  wingSound.play();
}

// ===== DRAW SCORE =====
function drawScore(score, x, y) {
  const digits = score.toString().split('');
  const digitWidth = 20;
  const digitHeight = 30;
  let totalWidth = digits.length * digitWidth;
  let startX = x - totalWidth / 2;

  digits.forEach(d => {
    ctx.drawImage(numbers[parseInt(d)], startX, y, digitWidth, digitHeight);
    startX += digitWidth;
  });
}

// ===== GAME OVER =====
function gameOver() {
  gameRunning = false;
  clearInterval(bgCycleTimer);

  hitSound.play();
  setTimeout(() => dieSound.play(), 300);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem(storageKey, highScore);
  }

  finalScore.textContent = `Skor: ${score}`;
  finalBestScore.textContent = `Rekor: ${highScore}`;
  gameOverScreen.style.display = "flex";
  touchControl.style.display = "none";
}

// ===== GAME LOOP =====
function loop() {
  if (!gameRunning || gamePaused) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background (scaled to fit)
  const bgAspect = bgDay.width / bgDay.height;
  const bgHeight = canvas.height;
  const bgWidth = bgHeight * bgAspect;
  const bgX = (canvas.width - bgWidth) / 2;
  
  ctx.drawImage(currentBg === "day" ? bgDay : bgNight, bgX, 0, bgWidth, bgHeight);

  // Generate new pipes
  if (pipes.length === 0 || pipes[pipes.length-1].x < canvas.width - 200) {
    const minPipeY = canvas.height * 0.15;
    const maxPipeY = canvas.height * 0.7 - pipeGap;
    let pipeY = Math.floor(Math.random() * (maxPipeY - minPipeY)) + minPipeY;
    
    pipes.push({ 
      x: canvas.width, 
      y: pipeY, 
      passed: false,
      width: 52,
      height: 320
    });
  }

  // Update and draw pipes
  pipes.forEach((p, i) => {
    const pipeWidth = p.width;
    const pipeHeight = p.height;
    
    // Draw top pipe (flipped)
    ctx.save();
    ctx.translate(p.x + pipeWidth/2, p.y - pipeHeight/2);
    ctx.scale(1, -1);
    ctx.drawImage(pipeImg, -pipeWidth/2, -pipeHeight/2, pipeWidth, pipeHeight);
    ctx.restore();
    
    // Draw bottom pipe
    ctx.drawImage(pipeImg, p.x, p.y + pipeGap, pipeWidth, pipeHeight);
    
    // Move pipe
    p.x -= pipeSpeed;

    // Collision detection
    let hitbox = { 
      x: bird.x + bird.width * 0.2, 
      y: bird.y + bird.height * 0.2, 
      w: bird.width * 0.6, 
      h: bird.height * 0.6 
    };
    
    if (hitbox.x + hitbox.w > p.x && 
        hitbox.x < p.x + pipeWidth && 
        (hitbox.y < p.y || hitbox.y + hitbox.h > p.y + pipeGap)) {
      return gameOver();
    }

    // Score point when passing pipe
    if (!p.passed && p.x + pipeWidth < bird.x) {
      p.passed = true;
      score++;
      scoreDisplay.textContent = score;
      pointSound.play();
    }

    // Remove off-screen pipes
    if (p.x + pipeWidth < 0) pipes.splice(i, 1);
  });

  // Draw scrolling ground
  groundOffset = (groundOffset - pipeSpeed) % canvas.width;
  const groundY = canvas.height - groundHeight;
  const groundAspect = ground.width / ground.height;
  const drawGroundHeight = groundHeight;
  const drawGroundWidth = drawGroundHeight * groundAspect;
  
  ctx.drawImage(ground, groundOffset, groundY, drawGroundWidth, drawGroundHeight);
  ctx.drawImage(ground, groundOffset + drawGroundWidth, groundY, drawGroundWidth, drawGroundHeight);

  // Update bird physics
  bird.velocity += gravity;
  bird.y += bird.velocity;
  
  // Rotate bird based on velocity
  bird.rotation = Math.min(90, bird.rotation + 2.5); // Gradually rotate downward
  if (bird.velocity < 0) bird.rotation = Math.max(-30, bird.rotation - 6); // Rotate upward when flapping

  // Draw bird with rotation
  ctx.save();
  ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
  ctx.rotate(bird.rotation * Math.PI/180);
  ctx.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
  ctx.restore();

  // Ground collision
  let hitbox = { 
    x: bird.x + bird.width * 0.2, 
    y: bird.y + bird.height * 0.2, 
    w: bird.width * 0.6, 
    h: bird.height * 0.6 
  };
  
  if (hitbox.y + hitbox.h >= canvas.height - groundHeight) {
    return gameOver();
  }

  // Ceiling collision
  if (bird.y < 0) {
    bird.y = 0;
    bird.velocity = 0;
  }

  // Draw score
  drawScore(score, canvas.width/2, 50);

  requestAnimationFrame(loop);
}

// ===== EVENT LISTENERS =====
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
restartBtnGameOver.addEventListener("click", restartGame);
mainMenuBtn.addEventListener("click", backToMenu);
menuBtn.addEventListener("click", backToMenu);
heroBtn.addEventListener("click", () => {
  heroSelect.style.display = heroSelect.style.display === "none" ? "flex" : "none";
});
pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);

// Prevent default touch behavior
document.addEventListener('touchstart', function(e) {
  if (e.target === canvas || e.target === touchControl) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchmove', function(e) {
  if (e.target === canvas || e.target === touchControl) {
    e.preventDefault();
  }
}, { passive: false });

// Initialize menu background and particles
setMenuBackground();
createParticles();
setInterval(createParticles, 10000); // Recreate particles every 10 seconds