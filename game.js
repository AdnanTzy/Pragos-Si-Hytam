// ===== DETEKSI ORIENTASI =====
function checkOrientation() {
  if (window.innerHeight > window.innerWidth) {
    // Portrait mode
    document.getElementById('orientationWarning').style.display = 'flex';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('gameWrapper').style.display = 'none';
  } else {
    // Landscape mode
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

// Ukuran canvas menyesuaikan layar
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Adjust game elements based on screen size
  if (bird) {
    // Scale bird size based on screen
    const baseBirdWidth = 72 * (window.innerWidth / 360);
    const baseBirdHeight = 54 * (window.innerHeight / 640);
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
let pipeGap = 200 * (canvas.height / 640);
const groundHeight = 100 * (canvas.height / 640);
let currentBg = Math.random() > 0.5 ? "day" : "night";
let bgCycleTimer;
let groundOffset = 0;
let pipeSpeed = 3 * (canvas.width / 360);
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
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random properties
    const size = Math.random() * 5 + 2;
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
  const birdWidth = 72 * (canvas.width / 360);
  const birdHeight = 54 * (canvas.height / 640);
  bird = { 
    x: canvas.width * 0.15, 
    y: canvas.height / 2 - birdHeight / 2, 
    width: birdWidth, 
    height: birdHeight, 
    velocity: 0, 
    rotation: 0 
  };
}

// ===== START GAME =====
function startGame() {
  if (window.innerHeight > window.innerWidth) {
    alert("Putar perangkat ke mode landscape untuk pengalaman bermain terbaik!");
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

  // Update sizes based on current canvas dimensions
  pipeGap = 200 * (canvas.height / 640);
  pipeSpeed = 3 * (canvas.width / 360);

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
  const digitWidth = 24 * (canvas.width / 360);
  const digitHeight = 36 * (canvas.height / 640);
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
  setTimeout }
