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

// AI Settings & Chat Elements
const aiSettings = document.getElementById('ai-settings');
const difficultySelect = document.getElementById('difficulty-select');
const personalitySelect = document.getElementById('personality-select');
const aiChatBox = document.getElementById('ai-chat-box');
const aiChatText = document.getElementById('ai-chat-text');

// Game State Variables
let gameMode = 'pvp'; // 'pvp' or 'ai'
let userPiece = Math.random() < 0.5 ? "X" : "O";
let opponentPiece = userPiece === "X" ? "O" : "X";
let currentPlayer = "X"; // X always goes first
let gameState = ["", "", "", "", "", "", "", "", ""];
let gameActive = false; // Starts false until a mode is selected

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

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

// Auto-adjust personality based on difficulty selection
difficultySelect.addEventListener('change', (e) => {
    const diff = e.target.value;
    if (diff === 'easy') personalitySelect.value = 'friendly';
    else if (diff === 'normal') personalitySelect.value = 'competitive';
    else if (diff === 'hard') personalitySelect.value = 'trash-talker';
});

// --- CORE GAME FUNCTIONS ---
function startGame() {
    modeSelection.classList.add('d-none');
    gameBoardArea.classList.remove('d-none');

    // Toggle AI specific UI
    if (gameMode === 'ai') {
        aiSettings.classList.remove('d-none');
        aiChatBox.classList.remove('d-none');
        aiChatText.innerText = `"I'm ready when you are."`;
    } else {
        aiSettings.classList.add('d-none');
        aiChatBox.classList.add('d-none');
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
    statusText.innerText = `Turn: ${currentPlayer} ${playerLabel}`;
    statusText.className = "alert alert-primary";
}

// Helper to save current state to server
async function saveGame(gameOver = false) {
    await fetch('/save-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: gameState, turn: currentPlayer, gameOver, userPiece })
    });
}

// Helper to update persistent stats
async function sendResultToServer(gameResult) {
    await fetch('/update-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: gameResult })
    });
}

// --- AI INTEGRATION ---
async function fetchAiMove() {
    statusText.innerText = `AI is thinking...`;
    statusText.className = "alert alert-info";
    aiChatText.innerText = "..."; // Show thinking indicator in chat

    try {
        // STEP 1: Get the AI's move (Hidden from user)
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

        // --- NEW: Log Fallback Move ---
        if (moveData.isFallbackMove) {
            console.warn("⚠️ AI Move Fallback Triggered: Used random square.");
        }

        if (nextMove !== undefined && gameActive) {

            // STEP 2: Get the AI's message based on the move it just chose
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

            // --- NEW: Log Fallback Message ---
            if (chatData.isFallbackMessage) {
                console.warn("⚠️ AI Chat Fallback Triggered: Used hardcoded text.");
            }

            // STEP 3: The Big Reveal
            aiChatText.innerText = `"${chatData.message || 'Your move.'}"`;
            applyMove(nextMove, currentPlayer);
        }
    } catch (error) {
        console.error("Error fetching AI move:", error);
        statusText.innerText = "Error: AI disconnected.";
        statusText.className = "alert alert-danger";
        aiChatText.innerText = `"Connection lost."`;
    }
}

// --- MOVE LOGIC ---
function handleCellClick(e) {
    if (!gameActive) return;

    // If it's AI mode, block clicks when it is the AI's turn
    if (gameMode === 'ai' && currentPlayer !== userPiece) return;

    const idx = e.target.getAttribute('data-index');
    if (gameState[idx] !== "") return;

    applyMove(idx, currentPlayer);
}

function applyMove(idx, player) {
    gameState[idx] = player;
    const cell = document.querySelector(`.cell[data-index='${idx}']`);
    cell.innerText = player;
    cell.classList.add(player === "X" ? "text-primary" : "text-danger");

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
        statusText.innerText = `Winner: ${currentPlayer} ${winnerLabel}!`;
        statusText.className = currentPlayer === userPiece ? "alert alert-success" : "alert alert-danger";
        gameActive = false;
        saveGame(true);

        sendResultToServer(currentPlayer === userPiece ? 'win' : 'loss');
        return;
    }

    if (!gameState.includes("")) {
        statusText.innerText = "Draw!";
        statusText.className = "alert alert-warning";
        gameActive = false;
        saveGame(true);
        sendResultToServer('draw');
        return;
    }

    // Switch turns
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatusDisplay();

    // Trigger AI if it's the AI's turn
    if (gameActive && gameMode === 'ai' && currentPlayer !== userPiece) {
        fetchAiMove();
    }
}

// --- RESET LOGIC ---
function resetBoard() {
    gameState = ["", "", "", "", "", "", "", "", ""];
    gameActive = true;

    // Re-randomize pieces on restart
    userPiece = Math.random() < 0.5 ? "X" : "O"; 
    opponentPiece = userPiece === "X" ? "O" : "X";
    currentPlayer = "X"; 

    cells.forEach(cell => {
        cell.innerText = "";
        cell.classList.remove("text-primary", "text-danger");
    });

    updateStatusDisplay();
    saveGame();

    if (gameMode === 'ai') {
        aiChatText.innerText = `"I'm ready when you are."`;
    }

    // If AI is 'X', it goes first immediately
    if (gameMode === 'ai' && currentPlayer !== userPiece) {
        fetchAiMove();
    }
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetBoard);