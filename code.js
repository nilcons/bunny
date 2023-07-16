// grid size
const gridWidth = 32;
const gridHeight = 24;

// emoji codes
const DOOR = '🚪';
const WALL = '🟦';
const BUNNY = '🐇';
const BOX = '🟩';
const CARROT = '🥕';
const PLACED_CARROT = '🟧';
const EMPTY = '⬜';
function obstacle(c) { return (c === WALL || c === PLACED_CARROT || c === BOX); }

/*    GAME   STATE   */
// the game field
let gameField = [];

// the bunny position
let bunnyPosition = {x: 0, y: 0};
let lastMove = 1; // 1 is right, -1 is left
let collectedCarrots = 0;
/*    END OF GAME   STATE   */
let history = [];

// canvas and context
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// size of each cell in pixels
let cellSize = 32;

// moving disabled, because we are doing gravity check
let gravityInMotion = false;

// initialize game field
function stringToGameField(inputString) {
    // Prepare the empty game field
    let gameField = [];
    for (let y = 0; y < gridHeight; y++) {
        gameField[y] = [WALL];
    }

    // Split the input by new lines
    let lines = inputString.trimRight().split('\n');

    for (let x = 0; x < gridWidth; x++) {
        gameField[0][x] = WALL;
        gameField[gridHeight - 1][x] = WALL;
    }

    // Loop through each line
    if (lines.length + 2 != gridHeight) throw("Bad number of lines: " + lines.length);
    let bx = -1, by = -1;
    for (let y = 1; y < lines.length + 1; y++) {
        let line = lines[y - 1];

        // Split the line into characters
        let chars = line.split('');

        // Convert each character to a game element and add it to the game field
        if (chars.length + 2 != gridWidth) throw("Bad number of columns: " + chars.length);
        for (let x = 1; x < chars.length + 1; x++) {
            let char = chars[x - 1];
            switch (char) {
            case '#':
                gameField[y][x] = WALL;
                break;
            case 'p':
                gameField[y][x] = BOX;
                break;
            case 'b':
                gameField[y][x] = BUNNY;
                by = y;
                bx = x;
                break;
            case ' ':
                gameField[y][x] = EMPTY;
                break;
            case 'g':
                gameField[y][x] = DOOR;
                break;
            case 'c':
                gameField[y][x] = CARROT;
                break;
            default:
                throw('Unrecognized character: ' + char);
                break;
            }
        }
        gameField[y][gridWidth - 1] = WALL;
    }

    if (by === -1 || bx === -1) throw('no bunny');
    return { gameField: gameField, bunnyX: bx, bunnyY: by };
}

async function initializeGameField() {
    try {
        let r = (await fetch(window.location.search.substring(1)));
        let field = (await r.text());
        let ret = stringToGameField(field);
        gameField = ret.gameField;
        bunnyPosition.y = ret.bunnyY;
        bunnyPosition.x = ret.bunnyX;
        return;
    } catch(e) {
        console.log("Reading game field from URL parameter failed.");
        console.log(e);
    }

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

    // place a bunny at a random position
    bunnyPosition = {x: Math.floor(Math.random() * (gridWidth - 2) + 1), y: Math.floor(Math.random() * (gridHeight - 2) + 1)};
    gameField[bunnyPosition.y][bunnyPosition.x] = BUNNY;

    // place some boxes at random positions
    for (let i = 0; i < 35; i++) {
        let boxPosition = {x: Math.floor(Math.random() * (gridWidth - 2) + 1), y: Math.floor(Math.random() * (gridHeight - 2) + 1)};
        gameField[boxPosition.y][boxPosition.x] = BOX;
        let carrotPosition = {x: Math.floor(Math.random() * (gridWidth - 2) + 1), y: Math.floor(Math.random() * (gridHeight - 2) + 1)};
        gameField[carrotPosition.y][carrotPosition.x] = CARROT;
    }
}

async function applyGravity() {
    drawGameField();

    gravityInMotion = true;

    while (true) {
        let gravityWasApplied = false;
        for (let y = gridHeight - 2; y >= 0; y--) {
            for (let x = 0; x < gridWidth; x++) {
                if (gameField[y][x] === BOX || gameField[y][x] === BUNNY) {
                    // check if the space below is empty
                    if (gameField[y + 1][x] === EMPTY || gameField[y + 1][x] === CARROT) {
                        // move the box or the bunny down
                        gravityWasApplied = true;
                        if (gameField[y][x] === BUNNY) {
                            if (gameField[y + 1][x] === CARROT) collectedCarrots++;
                            bunnyPosition.y++;
                        }
                        gameField[y + 1][x] = gameField[y][x];
                        gameField[y][x] = EMPTY;
                    }
                }
            }
        }

        if (!gravityWasApplied) {
            gravityInMotion = false;
            break;
        } else {
            await new Promise(r => setTimeout(r, 100));
            drawGameField();
        }
    };
}

