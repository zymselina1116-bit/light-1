// ==========================================
// CANVAS SETUP AND INITIALIZATION
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to fill the window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Regenerate ropes when window resizes
    generateRopes();
}

// Initial setup
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ==========================================
// MOUSE TRACKING
// ==========================================

const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    isMoving: false
};

// Track mouse position
canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.isMoving = true;
});

// Handle mouse leaving the canvas
canvas.addEventListener('mouseleave', () => {
    mouse.isMoving = false;
});

// ==========================================
// CANDLE AND FLAME CONFIGURATION
// ==========================================

const candle = {
    bodyRadius: 8,           // Size of candle body
    bodyColor: '#f4e4c1',    // Candle body color
    flameHeight: 20,         // Height of flame above candle
    flameWidth: 12,          // Width of flame
    flameRadius: 8,          // Radius for collision detection
    flameOffsetY: -15        // Y offset of flame center from candle top
};

// ==========================================
// ROPE CONFIGURATION AND DATA
// ==========================================

// Rope thickness types with their properties
const ropeTypes = {
    thin: {
        width: 3,
        burnDuration: 3000,      // 3 seconds to burn through
        color: '#8b7355',
        glowColor: '#ff6600'
    },
    medium: {
        width: 6,
        burnDuration: 5000,      // 5 seconds to burn through
        color: '#6b5845',
        glowColor: '#ff8800'
    },
    thick: {
        width: 10,
        burnDuration: 8000,      // 8 seconds to burn through
        color: '#4a3f35',
        glowColor: '#ffaa00'
    }
};

// Array to hold all rope objects
let ropes = [];

// Generate ropes across the screen
function generateRopes() {
    ropes = [];
    const numRopes = Math.floor(canvas.width / 80) + 5; // More ropes for wider screens
    const typeNames = ['thin', 'medium', 'thick'];

    for (let i = 0; i < numRopes; i++) {
        // Random position across the width
        const x = (canvas.width / (numRopes - 1)) * i + (Math.random() - 0.5) * 20;

        // Random thickness type
        const typeName = typeNames[Math.floor(Math.random() * typeNames.length)];
        const type = ropeTypes[typeName];

        ropes.push({
            x: x,
            y1: 0,                      // Top of screen
            y2: canvas.height,          // Bottom of screen
            type: type,
            typeName: typeName,
            burnProgress: 0,            // Burn progress in milliseconds
            isBurning: false,           // Currently being burned flag
            isBroken: false,            // Has been burned through flag
            breakPoint: 0,              // Y position where rope broke
            breakAnimation: 0,          // Animation progress for breaking effect
            lastBurnTime: Date.now()    // Timestamp for burn timing
        });
    }
}

// Initial rope generation
generateRopes();

// ==========================================
// COLLISION DETECTION
// ==========================================

/**
 * Check if the flame is touching a rope
 * @param {Object} rope - The rope object to check
 * @returns {Object|null} - Returns collision info or null
 */
function checkFlameRopeCollision(rope) {
    if (rope.isBroken) return null;

    // Flame center position
    const flameX = mouse.x;
    const flameY = mouse.y + candle.flameOffsetY;

    // Check if flame is within horizontal range of rope
    const horizontalDistance = Math.abs(flameX - rope.x);
    if (horizontalDistance > (rope.type.width / 2 + candle.flameRadius)) {
        return null;
    }

    // Check if flame is within vertical range of rope
    if (flameY < rope.y1 || flameY > rope.y2) {
        return null;
    }

    // Collision detected! Return collision info
    return {
        x: rope.x,
        y: flameY
    };
}

// ==========================================
// BURNING LOGIC
// ==========================================

/**
 * Update burn progress for all ropes
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateRopeBurning(deltaTime) {
    ropes.forEach(rope => {
        if (rope.isBroken) {
            // Continue break animation
            if (rope.breakAnimation < 1) {
                rope.breakAnimation += deltaTime / 500; // Animation takes 0.5 seconds
                if (rope.breakAnimation > 1) rope.breakAnimation = 1;
            }
            return;
        }

        // Check collision with flame
        const collision = checkFlameRopeCollision(rope);

        if (collision) {
            // Flame is touching this rope
            rope.isBurning = true;
            rope.burnProgress += deltaTime;

            // Check if rope has burned through
            if (rope.burnProgress >= rope.type.burnDuration) {
                rope.isBroken = true;
                rope.breakPoint = collision.y;
                rope.breakAnimation = 0;
            }
        } else {
            // Flame is not touching - reset burn progress
            if (rope.isBurning) {
                rope.isBurning = false;
            }
            // Gradually decrease burn progress when not burning (optional)
            rope.burnProgress = Math.max(0, rope.burnProgress - deltaTime * 0.5);
        }
    });
}

// ==========================================
// RENDERING FUNCTIONS
// ==========================================

/**
 * Draw a single rope
 * @param {Object} rope - The rope object to draw
 */
function drawRope(rope) {
    if (rope.isBroken && rope.breakAnimation >= 1) {
        // Rope has completely broken and animation is done
        return;
    }

    ctx.save();

    if (rope.isBroken) {
        // Draw breaking animation
        const breakY = rope.breakPoint;
        const animProgress = rope.breakAnimation;

        // Top part (stays in place)
        ctx.strokeStyle = rope.type.color;
        ctx.lineWidth = rope.type.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rope.x, rope.y1);
        ctx.lineTo(rope.x, breakY);
        ctx.stroke();

        // Bottom part (falls down and fades)
        const fallDistance = animProgress * 100;
        const fadeAlpha = 1 - animProgress;
        ctx.globalAlpha = fadeAlpha;
        ctx.beginPath();
        ctx.moveTo(rope.x, breakY + fallDistance);
        ctx.lineTo(rope.x, rope.y2 + fallDistance);
        ctx.stroke();

    } else {
        // Draw normal rope
        ctx.strokeStyle = rope.type.color;
        ctx.lineWidth = rope.type.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rope.x, rope.y1);
        ctx.lineTo(rope.x, rope.y2);
        ctx.stroke();

        // Draw burn glow effect if currently burning
        if (rope.isBurning) {
            const collision = checkFlameRopeCollision(rope);
            if (collision) {
                const burnIntensity = rope.burnProgress / rope.type.burnDuration;

                // Pulsing glow effect
                const pulseIntensity = 0.5 + Math.sin(Date.now() / 100) * 0.3;

                // Draw glow around burn point
                const gradient = ctx.createRadialGradient(
                    collision.x, collision.y, 0,
                    collision.x, collision.y, 30
                );
                gradient.addColorStop(0, `rgba(255, 100, 0, ${0.8 * pulseIntensity})`);
                gradient.addColorStop(0.5, `rgba(255, 150, 0, ${0.4 * pulseIntensity})`);
                gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.fillRect(collision.x - 30, collision.y - 30, 60, 60);

                // Draw charred section of rope
                const charHeight = 20 * burnIntensity;
                ctx.strokeStyle = `rgba(50, 25, 0, ${burnIntensity})`;
                ctx.lineWidth = rope.type.width + 2;
                ctx.beginPath();
                ctx.moveTo(rope.x, collision.y - charHeight / 2);
                ctx.lineTo(rope.x, collision.y + charHeight / 2);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

/**
 * Draw all ropes
 */
function drawRopes() {
    ropes.forEach(rope => drawRope(rope));
}

/**
 * Draw the candle with flame
 */
function drawCandle() {
    ctx.save();

    const x = mouse.x;
    const y = mouse.y;

    // Draw flame (drawn first so it appears behind the candle body)
    const flameY = y + candle.flameOffsetY;

    // Flame glow
    const flameGradient = ctx.createRadialGradient(x, flameY, 0, x, flameY, 25);
    flameGradient.addColorStop(0, 'rgba(255, 200, 0, 0.4)');
    flameGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.2)');
    flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = flameGradient;
    ctx.fillRect(x - 25, flameY - 25, 50, 50);

    // Flame shape (teardrop)
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(x, flameY - candle.flameHeight / 2);
    ctx.bezierCurveTo(
        x + candle.flameWidth / 2, flameY - 5,
        x + candle.flameWidth / 2, flameY + 5,
        x, flameY + candle.flameHeight / 2
    );
    ctx.bezierCurveTo(
        x - candle.flameWidth / 2, flameY + 5,
        x - candle.flameWidth / 2, flameY - 5,
        x, flameY - candle.flameHeight / 2
    );
    ctx.fill();

    // Inner flame (brighter)
    ctx.fillStyle = '#ffee00';
    ctx.beginPath();
    ctx.ellipse(x, flameY, candle.flameWidth / 3, candle.flameHeight / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flickering effect (subtle variation)
    const flicker = Math.sin(Date.now() / 50) * 2;

    // Candle body
    ctx.fillStyle = candle.bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, candle.bodyRadius, 0, Math.PI * 2);
    ctx.fill();

    // Candle body shading
    ctx.fillStyle = 'rgba(200, 180, 140, 0.5)';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, candle.bodyRadius, 0, Math.PI * 2);
    ctx.fill();

    // Wick
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - candle.bodyRadius);
    ctx.lineTo(x, flameY + candle.flameHeight / 2 - 2);
    ctx.stroke();

    ctx.restore();
}

// ==========================================
// DEBUG INFO (Optional - can be removed)
// ==========================================

// Show debug info when pressing 'D' key
let showDebug = false;
document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
        showDebug = !showDebug;
    }
    // Reset all ropes when pressing 'R' key
    if (e.key === 'r' || e.key === 'R') {
        generateRopes();
    }
});

// Draw debug info if enabled
function drawDebugInfo() {
    if (!showDebug) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 120, 300, 110);

    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';

    let burningRopes = ropes.filter(r => r.isBurning).length;
    let brokenRopes = ropes.filter(r => r.isBroken).length;
    let intactRopes = ropes.filter(r => !r.isBroken).length;

    ctx.fillText(`FPS: ${Math.round(1000 / (Date.now() - lastTime))}`, 20, canvas.height - 100);
    ctx.fillText(`Total Ropes: ${ropes.length}`, 20, canvas.height - 80);
    ctx.fillText(`Burning: ${burningRopes}`, 20, canvas.height - 60);
    ctx.fillText(`Broken: ${brokenRopes}`, 20, canvas.height - 40);
    ctx.fillText(`Intact: ${intactRopes}`, 20, canvas.height - 20);

    ctx.restore();
}

// ==========================================
// ANIMATION LOOP
// ==========================================

let lastTime = Date.now();

function animate() {
    // Calculate delta time
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Clear canvas
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update rope burning logic
    updateRopeBurning(deltaTime);

    // Draw ropes (behind the candle)
    drawRopes();

    // Draw candle with flame (on top of ropes)
    drawCandle();

    // Draw debug info if enabled
    drawDebugInfo();

    // Continue animation loop
    requestAnimationFrame(animate);
}

// Start the animation
animate();
