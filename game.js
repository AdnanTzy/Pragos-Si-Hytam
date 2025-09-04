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

// Ukuran fix portrait
canvas.width = 360;
canvas.height = 640;

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

// Variabel game
let bird, pipes, score, gameRunning, gamePaused;
const gravity = 0.25;
const jump = 4.6;
let pipeGap = 160;
const groundHeight = 100;
let currentBg = Math.random() > 0.5 ? "day" : "night"; // Random background di menu
let bgCycleTimer;
let groundOffset = 0;

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
  bird = { x: 50, y: 150, width: 72, height: 54, velocity: 0, rotation: 0 };
}

// ===== START GAME =====
function startGame() {
  const heroChoice = document.querySelector('input[name="hero"]:checked').value;
  selectedHero = heroChoice;
  birdImg.src = heroes[selectedHero];

  menu.style.display = "none";
  gameWrapper.style.display = "block";
  gameOverScreen.style.display = "none";
  pauseMenu.style.display = "none";

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

  canvas.addEventListener("click", flap);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") flap();
  });
  
  loop();
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
  bird.rotation = -20; // Rotasi ke atas saat flap
  wingSound.play();
}

// ===== DRAW SCORE =====
function drawScore(score, x, y) {
  const digits = score.toString().split('');
  let totalWidth = digits.length * 24;
  let startX = x - totalWidth / 2;

  digits.forEach(d => {
    ctx.drawImage(numbers[parseInt(d)], startX, y, 24, 36);
    startX += 24;
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
}

// ===== GAME LOOP =====
function loop() {
  if (!gameRunning || gamePaused) return;

  // Draw background
  ctx.drawImage(currentBg === "day" ? bgDay : bgNight, 0, 0, canvas.width, canvas.height);

  // Generate new pipes
  if (pipes.length === 0 || pipes[pipes.length-1].x < canvas.width - 200) {
    let pipeY = Math.floor(Math.random() * (canvas.height - pipeGap - groundHeight - 50)) + 20;
    pipes.push({ x: canvas.width, y: pipeY, passed: false });
  }

  // Update and draw pipes
  pipes.forEach((p, i) => {
    // Draw top pipe (flipped)
    ctx.save();
    ctx.translate(p.x + pipeImg.width/2, p.y - pipeImg.height/2);
    ctx.scale(1, -1);
    ctx.drawImage(pipeImg, -pipeImg.width/2, -pipeImg.height/2);
    ctx.restore();
    
    // Draw bottom pipe
    ctx.drawImage(pipeImg, p.x, p.y + pipeGap);
    
    // Move pipe
    p.x -= 2;

    // Collision detection
    let hitbox = { x: bird.x+bird.width*0.1, y: bird.y+bird.height*0.1, w: bird.width*0.8, h: bird.height*0.8 };
    if (hitbox.x + hitbox.w > p.x && hitbox.x < p.x + pipeImg.width && 
        (hitbox.y < p.y || hitbox.y + hitbox.h > p.y + pipeGap)) {
      return gameOver();
    }

    // Score point when passing pipe
    if (!p.passed && p.x + pipeImg.width < bird.x) {
      p.passed = true;
      score++;
      scoreDisplay.textContent = score;
      pointSound.play();
    }

    // Remove off-screen pipes
    if (p.x + pipeImg.width < 0) pipes.splice(i, 1);
  });

  // Draw scrolling ground
  groundOffset = (groundOffset - 2) % 100;
  ctx.drawImage(ground, groundOffset, canvas.height - groundHeight, canvas.width, groundHeight);
  ctx.drawImage(ground, groundOffset + canvas.width, canvas.height - groundHeight, canvas.width, groundHeight);

  // Update bird physics
  bird.velocity += gravity;
  bird.y += bird.velocity;
  
  // Rotate bird based on velocity
  bird.rotation = Math.min(90, bird.rotation + 2); // Gradually rotate downward
  if (bird.velocity < 0) bird.rotation = Math.max(-20, bird.rotation - 5); // Rotate upward when flapping

  // Draw bird with rotation
  ctx.save();
  ctx.translate(bird.x + bird.width/2, bird.y + bird.height/2);
  ctx.rotate(bird.rotation * Math.PI/180);
  ctx.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
  ctx.restore();

  // Ground collision
  let hitbox = { x: bird.x+bird.width*0.1, y: bird.y+bird.height*0.1, w: bird.width*0.8, h: bird.height*0.8 };
  if (hitbox.y + hitbox.h >= canvas.height - groundHeight) {
    return gameOver();
  }

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

// Initialize menu background and particles
setMenuBackground();
createParticles();
setInterval(createParticles, 10000); // Recreate particles every 10 seconds