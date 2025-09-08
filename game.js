// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -9; // Slightly increased jump height
const MOVE_SPEED = 5; // Increased move speed
const BLOCK_SIZE = 32;
const PLAYER_SIZE = 24;

// Game state
let gameState = {
    running: true,
    won: false,
    blocksRemaining: 3, // Remaining blocks this level
    maxBlocks: 3,       // Permanent capacity (increases with stars)
    coins: 0,
    currentLevel: 1,
    levelComplete: false,
    blocksUsed: 0,
    showLevelTransition: false,
    starsThisLevel: 0
};

// Input handling
const keys = {
    left: false,
    right: false,
    jump: false,
    build: false
};

// Player object
const player = {
    x: 50,
    y: 300,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    justLanded: false,
    color: '#ff6b6b'
};

// Level data structure
const levels = {
    1: {
        platforms: [
            { x: 0, y: 368, width: 200, height: 32, color: '#8B4513' }, // Starting platform
            { x: 300, y: 320, width: 100, height: 32, color: '#8B4513' }, // First gap platform
            { x: 500, y: 280, width: 80, height: 32, color: '#8B4513' }, // Second platform
            { x: 700, y: 240, width: 100, height: 32, color: '#8B4513' }, // Third platform
            { x: 900, y: 200, width: 80, height: 32, color: '#8B4513' }, // Fourth platform
            { x: 1100, y: 160, width: 100, height: 32, color: '#8B4513' }, // Fifth platform
            { x: 1300, y: 120, width: 100, height: 32, color: '#8B4513' }, // Sixth platform
            { x: 1420, y: 88, width: 60, height: 32, color: '#8B4513' }, // Platform near goal
            { x: 0, y: 368, width: 1500, height: 32, color: '#8B4513' } // Ground
        ],
        obstacles: [
            { x: 250, y: 350, width: 32, height: 18, type: 'spike', color: '#8B0000' },
            { x: 282, y: 350, width: 32, height: 18, type: 'spike', color: '#8B0000' },
            { x: 450, y: 310, width: 32, height: 18, type: 'spike', color: '#8B0000' },
            { x: 650, y: 270, width: 32, height: 18, type: 'spike', color: '#8B0000' },
            { x: 850, y: 230, width: 32, height: 18, type: 'spike', color: '#8B0000' },
            { x: 1050, y: 190, width: 32, height: 18, type: 'spike', color: '#8B0000' },
            { x: 1250, y: 150, width: 32, height: 18, type: 'spike', color: '#8B0000' }
        ],
        coins: [
            { x: 150, y: 320, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 350, y: 280, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 550, y: 240, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 750, y: 200, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 950, y: 160, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 1150, y: 120, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 1350, y: 80, width: 16, height: 16, collected: false, color: '#FFD700' },
            { x: 1430, y: 48, width: 16, height: 16, collected: false, color: '#FFD700' }
        ],
        enemies: [],
        endGoal: { x: 1450, y: 56, width: 32, height: 32, color: '#4CAF50' },
        playerStart: { x: 50, y: 300 },
        levelWidth: 1500
    },
    2: null // Will be generated procedurally
};

// Current level data (will be set based on currentLevel)
let currentLevelData = levels[1];
let platforms = currentLevelData.platforms;
let obstacles = currentLevelData.obstacles;
let coins = currentLevelData.coins;
let enemies = currentLevelData.enemies;
let endGoal = currentLevelData.endGoal;

// Buildable blocks array
const buildableBlocks = [];

// Per-level star (single instance)
let levelStar = null; // { x, y, width, height, collected, color }

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameStatus = document.getElementById('game-status');
const blockCount = document.getElementById('block-count');
const maxBlocksDisplay = document.getElementById('max-blocks');
const coinCount = document.getElementById('coin-count');
const totalCoinsDisplay = document.getElementById('total-coins');
const currentLevelDisplay = document.getElementById('current-level');
const starCount = document.getElementById('star-count');
const totalStarsDisplay = document.getElementById('total-stars');

// Helper to refresh block counters
function updateBlockCounters() {
    if (blockCount) blockCount.textContent = gameState.blocksRemaining;
    if (maxBlocksDisplay) maxBlocksDisplay.textContent = gameState.maxBlocks;
}

// Audio setup
let audioContext;
let backgroundMusic;
let isMusicPlaying = false;

// Initialize audio context
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

// 8-bit sound effects
function playSound(frequency, duration, type = 'square', volume = 0.1) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Sound effects
function playJumpSound() {
    playSound(440, 0.1, 'square', 0.15);
}

function playCoinSound() {
    playSound(880, 0.2, 'sine', 0.2);
    setTimeout(() => playSound(1100, 0.2, 'sine', 0.15), 100);
}

function playDeathSound() {
    playSound(200, 0.5, 'sawtooth', 0.3);
    setTimeout(() => playSound(150, 0.3, 'sawtooth', 0.2), 200);
    setTimeout(() => playSound(100, 0.4, 'sawtooth', 0.1), 400);
}

function playBuildSound() {
    playSound(330, 0.15, 'square', 0.1);
    setTimeout(() => playSound(440, 0.15, 'square', 0.1), 50);
}

function playWinSound() {
    // Victory fanfare
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((note, index) => {
        setTimeout(() => playSound(note, 0.3, 'sine', 0.2), index * 150);
    });
}

// Star collect sound
function playStarSound() {
    // Quick ascending chime
    [740, 880, 1175].forEach((f, i) => setTimeout(() => playSound(f, 0.12, 'triangle', 0.2), i * 80));
}

// Background music (8-bit style inspired by Mega Man and Pizza Tower)
function playBackgroundMusic() {
    if (!audioContext || isMusicPlaying) return;
    
    isMusicPlaying = true;
    const melody = [
        { freq: 523, duration: 0.3 }, // C5
        { freq: 659, duration: 0.3 }, // E5
        { freq: 784, duration: 0.3 }, // G5
        { freq: 659, duration: 0.3 }, // E5
        { freq: 523, duration: 0.3 }, // C5
        { freq: 440, duration: 0.3 }, // A4
        { freq: 523, duration: 0.6 }, // C5
        { freq: 0, duration: 0.3 },   // Rest
    ];
    
    function playMelody() {
        if (!isMusicPlaying) return;
        
        melody.forEach((note, index) => {
            setTimeout(() => {
                if (note.freq > 0) {
                    playSound(note.freq, note.duration, 'square', 0.05);
                }
            }, index * 300);
        });
        
        setTimeout(playMelody, melody.length * 300 + 500);
    }
    
    playMelody();
}

function stopBackgroundMusic() {
    isMusicPlaying = false;
}

// Input event listeners
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'ArrowRight':
            keys.right = true;
            break;
        case 'Space':
            e.preventDefault();
            if (gameState.showLevelTransition) {
                // Start level 2
                gameState.currentLevel = 2;
                loadLevel(2);
            } else {
                keys.jump = true;
            }
            break;
        case 'KeyB':
            keys.build = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
        case 'Space':
            keys.jump = false;
            break;
        case 'KeyB':
            keys.build = false;
            break;
    }
});

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Check collision with platforms
function checkPlatformCollision() {
    player.onGround = false;
    
    // Check all platforms (static + buildable)
    const allPlatforms = [...platforms, ...buildableBlocks];
    
    for (let platform of allPlatforms) {
        if (checkCollision(player, platform)) {
            // Landing on top of platform
            if (player.velocityY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
                player.justLanded = true;
            }
            // Hitting platform from below
            else if (player.velocityY < 0 && player.y > platform.y) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
            // Hitting platform from the side
            else if (player.velocityX > 0 && player.x < platform.x) {
                player.x = platform.x - player.width;
                player.velocityX = 0;
            }
            else if (player.velocityX < 0 && player.x > platform.x) {
                player.x = platform.x + platform.width;
                player.velocityX = 0;
            }
        }
    }
}

// Check collision with obstacles
function checkObstacleCollision() {
    for (let obstacle of obstacles) {
        if (checkCollision(player, obstacle)) {
            if (obstacle.type === 'spike') {
                // Player dies - reset to start
                playDeathSound();
                resetPlayer();
                gameStatus.textContent = "💀 You died! Try again!";
            }
        }
    }
}

// Check collision with enemies
function checkEnemyCollision() {
    for (let enemy of enemies) {
        if (enemy.alive && checkCollision(player, enemy)) {
            // Check if player is jumping on enemy (from above)
            if (player.velocityY > 0 && player.y < enemy.y) {
                // Player jumps on enemy
                enemy.alive = false;
                player.velocityY = -6; // Small bounce
                playCoinSound(); // Use coin sound for enemy defeat
                gameStatus.textContent = "💥 Enemy defeated!";
            } else {
                // Player hits enemy from side or below - dies
                playDeathSound();
                resetPlayer();
                gameStatus.textContent = "💀 You died! Try again!";
            }
        }
    }
}

// Update enemies
function updateEnemies() {
    for (let enemy of enemies) {
        if (enemy.alive) {
            // Store old position
            const oldX = enemy.x;
            
            // Move enemy
            enemy.x += enemy.direction * enemy.speed;
            
            // Check if enemy is still on a platform
            let onPlatform = false;
            let currentPlatform = null;
            
            for (let platform of platforms) {
                // Check if enemy is standing on this platform
                if (enemy.x + enemy.width > platform.x && enemy.x < platform.x + platform.width &&
                    enemy.y + enemy.height >= platform.y - 2 && enemy.y + enemy.height <= platform.y + 2) {
                    onPlatform = true;
                    currentPlatform = platform;
                    break;
                }
            }
            
            // If not on platform or at platform edge, reverse direction
            if (!onPlatform || enemy.x <= currentPlatform.x || enemy.x + enemy.width >= currentPlatform.x + currentPlatform.width) {
                enemy.direction *= -1;
                enemy.x = oldX; // Revert to old position
            }
            
            // Keep enemy within level bounds
            if (enemy.x < 0) {
                enemy.x = 0;
                enemy.direction = 1;
            }
            if (enemy.x + enemy.width > currentLevelData.levelWidth) {
                enemy.x = currentLevelData.levelWidth - enemy.width;
                enemy.direction = -1;
            }
        }
    }
}

// Reset player to start position
function resetPlayer() {
    player.x = currentLevelData.playerStart.x;
    player.y = currentLevelData.playerStart.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.onGround = false;
    player.justLanded = false;
    
    // Reset blocks
    buildableBlocks.length = 0;
    gameState.blocksRemaining = gameState.maxBlocks;
    gameState.blocksUsed = 0;
    if (typeof updateBlockCounters === 'function') updateBlockCounters();

    // Reset coins and enemies on death
    gameState.coins = 0;
    coinCount.textContent = gameState.coins;
    if (Array.isArray(coins)) {
        coins.forEach(coin => { coin.collected = false; });
    }
    if (Array.isArray(enemies)) {
        enemies.forEach(enemy => { enemy.alive = true; });
    }
}

// Procedural generation for Level 2
function generateLevel2() {
    const levelWidth = 1800;
    const platforms = [];
    const obstacles = [];
    const coins = [];
    const enemies = [];
    
    // Ground platform
    platforms.push({ x: 0, y: 368, width: levelWidth, height: 32, color: '#8B4513' });
    
    // Starting platform
    platforms.push({ x: 0, y: 368, width: 120, height: 32, color: '#8B4513' });
    
    // Generate random platforms
    let currentX = 200;
    let currentY = 350;
    const platformCount = 8 + Math.floor(Math.random() * 4); // 8-11 platforms
    
    for (let i = 0; i < platformCount; i++) {
        // Random platform width (60-120px)
        const platformWidth = 60 + Math.floor(Math.random() * 61);
        
        // Random gap (80-150px)
        const gap = 80 + Math.floor(Math.random() * 71);
        currentX += gap;
        
        // Random height variation (-60 to +20 from base)
        const heightVariation = -60 + Math.floor(Math.random() * 81);
        currentY = 350 + heightVariation;
        
        // Ensure platform doesn't go too high or too low
        currentY = Math.max(120, Math.min(350, currentY));
        
        // Check for overlap with existing platforms
        let canPlacePlatform = true;
        const newPlatform = {
            x: currentX,
            y: currentY,
            width: platformWidth,
            height: 32,
            color: '#8B4513'
        };
        
        // Check overlap with ground (y = 368)
        if (currentY + 32 > 368) {
            canPlacePlatform = false;
        }
        
        // Check overlap with existing platforms
        if (canPlacePlatform) {
            for (let existingPlatform of platforms) {
                if (checkCollision(newPlatform, existingPlatform)) {
                    canPlacePlatform = false;
                    break;
                }
            }
        }
        
        // If no overlap, add the platform
        if (canPlacePlatform) {
            platforms.push(newPlatform);
        } else {
            // Try to adjust position to avoid overlap
            currentY = Math.max(120, currentY - 50);
            newPlatform.y = currentY;
            
            // Check again with adjusted position
            canPlacePlatform = true;
            if (currentY + 32 > 368) {
                canPlacePlatform = false;
            }
            
            if (canPlacePlatform) {
                for (let existingPlatform of platforms) {
                    if (checkCollision(newPlatform, existingPlatform)) {
                        canPlacePlatform = false;
                        break;
                    }
                }
            }
            
            if (canPlacePlatform) {
                platforms.push(newPlatform);
            }
        }
    }
    
    // Goal platform (near the end)
    const goalX = levelWidth - 100;
    const goalY = 100 + Math.floor(Math.random() * 100);
    platforms.push({
        x: goalX,
        y: goalY,
        width: 80,
        height: 32,
        color: '#8B4513'
    });
    
    // Generate random spikes (more than Level 1)
    const spikeCount = 8 + Math.floor(Math.random() * 4); // 8-11 spikes
    let spikesPlaced = 0;
    let spikeAttempts = 0;
    const maxSpikeAttempts = 80;
    const startPlatform = platforms[1]; // Starting platform (index 1)
    const safeZone = 150; // Safe zone around starting position
    
    while (spikesPlaced < spikeCount && spikeAttempts < maxSpikeAttempts) {
        spikeAttempts++;
        
        let spikeX, spikeY;
        let isGroundSpike = Math.random() < 0.3; // 30% chance for ground spikes
        
        if (isGroundSpike) {
            // Place spike on ground
            spikeX = Math.floor(Math.random() * (levelWidth - 32));
            spikeY = 368 - 18; // Ground level minus spike height
            
            // Check if spike is too close to starting position
            const distanceFromStart = Math.abs(spikeX - (startPlatform.x + startPlatform.width / 2));
            if (distanceFromStart < safeZone) {
                continue; // Skip this placement, too close to start
            }
        } else {
            // Place spike on platform
            const platformIndex = Math.floor(Math.random() * (platforms.length - 1)) + 1; // Skip ground
            const platform = platforms[platformIndex];
            
            // Random position on platform
            spikeX = platform.x + Math.floor(Math.random() * (platform.width - 32));
            spikeY = platform.y - 18;
            
            // Check if spike is too close to starting position
            const distanceFromStart = Math.abs(spikeX - (startPlatform.x + startPlatform.width / 2));
            if (platform === startPlatform && distanceFromStart < safeZone) {
                continue; // Skip this placement, too close to start
            }
        }
        
        // Check if spike would overlap with existing spikes
        let canPlaceSpike = true;
        const spikeRect = { x: spikeX, y: spikeY, width: 32, height: 18 };
        
        for (let existingObstacle of obstacles) {
            if (checkCollision(spikeRect, existingObstacle)) {
                canPlaceSpike = false;
                break;
            }
        }
        
        if (canPlaceSpike) {
            obstacles.push({
                x: spikeX,
                y: spikeY,
                width: 32,
                height: 18,
                type: 'spike',
                color: '#8B0000'
            });
            spikesPlaced++;
        }
    }
    
    // Generate random coins
    const coinCount = 8 + Math.floor(Math.random() * 4); // 8-11 coins
    let coinsPlaced = 0;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loop
    
    while (coinsPlaced < coinCount && attempts < maxAttempts) {
        attempts++;
        
        // Find a random platform
        const platformIndex = Math.floor(Math.random() * (platforms.length - 1)) + 1;
        const platform = platforms[platformIndex];
        
        // Random position on platform
        const coinX = platform.x + Math.floor(Math.random() * (platform.width - 16));
        const coinY = platform.y - 20;
        
        // Check if coin would overlap with any spike or be too close to ground spikes
        let canPlaceCoin = true;
        const coinRect = { x: coinX, y: coinY, width: 16, height: 16 };
        
        for (let obstacle of obstacles) {
            if (checkCollision(coinRect, obstacle)) {
                canPlaceCoin = false;
                break;
            }
        }
        
        // Also check if coin is too close to ground level (avoid ground spikes)
        if (coinY > 350) {
            canPlaceCoin = false;
        }
        
        // Check if coin would overlap with any existing coin
        for (let existingCoin of coins) {
            if (checkCollision(coinRect, existingCoin)) {
                canPlaceCoin = false;
                break;
            }
        }
        
        if (canPlaceCoin) {
            coins.push({
                x: coinX,
                y: coinY,
                width: 16,
                height: 16,
                collected: false,
                color: '#FFD700'
            });
            coinsPlaced++;
        }
    }
    
    // Generate random enemies (3-6 enemies)
    const enemyCount = 3 + Math.floor(Math.random() * 4);
    let enemiesPlaced = 0;
    let enemyAttempts = 0;
    const maxEnemyAttempts = 30;
    
    while (enemiesPlaced < enemyCount && enemyAttempts < maxEnemyAttempts) {
        enemyAttempts++;
        
        // Find a random platform (not starting platform)
        const platformIndex = Math.floor(Math.random() * (platforms.length - 2)) + 2; // Skip ground and starting platform
        const platform = platforms[platformIndex];
        
        // Random position on platform
        const enemyX = platform.x + Math.floor(Math.random() * (platform.width - 24));
        const enemyY = platform.y - 24;
        
        // Check if enemy would overlap with any spike or be too close to ground spikes
        let canPlaceEnemy = true;
        const enemyRect = { x: enemyX, y: enemyY, width: 24, height: 24 };
        
        for (let obstacle of obstacles) {
            if (checkCollision(enemyRect, obstacle)) {
                canPlaceEnemy = false;
                break;
            }
        }
        
        // Also check if enemy is too close to ground level (avoid ground spikes)
        if (enemyY > 340) {
            canPlaceEnemy = false;
        }
        
        // Check if enemy would overlap with any existing enemy
        for (let existingEnemy of enemies) {
            if (checkCollision(enemyRect, existingEnemy)) {
                canPlaceEnemy = false;
                break;
            }
        }
        
        if (canPlaceEnemy) {
            enemies.push({
                x: enemyX,
                y: enemyY,
                width: 24,
                height: 24,
                type: 'enemy',
                color: '#8B0000',
                direction: Math.random() > 0.5 ? 1 : -1,
                speed: 1.5 + Math.random() * 0.5, // 1.5-2.0 speed
                alive: true
            });
            enemiesPlaced++;
        }
    }
    
    return {
        platforms: platforms,
        obstacles: obstacles,
        coins: coins,
        enemies: enemies,
        endGoal: { x: levelWidth - 50, y: goalY - 32, width: 32, height: 32, color: '#4CAF50' },
        playerStart: { x: 50, y: 300 },
        levelWidth: levelWidth
    };
}

// Load level
function loadLevel(levelNumber) {
    if (levelNumber === 2) {
        currentLevelData = generateLevel2();
    } else {
        currentLevelData = levels[levelNumber];
    }
    
    platforms = currentLevelData.platforms;
    obstacles = currentLevelData.obstacles;
    coins = currentLevelData.coins;
    enemies = currentLevelData.enemies;
    endGoal = currentLevelData.endGoal;
    
    // Reset player
    player.x = currentLevelData.playerStart.x;
    player.y = currentLevelData.playerStart.y;
    player.velocityX = 0;
    player.velocityY = 0;
    player.onGround = false;
    player.justLanded = false;
    
    // Reset game state
    buildableBlocks.length = 0;
    gameState.blocksRemaining = gameState.maxBlocks;
    gameState.blocksUsed = 0;
    gameState.coins = 0;
    gameState.running = true;
    gameState.won = false;
    gameState.levelComplete = false;
    gameState.showLevelTransition = false;
    gameState.starsThisLevel = 0;
    
    // Reset coins and enemies
    coins.forEach(coin => coin.collected = false);
    enemies.forEach(enemy => enemy.alive = true);

    // Spawn the single star for this level
    levelStar = spawnLevelStar();
    
    // Update UI
    currentLevelDisplay.textContent = levelNumber;
    updateBlockCounters();
    coinCount.textContent = gameState.coins;
    totalCoinsDisplay.textContent = coins.length;
    if (starCount) starCount.textContent = gameState.starsThisLevel;
    if (totalStarsDisplay) totalStarsDisplay.textContent = 1;
    gameStatus.textContent = `Level ${levelNumber} - Ready to play!`;
    
    // Stop any existing music and restart
    stopBackgroundMusic();
    playBackgroundMusic();
}

// Check coin collection
function checkCoinCollection() {
    for (let coin of coins) {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            gameState.coins++;
            coinCount.textContent = gameState.coins;
            playCoinSound();
            gameStatus.textContent = `💰 Coin collected! Total: ${gameState.coins}`;
        }
    }
}

// Spawn a single star on a random non-ground platform
function spawnLevelStar() {
    const candidatePlatforms = platforms.filter(p => p.y < 360 && p.width >= 24);
    if (candidatePlatforms.length === 0) return null;
    const platform = candidatePlatforms[Math.floor(Math.random() * candidatePlatforms.length)];
    const starWidth = 20;
    const starHeight = 20;
    const margin = 6;
    const minX = platform.x + margin;
    const maxX = platform.x + platform.width - starWidth - margin;
    if (maxX <= minX) return null;
    const x = Math.floor(minX + Math.random() * (maxX - minX));
    const y = platform.y - starHeight - 4;
    return { x, y, width: starWidth, height: starHeight, collected: false, color: '#FFD700' };
}

// Check star collection
function checkStarCollection() {
    if (!levelStar || levelStar.collected) return;
    if (checkCollision(player, levelStar)) {
        levelStar.collected = true;
        gameState.starsThisLevel = 1;
        gameState.maxBlocks += 1;       // Permanently increase capacity
        gameState.blocksRemaining += 1; // Also increase remaining for this level
        updateBlockCounters();
        if (starCount) starCount.textContent = gameState.starsThisLevel;
        playStarSound();
        gameStatus.textContent = `⭐ Star collected! Max blocks: ${gameState.maxBlocks}`;
    }
}

// Handle building
function handleBuilding() {
    if (keys.build && gameState.blocksRemaining > 0) {
        // Place block at player's position (snapped to grid)
        const blockX = Math.floor(player.x / BLOCK_SIZE) * BLOCK_SIZE;
        // Place block below the player (snapped to grid)
        // If the player's feet are exactly on a grid line, place directly below;
        // otherwise, place on the next grid cell beneath to avoid overlap.
        let blockY = Math.floor((player.y + player.height) / BLOCK_SIZE) * BLOCK_SIZE;
        if (blockY < player.y + player.height) {
            blockY += BLOCK_SIZE;
        }
        
        // Check if position is already occupied
        const newBlock = { x: blockX, y: blockY, width: BLOCK_SIZE, height: BLOCK_SIZE, color: '#654321' };
        let canPlace = true;
        
        for (let platform of [...platforms, ...buildableBlocks]) {
            if (checkCollision(newBlock, platform)) {
                canPlace = false;
                break;
            }
        }
        
        if (canPlace) {
            buildableBlocks.push(newBlock);
            gameState.blocksRemaining--;
            gameState.blocksUsed++;
            updateBlockCounters();
            playBuildSound();
            gameStatus.textContent = `Block placed! ${gameState.blocksRemaining} blocks remaining.`;
        } else {
            gameStatus.textContent = "Cannot place block here!";
        }
        
        keys.build = false; // Prevent multiple placements
    }
}

// Check win condition
function checkWinCondition() {
    if (checkCollision(player, endGoal)) {
        gameState.levelComplete = true;
        gameState.running = false;
        playWinSound();
        stopBackgroundMusic();
        
        if (gameState.currentLevel === 1) {
            // Show level transition screen
            gameState.showLevelTransition = true;
            gameStatus.textContent = `🎉 Level 1 Complete! Blocks used: ${gameState.blocksUsed}, Coins: ${gameState.coins}`;
        } else {
            // Game complete
            gameState.won = true;
            gameStatus.textContent = `🎉 Congratulations! You beat the game! Final Score - Blocks used: ${gameState.blocksUsed}, Coins: ${gameState.coins}`;
        }
    }
}

// Update game logic
function update() {
    if (!gameState.running) return;
    
    // Check win condition first (before early return)
    checkWinCondition();
    
    if (gameState.won) return;
    
    // Reset justLanded flag at start of frame
    player.justLanded = false;
    
    // Handle input
    if (keys.left) {
        player.velocityX = -MOVE_SPEED;
    } else if (keys.right) {
        player.velocityX = MOVE_SPEED;
    } else {
        player.velocityX *= 0.8; // Friction
    }
    
    if (keys.jump && player.onGround && !player.justLanded) {
        player.velocityY = JUMP_FORCE;
        player.onGround = false;
        player.justLanded = false;
        playJumpSound();
    }
    
    // Apply gravity
    player.velocityY += GRAVITY;
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > currentLevelData.levelWidth) player.x = currentLevelData.levelWidth - player.width;
    
    // Handle building
    handleBuilding();
    
    // Update enemies
    updateEnemies();
    
    // Check collisions
    checkPlatformCollision();
    checkObstacleCollision();
    checkEnemyCollision();
    checkCoinCollection();
    checkStarCollection();
}

// Camera offset for scrolling
let cameraX = 0;

// Render game
function render() {
    // Update camera to follow player
    cameraX = Math.max(0, player.x - canvas.width / 2);
    cameraX = Math.min(cameraX, currentLevelData.levelWidth - canvas.width);
    
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context for camera transform
    ctx.save();
    ctx.translate(-cameraX, 0);
    
    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add platform border
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // Draw obstacles
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'spike') {
            // Draw spike
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Draw spike triangles
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
            ctx.closePath();
            ctx.fill();
        }
    });
    
    // Draw enemies
    enemies.forEach(enemy => {
        if (enemy.alive) {
            // Draw enemy body
            ctx.fillStyle = enemy.color;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            
            // Draw enemy eyes
            ctx.fillStyle = 'white';
            ctx.fillRect(enemy.x + 4, enemy.y + 4, 4, 4);
            ctx.fillRect(enemy.x + 16, enemy.y + 4, 4, 4);
            ctx.fillStyle = 'black';
            ctx.fillRect(enemy.x + 6, enemy.y + 6, 2, 2);
            ctx.fillRect(enemy.x + 18, enemy.y + 6, 2, 2);
        }
    });
    
    // Draw coins
    coins.forEach(coin => {
        if (!coin.collected) {
            // Draw coin with shine effect
            ctx.fillStyle = coin.color;
            ctx.beginPath();
            ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add shine
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width/2 - 2, coin.y + coin.height/2 - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw star (single per level)
    if (levelStar && !levelStar.collected) {
        // Draw a 5-point star
        const cx = levelStar.x + levelStar.width / 2;
        const cy = levelStar.y + levelStar.height / 2;
        const spikes = 5;
        const outerRadius = Math.min(levelStar.width, levelStar.height) / 2;
        const innerRadius = outerRadius / 2.5;
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += Math.PI / spikes;
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += Math.PI / spikes;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fillStyle = levelStar.color;
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Draw buildable blocks
    buildableBlocks.forEach(block => {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.width, block.height);
        
        // Add block border
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x, block.y, block.width, block.height);
    });
    
    // Draw end goal
    ctx.fillStyle = endGoal.color;
    ctx.fillRect(endGoal.x, endGoal.y, endGoal.width, endGoal.height);
    
    // Draw goal flag
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(endGoal.x + 20, endGoal.y - 20, 4, 20);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(endGoal.x + 24, endGoal.y - 16, 16, 12);
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw player eyes
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 4, player.y + 4, 4, 4);
    ctx.fillRect(player.x + 16, player.y + 4, 4, 4);
    ctx.fillStyle = 'black';
    ctx.fillRect(player.x + 6, player.y + 6, 2, 2);
    ctx.fillRect(player.x + 18, player.y + 6, 2, 2);
    
    // Restore context
    ctx.restore();
    
    // Draw level transition screen
    if (gameState.showLevelTransition) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 Level 1 Complete! 🎉', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = '18px Arial';
        ctx.fillText(`Blocks Used: ${gameState.blocksUsed}/${gameState.maxBlocks}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`Coins Collected: ${gameState.coins}/${coins.length}`, canvas.width / 2, canvas.height / 2 + 10);
        
        ctx.font = '16px Arial';
        ctx.fillText('Press SPACE to continue to Level 2', canvas.width / 2, canvas.height / 2 + 50);
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Initialize audio and start the game
initAudio();
playBackgroundMusic();

// Initialize UI and star for the starting level
levelStar = spawnLevelStar();
gameState.starsThisLevel = 0;
if (totalStarsDisplay) totalStarsDisplay.textContent = 1;
if (starCount) starCount.textContent = gameState.starsThisLevel;
updateBlockCounters();

gameLoop();

// Reset game function (for future use)
function resetGame() {
    player.x = 50;
    player.y = 300;
    player.velocityX = 0;
    player.velocityY = 0;
    player.onGround = false;
    
    buildableBlocks.length = 0;
    gameState.blocksRemaining = gameState.maxBlocks;
    gameState.coins = 0;
    gameState.running = true;
    gameState.won = false;
    
    // Reset coins
    coins.forEach(coin => coin.collected = false);
    
    updateBlockCounters();
    coinCount.textContent = gameState.coins;
    gameStatus.textContent = "Ready to play!";
    
    // Restart music
    if (!isMusicPlaying) {
        playBackgroundMusic();
    }
}