// draw the game field
function drawGameField() {
    ctx.clearRect(-100, -100, canvas.width + 100, canvas.height + 100);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let emoji = gameField[y][x];

            switch (emoji) {
            case BUNNY:
                if (lastMove === 1) {
                    // if moving right, bunny has to be mirrored (in the font it's facing left)
                    ctx.save(); // save the current state
                    ctx.scale(-1, 1); // flip the canvas
                    ctx.fillText(emoji, (-1.2 - x) * cellSize, y * cellSize);
                    ctx.restore(); // restore to the previous state
                } else {
                    // if moving left, it has to be shifted a little bit
                    ctx.fillText(emoji, (-0.1 + x) * cellSize, y * cellSize);
                }
                break;
            case BOX:
            case WALL:
            case PLACED_CARROT:
                ctx.save();
                ctx.filter = emoji === BOX ? 'brightness(80%)' : 'brightness(60%)';
                ctx.fillText(emoji, x * cellSize, y * cellSize);
                ctx.restore();
                break;
            case CARROT:
            case DOOR:
                ctx.fillText(emoji, x * cellSize, y * cellSize);
            }
        }
    }

    ctx.save();
    ctx.fillStyle = "#e70";
    ctx.font = `20px sans-serif`;
    ctx.fillText(`Collected carrots: ${collectedCarrots}`, 10, 3);
    ctx.restore();
}


function tryMove(dx, dy) {
    if (dy === -1) {
        // if carrot on top, jump means to only eat it
        if (gameField[bunnyPosition.y - 1][bunnyPosition.x] === CARROT) {
            collectedCarrots++;
            gameField[bunnyPosition.y - 1][bunnyPosition.x] = EMPTY;
            return;
        }
        // during jump, nothing can be on top of us
        if (obstacle(gameField[bunnyPosition.y - 1][bunnyPosition.x])) return;
        // we can only jump if there is obstacle in front
        if (!obstacle(gameField[bunnyPosition.y][bunnyPosition.x + lastMove])) return;
    }

    let newX = bunnyPosition.x + dx;
    let newY = bunnyPosition.y + dy;

    if (gameField[newY][newX] === BOX) {
        if (dy === -1) {
            // no box pushing while jumping
            return;
        }

        if (gameField[newY-1][newX] === BOX) {
            // no pushing stacked boxes
            return;
        }

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

    // the new position is a wall
    if (obstacle(gameField[newY][newX])) return;

    if (gameField[newY][newX] === DOOR) alert("Congratulations");

    // move the bunny
    if (gameField[newY][newX] === CARROT) collectedCarrots++;
    gameField[bunnyPosition.y][bunnyPosition.x] = EMPTY;
    bunnyPosition.x = newX;
    bunnyPosition.y = newY;
    gameField[newY][newX] = BUNNY;
}

function placeCarrot() {
    if (collectedCarrots > 0) {
        // Determine the position to place the carrot
        let placeX = bunnyPosition.x + lastMove;
        let placeY = bunnyPosition.y;
        if (gameField[placeY][placeX] === EMPTY) {
            gameField[placeY][placeX] = PLACED_CARROT;
            collectedCarrots--;
            drawGameField();
        }
    }
}

// handle keyboard input
window.addEventListener('keydown', async function(e) {
    if (gravityInMotion) return;

    if (e.key !== 'u') {
        let newHistory = JSON.stringify([gameField, bunnyPosition, lastMove, collectedCarrots]);
        if (history.length == 0 || history[history.length-1] !== newHistory) history.push(newHistory);
    }

    switch (e.key) {
    case 'ArrowUp':
        tryMove(lastMove, -1);
        break;
    case 'ArrowLeft':
    case 'ArrowRight':
        let moveNow = e.key === 'ArrowLeft' ? -1 : 1;
        if (lastMove === moveNow)
            tryMove(moveNow, 0);
        else
            lastMove = moveNow;
        break;
    case ' ':
        placeCarrot();
        break;
    case 'u':
        if (history.length > 0) {
            let oldHistory = history.pop();
            [gameField, bunnyPosition, lastMove, collectedCarrots] = JSON.parse(oldHistory);
        }
        break;
    }

    await applyGravity();
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
async function startGame() {
    await initializeGameField();
    await applyGravity();
}

startGame();
