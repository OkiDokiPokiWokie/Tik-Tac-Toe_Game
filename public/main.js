// Game Elements
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

// Menu Elements
const modeSelection = document.getElementById('mode-selection');
const gameBoardArea = document.getElementById('game-board-area');
const btnVsGuest = document.getElementById('btn-vs-guest');
const btnVsAi = document.getElementById('btn-vs-ai');
const menuBtn = document.getElementById('menu-btn');

// AI Settings & Log Elements
const aiSettings = document.getElementById('ai-settings');
const difficultySelect = document.getElementById('difficulty-select');
const personalitySelect = document.getElementById('personality-select');
const aiLogColumn = document.getElementById('ai-log-column');
const groqLog = document.getElementById('groq-log');

// Theme Element
const themeSelect = document.getElementById('theme-select'); // NEW

// Game State Variables
let gameMode = 'pvp'; 
let userPiece = Math.random() < 0.5 ? "X" : "O";
let opponentPiece = userPiece === "X" ? "O" : "X";
let currentPlayer = "X"; 
let gameState = ["", "", "", "", "", "", "", "", ""];
let gameActive = false; 
let turnCounter = 1;

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// --- THEME ENGINE INITIALIZATION ---
const savedTheme = localStorage.getItem('tictactoe-theme') || 'classic';
document.documentElement.setAttribute('data-theme', savedTheme);
if (themeSelect) themeSelect.value = savedTheme;

themeSelect.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    localStorage.setItem('tictactoe-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    updateBoardDisplay(); // Refresh the board in case we switched to/from Emoji mode mid-game
});

// Helper to swap X/O with Emojis if the theme is active
function getPieceDisplay(piece) {
    if (!piece) return "";
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'emoji') {
        return piece === "X" ? "🔥" : "❄️";
    }
    return piece;
}

// Refreshes the board visual without changing the game state array
function updateBoardDisplay() {
    cells.forEach((cell, index) => {
        cell.innerText = getPieceDisplay(gameState[index]);
    });
    updateStatusDisplay();
}

// --- MENU & SETTINGS LISTENERS ---
btnVsGuest.addEventListener('click', () => {
    gameMode = 'pvp';
    startGame();
});

btnVsAi.addEventListener('click', () => {
    gameMode = 'ai';
    startGame();
});

menuBtn.addEventListener('click', () => {
    gameActive = false;
    gameBoardArea.classList.add('d-none');
    modeSelection.classList.remove('d-none');
});

difficultySelect.addEventListener('change', (e) => {
    const diff = e.target.value;
    if (diff === 'easy') personalitySelect.value = 'friendly';
    else if (diff === 'normal') personalitySelect.value = 'competitive';
    else if (diff === 'hard') personalitySelect.value = 'trash-talker';
});

// --- THE GROQ LOG HELPER ---
function addToGroqLog(message, personality) {
    if (!groqLog) return;

    const entry = document.createElement('div');
    entry.className = `log-entry personality-${personality}`;

    const label = document.createElement('span');
    label.className = 'turn-label';
    label.innerText = `Turn ${turnCounter} - ${personality.replace('-', ' ')}`;

    const text = document.createElement('span');
    text.innerText = message;

    entry.appendChild(label);
    entry.appendChild(text);
    groqLog.appendChild(entry);

    groqLog.scrollTop = groqLog.scrollHeight;
}

// --- CORE GAME FUNCTIONS ---
function startGame() {
    modeSelection.classList.add('d-none');
    gameBoardArea.classList.remove('d-none');

    if (gameMode === 'ai') {
        aiSettings.classList.remove('d-none');
        aiLogColumn.classList.remove('d-none');
        addToGroqLog("I'm ready when you are. Good luck.", personalitySelect.value);
    } else {
        aiSettings.classList.add('d-none');
        aiLogColumn.classList.add('d-none');
    }

    resetBoard();
}

function updateStatusDisplay() {
    if (!gameActive) return;
    let playerLabel = "";
    if (currentPlayer === userPiece) {
        playerLabel = "(You)";
    } else {
        playerLabel = gameMode === 'pvp' ? "(Guest)" : "(AI)";
    }
    // Updated to show Emojis in status text if active
    statusText.innerText = `Turn: ${getPieceDisplay(currentPlayer)} ${playerLabel}`;
    statusText.className = "alert alert-primary";
}

