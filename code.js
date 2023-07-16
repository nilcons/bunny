/*    GAME   STATE   */
// grid size
let gridWidth = 30;
let gridHeight = 22;

// emoji codes
const WALL = '🟦';
const RABBIT = '🐇';
const BOX = '🟫';
const CARROT = '🥕';
const EMPTY = '⬜';

// the game field
let gameField = [];

// the rabbit position
let rabbitPosition = {x: 0, y: 0};
let lastMove = 'right';
/*    END OF GAME   STATE   */

// canvas and context
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// size of each cell in pixels
let cellSize = 32;

// moving disabled, because we are doing gravity check
let gravityInMotion = false;

// initialize game field
function initializeGameField() {
    for (let y = 0; y < gridHeight; y++) {
        gameField[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            if (y === 0 || x === 0 || y === gridHeight - 1 || x === gridWidth - 1) {
                // put wall around the field
                gameField[y][x] = WALL;
            } else {
                // put random walls inside
                gameField[y][x] = Math.random() < 0.2 ? WALL : EMPTY;
            }
        }
    }

    // place a rabbit at a random position
    rabbitPosition = {x: Math.floor(Math.random() * (gridWidth - 2) + 1), y: Math.floor(Math.random() * (gridHeight - 2) + 1)};
    gameField[rabbitPosition.y][rabbitPosition.x] = RABBIT;

    // place some boxes at random positions
    for (let i = 0; i < 5; i++) {
        let boxPosition = {x: Math.floor(Math.random() * (gridWidth - 2) + 1), y: Math.floor(Math.random() * (gridHeight - 2) + 1)};
        gameField[boxPosition.y][boxPosition.x] = BOX;
    }
}

function applyGravity() {
    let gravityWasApplied = false;

    for (let y = gridHeight - 2; y >= 0; y--) {
        for (let x = 0; x < gridWidth; x++) {
            if (gameField[y][x] === BOX || gameField[y][x] === RABBIT) {
                // check if the space below is empty
                if (gameField[y + 1][x] === EMPTY) {
                    // move the box or the rabbit down
                    gravityWasApplied = true;
                    gameField[y + 1][x] = gameField[y][x];
                    gameField[y][x] = EMPTY;
                    if (gameField[y + 1][x] === RABBIT) {
                        rabbitPosition.y++;
                    }
                }
            }
        }
    }

    drawGameField();

    if (gravityWasApplied) {
        gravityInMotion = true;
        setTimeout(applyGravity, 100);
    } else {
        gravityInMotion = false;
    }
}

// draw the game field
function drawGameField() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let emoji = gameField[y][x];

            if (emoji === WALL) {
                ctx.save();
                ctx.filter = 'brightness(60%)';
            }

            // rabbit has to be handled specially
            if (emoji === RABBIT) {
                if (lastMove === 'right') {
                    // if moving right, it has to be mirrored (in the font it's facing left)
                    ctx.save(); // save the current state
                    ctx.scale(-1, 1); // flip the canvas
                    ctx.fillText(emoji, (-1.2 - x) * cellSize, y * cellSize);
                    ctx.restore(); // restore to the previous state
                } else {
                    // if moving left, it has to be shifted a little bit
                    ctx.fillText(emoji, (-0.1 + x) * cellSize, y * cellSize);
                }
            } else if (emoji !== EMPTY) {
                ctx.fillText(emoji, x * cellSize, y * cellSize);
            }

            if (emoji === WALL) {
                ctx.restore();
            }
        }
    }
}


function tryMove(dx, dy) {
    let newX = rabbitPosition.x + dx;
    let newY = rabbitPosition.y + dy;

    // the new position is a wall
    if (gameField[newY][newX] === WALL) return;

    if (gameField[newY][newX] === BOX) {
        // the new position is a box
        let beyondX = newX + dx;

        if (gameField[newY][beyondX] === EMPTY) {
            // the position beyond the box is empty
            // move the box
            gameField[newY][beyondX] = BOX;
            gameField[newY][newX] = EMPTY;
        } else {
            // the box can't be moved
            return;
        }
    }

    // move the rabbit
    gameField[rabbitPosition.y][rabbitPosition.x] = EMPTY;
    rabbitPosition.x = newX;
    rabbitPosition.y = newY;
    gameField[newY][newX] = RABBIT;
}

// handle keyboard input
window.addEventListener('keydown', function(e) {
    if (gravityInMotion) return;

    switch (e.key) {
    case 'ArrowUp':
        if ([ WALL, BOX ].includes(gameField[rabbitPosition.y - 1][rabbitPosition.x])) return;
        if (lastMove === 'right' && [ WALL, BOX ].includes(gameField[rabbitPosition.y][rabbitPosition.x + 1]))
            tryMove(1, -1);
        if (lastMove === 'left' && [ WALL, BOX ].includes(gameField[rabbitPosition.y][rabbitPosition.x - 1]))
            tryMove(-1, -1);
        break;
    case 'ArrowLeft':
        if (lastMove === 'left')
            tryMove(-1, 0);
        else
            lastMove = 'left';
        break;
    case 'ArrowRight':
        if (lastMove === 'right')
            tryMove(1, 0);
        else
            lastMove = 'right';
        break;
    }

    applyGravity();
});

// setup canvas
canvas.width = cellSize * gridWidth;
canvas.height = cellSize * gridHeight;
ctx.translate(-2, 4); // the wall in the font is not correctly centered
ctx.textBaseline = 'top';
ctx.font = `${cellSize - 3}px 'Noto Color Emoji', serif`;
function resizeCanvas() {
    let scale = Math.min(
        window.innerHeight / (cellSize * gridHeight),
        window.innerWidth / (cellSize * gridWidth)
    );

    canvas.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// start the game
initializeGameField();
applyGravity();
