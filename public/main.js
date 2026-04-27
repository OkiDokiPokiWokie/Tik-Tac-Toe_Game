const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const resetBtn = document.getElementById('reset-btn');

// Randomly assign the logged-in user to X or O
let userPiece = Math.random() < 0.5 ? "X" : "O";
let guestPiece = userPiece === "X" ? "O" : "X";
let currentPlayer = "X"; // X always goes first in standard Tic-Tac-Toe
let gameState = ["", "", "", "", "", "", "", "", ""];
let gameActive = true;

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Initialize the game board status
updateStatusDisplay();

function updateStatusDisplay() {
    if (!gameActive) return;
    let playerLabel = currentPlayer === userPiece ? "(You)" : "(Guest)";
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

function handleCellClick(e) {
    if (!gameActive) return;

    const idx = e.target.getAttribute('data-index');
    if (gameState[idx] !== "") return;

    // Both players play on the same screen, so we accept all clicks
    gameState[idx] = currentPlayer;
    e.target.innerText = currentPlayer;
    e.target.classList.add(currentPlayer === "X" ? "text-primary" : "text-danger");

    checkWinner();
    if (gameActive) saveGame(); // Save progress if game is still going
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
        let winnerLabel = currentPlayer === userPiece ? "(You)" : "(Guest)";
        statusText.innerText = `Winner: ${currentPlayer} ${winnerLabel}!`;
        statusText.className = currentPlayer === userPiece ? "alert alert-success" : "alert alert-danger";
        gameActive = false;
        saveGame(true);

        // Log a win if the logged-in user won, otherwise log a loss
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

    // Switch turns for the next click
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatusDisplay();
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));

resetBtn.addEventListener('click', () => {
    gameState = ["", "", "", "", "", "", "", "", ""];
    gameActive = true;

    // Re-randomize pieces on restart
    userPiece = Math.random() < 0.5 ? "X" : "O"; 
    guestPiece = userPiece === "X" ? "O" : "X";
    currentPlayer = "X"; 

    cells.forEach(cell => {
        cell.innerText = "";
        cell.classList.remove("text-primary", "text-danger");
    });

    updateStatusDisplay();
    saveGame();
});