async function saveGame(gameOver = false) {
    await fetch('/save-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: gameState, turn: currentPlayer, gameOver, userPiece })
    });
}

async function sendResultToServer(gameResult) {
    const payload = {
        result: gameResult,
        gameMode: gameMode
    };

    if (gameMode === 'ai') {
        payload.difficulty = difficultySelect.value;
        payload.personality = personalitySelect.value;
    }

    await fetch('/update-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

// --- AI INTEGRATION ---
async function fetchAiMove() {
    statusText.innerText = `AI is thinking...`;
    statusText.className = "alert alert-info";

    try {
        const moveResponse = await fetch('/ai-move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                board: gameState, 
                aiPiece: currentPlayer,
                difficulty: difficultySelect.value
            })
        });

        const moveData = await moveResponse.json();
        const nextMove = moveData.move;

        if (nextMove !== undefined && gameActive) {
            const chatResponse = await fetch('/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    board: gameState,
                    aiPiece: currentPlayer,
                    moveIndex: nextMove,
                    personality: personalitySelect.value
                })
            });

            const chatData = await chatResponse.json();

            addToGroqLog(chatData.message || "Your turn.", personalitySelect.value);

            applyMove(nextMove, currentPlayer);
        }
    } catch (error) {
        console.error("Error fetching AI move:", error);
        statusText.innerText = "Error: AI disconnected.";
        statusText.className = "alert alert-danger";
    }
}

// --- MOVE LOGIC ---
function handleCellClick(e) {
    if (!gameActive) return;
    if (gameMode === 'ai' && currentPlayer !== userPiece) return;

    const idx = e.target.getAttribute('data-index');
    if (gameState[idx] !== "") return;

    applyMove(idx, currentPlayer);
}

function applyMove(idx, player) {
    gameState[idx] = player;
    const cell = document.querySelector(`.cell[data-index='${idx}']`);

    // Updated to use the display piece (Emoji or X/O)
    cell.innerText = getPieceDisplay(player); 
    cell.classList.add(player === "X" ? "text-primary" : "text-danger");

    turnCounter++;
    checkWinner();
    if (gameActive) saveGame(); 
}

function checkWinner() {
    let roundWon = false;
    for (let condition of winConditions) {
        let [a, b, c] = condition;
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        let winnerLabel = currentPlayer === userPiece ? "(You)" : (gameMode === 'pvp' ? "(Guest)" : "(AI)");
        // Updated to show Emojis in winner text if active
        statusText.innerText = `Winner: ${getPieceDisplay(currentPlayer)} ${winnerLabel}!`;
        statusText.className = currentPlayer === userPiece ? "alert alert-success" : "alert alert-danger";
        gameActive = false;
        saveGame(true);

        if (gameMode === 'ai' && currentPlayer !== userPiece) {
            addToGroqLog("Victory is mine! Better luck next time.", personalitySelect.value);
        } else if (gameMode === 'ai') {
            addToGroqLog("Impossible... You must have cheated.", personalitySelect.value);
        }

        sendResultToServer(currentPlayer === userPiece ? 'win' : 'loss');
        return;
    }

    if (!gameState.includes("")) {
        statusText.innerText = "Draw!";
        statusText.className = "alert alert-warning";
        gameActive = false;
        saveGame(true);
        if (gameMode === 'ai') addToGroqLog("A stalemate. How boring.", personalitySelect.value);
        sendResultToServer('draw');
        return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatusDisplay();

    if (gameActive && gameMode === 'ai' && currentPlayer !== userPiece) {
        fetchAiMove();
    }
}

// --- RESET LOGIC ---
function resetBoard() {
    gameState = ["", "", "", "", "", "", "", "", ""];
    gameActive = true;
    turnCounter = 1;

    if (groqLog) {
        groqLog.innerHTML = '<div class="text-muted small text-center mb-2 italic">--- New Match Started ---</div>';
    }

    userPiece = Math.random() < 0.5 ? "X" : "O"; 
    opponentPiece = userPiece === "X" ? "O" : "X";
    currentPlayer = "X"; 

    cells.forEach(cell => {
        cell.innerText = "";
        cell.classList.remove("text-primary", "text-danger");
    });

    updateStatusDisplay();
    saveGame();

    if (gameMode === 'ai' && currentPlayer !== userPiece) {
        fetchAiMove();
    }
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetBoard);