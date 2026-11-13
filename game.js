const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const restartButton = document.querySelector("#restart");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WORLD_WIDTH = 3300;
const GRAVITY = 1800;
const MOVE_SPEED = 300;
const JUMP_SPEED = 690;

const platforms = [
  { x: 0, y: 460, width: 620, height: 100 },
  { x: 750, y: 460, width: 610, height: 100 },
  { x: 1490, y: 460, width: 660, height: 100 },
  { x: 2290, y: 460, width: 1010, height: 100 },
  { x: 930, y: 365, width: 150, height: 20 },
  { x: 1740, y: 350, width: 170, height: 20 },
  { x: 2510, y: 370, width: 150, height: 20 },
];

const spikes = [
  { x: 420, y: 428, width: 42, height: 32 },
  { x: 1120, y: 428, width: 42, height: 32 },
  { x: 1580, y: 428, width: 42, height: 32 },
  { x: 1970, y: 428, width: 42, height: 32 },
  { x: 2460, y: 428, width: 42, height: 32 },
  { x: 2810, y: 428, width: 42, height: 32 },
];

const player = {
  x: 80,
  y: 0,
  width: 34,
  height: 46,
  velocityX: 0,
  velocityY: 0,
  grounded: false,
};

const keys = new Set();
const touchControls = new Set();
let cameraX = 0;
let gameState = "playing";
let jumpRequested = false;
let previousTime = 0;

function resetGame() {
  player.x = 80;
  player.y = 460 - player.height;
  player.velocityX = 0;
  player.velocityY = 0;
  player.grounded = true;
  cameraX = 0;
  gameState = "playing";
  jumpRequested = false;
}

function isPressed(...codes) {
  return codes.some((code) => keys.has(code));
}

function overlaps(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function movePlayer(delta) {
  const movingLeft = isPressed("ArrowLeft", "KeyA") || touchControls.has("left");
  const movingRight = isPressed("ArrowRight", "KeyD") || touchControls.has("right");
  player.velocityX = (Number(movingRight) - Number(movingLeft)) * MOVE_SPEED;

  if (jumpRequested && player.grounded) {
    player.velocityY = -JUMP_SPEED;
    player.grounded = false;
  }
  jumpRequested = false;

  const previousX = player.x;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x + player.velocityX * delta));

  for (const platform of platforms) {
    if (!overlaps(player, platform)) continue;
    if (player.velocityX > 0) player.x = platform.x - player.width;
    if (player.velocityX < 0) player.x = platform.x + platform.width;
  }

  const previousBottom = player.y + player.height;
  player.velocityY += GRAVITY * delta;
  player.y += player.velocityY * delta;
  player.grounded = false;

  for (const platform of platforms) {
    const horizontallyOverlapping = player.x < platform.x + platform.width
      && player.x + player.width > platform.x;
    if (!horizontallyOverlapping) continue;

    if (player.velocityY >= 0 && previousBottom <= platform.y && player.y + player.height >= platform.y) {
      player.y = platform.y - player.height;
      player.velocityY = 0;
      player.grounded = true;
    } else if (player.velocityY < 0 && player.y <= platform.y + platform.height
      && player.y + player.height > platform.y + platform.height) {
      player.y = platform.y + platform.height;
      player.velocityY = 0;
    }
  }

  for (const spike of spikes) {
    if (overlaps(player, spike)) {
      gameState = "gameover";
      break;
    }
  }

  if (player.y > HEIGHT + 100) gameState = "gameover";
  if (player.x > WORLD_WIDTH - 140) gameState = "clear";

  const targetCameraX = Math.max(0, Math.min(WORLD_WIDTH - WIDTH, player.x - WIDTH * 0.35));
  cameraX += (targetCameraX - cameraX) * Math.min(1, delta * 8);

  if (previousX === player.x && player.velocityX !== 0) player.velocityX = 0;
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#75c9e8");
  sky.addColorStop(1, "#d5f1e8");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = "#ffffff66";
  for (const cloud of [
    { x: 150, y: 110 },
    { x: 510, y: 85 },
    { x: 850, y: 145 },
  ]) {
    const x = ((cloud.x - cameraX * 0.2) % (WIDTH + 180) + WIDTH + 180) % (WIDTH + 180) - 90;
    context.beginPath();
    context.ellipse(x, cloud.y, 48, 14, 0, 0, Math.PI * 2);
    context.ellipse(x - 20, cloud.y + 2, 22, 12, 0, 0, Math.PI * 2);
    context.ellipse(x + 22, cloud.y + 2, 24, 11, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "#83c6a9";
  context.beginPath();
  context.moveTo(0, 390);
  for (let x = 0; x <= WIDTH + 80; x += 80) {
    const hillY = 365 + Math.sin((x + cameraX * 0.12) / 110) * 28;
    context.lineTo(x, hillY);
  }
  context.lineTo(WIDTH, HEIGHT);
  context.lineTo(0, HEIGHT);
  context.fill();
}

function drawPlatform(platform) {
  const x = platform.x - cameraX;
  if (x + platform.width < 0 || x > WIDTH) return;

  context.fillStyle = "#79513f";
  context.fillRect(x, platform.y, platform.width, platform.height);
  context.fillStyle = "#52a75d";
  context.fillRect(x, platform.y, platform.width, 12);
  context.fillStyle = "#9c6a4b";
  for (let brickX = x + 12; brickX < x + platform.width; brickX += 42) {
    context.fillRect(brickX, platform.y + 29, 22, 8);
    context.fillRect(brickX + 16, platform.y + 62, 22, 8);
  }
}

function drawSpikes() {
  for (const spike of spikes) {
    const x = spike.x - cameraX;
    if (x + spike.width < 0 || x > WIDTH) continue;
    context.fillStyle = "#e85e68";
    context.beginPath();
    context.moveTo(x, spike.y + spike.height);
    context.lineTo(x + spike.width / 2, spike.y);
    context.lineTo(x + spike.width, spike.y + spike.height);
    context.closePath();
    context.fill();
    context.strokeStyle = "#a93d50";
    context.lineWidth = 3;
    context.stroke();
  }
}

function drawPlayer() {
  const x = player.x - cameraX;
  context.fillStyle = "#26325333";
  context.beginPath();
  context.ellipse(x + player.width / 2, player.y + player.height + 4, 20, 6, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f4a340";
  context.fillRect(x + 3, player.y + 10, player.width - 6, player.height - 10);
  context.fillStyle = "#e77a52";
  context.fillRect(x, player.y + 4, player.width, 17);
  context.fillStyle = "#fff4d8";
  context.fillRect(x + 19, player.y + 14, 7, 8);
  context.fillStyle = "#263253";
  context.fillRect(x + 23, player.y + 16, 3, 5);
  context.fillStyle = "#34466e";
  context.fillRect(x + 5, player.y + player.height - 5, 10, 7);
  context.fillRect(x + 21, player.y + player.height - 5, 10, 7);
}

function drawGoal() {
  const x = WORLD_WIDTH - 150 - cameraX;
  context.fillStyle = "#4d5874";
  context.fillRect(x, 300, 8, 160);
  context.fillStyle = "#ffd166";
  context.beginPath();
  context.moveTo(x + 8, 302);
  context.lineTo(x + 76, 324);
  context.lineTo(x + 8, 346);
  context.closePath();
  context.fill();
  context.fillStyle = "#fff2bf";
  context.font = "bold 15px system-ui, sans-serif";
  context.fillText("GOAL", x + 17, 330);
}

function drawHud() {
  const progress = Math.min(1, player.x / (WORLD_WIDTH - 140));
  context.fillStyle = "#17213dcc";
  context.fillRect(20, 20, 210, 46);
  context.fillStyle = "#f5f7ff";
  context.font = "bold 15px system-ui, sans-serif";
  context.fillText("ゴールまで", 32, 39);
  context.fillStyle = "#43516e";
  context.fillRect(32, 47, 184, 8);
  context.fillStyle = "#ffd166";
  context.fillRect(32, 47, 184 * progress, 8);
}

function drawEndMessage(title, detail) {
  context.fillStyle = "#10172bcc";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = "bold 48px system-ui, sans-serif";
  context.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
  context.fillStyle = "#d7e0f7";
  context.font = "18px system-ui, sans-serif";
  context.fillText(detail, WIDTH / 2, HEIGHT / 2 + 28);
  context.textAlign = "start";
}

function draw() {
  drawBackground();
  for (const platform of platforms) drawPlatform(platform);
  drawSpikes();
  drawGoal();
  drawPlayer();
  drawHud();

  if (gameState === "gameover") drawEndMessage("もう一度挑戦！", "Rキーまたは「最初から」で再スタート");
  if (gameState === "clear") drawEndMessage("クリア！", "ゴールに到着しました。もう一度遊ぶなら R キー");
}

function frame(time) {
  const delta = Math.min((time - previousTime) / 1000 || 0, 1 / 30);
  previousTime = time;
  if (gameState === "playing") movePlayer(delta);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
  if (!keys.has(event.code) && ["Space", "ArrowUp", "KeyW"].includes(event.code)) jumpRequested = true;
  keys.add(event.code);
  if (event.code === "KeyR") resetGame();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  keys.clear();
  touchControls.clear();
});
restartButton.addEventListener("click", resetGame);

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    if (control === "jump") jumpRequested = true;
    else touchControls.add(control);
  });
  const release = () => touchControls.delete(control);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

resetGame();
requestAnimationFrame(frame);
