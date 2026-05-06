const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 1. MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'tic-tac-toe-secret-key', 
    resave: false,
    saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

const usersFile = path.join(__dirname, 'data', 'users.json');
const gamesFile = path.join(__dirname, 'data', 'games.json');
const aiStatsFile = path.join(__dirname, 'data', 'ai_stats.json');

// --- MINIMAX ALGORITHM HELPERS ---
const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function getWinner(board) {
    for (let condition of winConditions) {
        let [a, b, c] = condition;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (!board.includes("")) return "Draw";
    return null;
}

function minimax(board, depth, isMaximizing, aiPiece, humanPiece) {
    let result = getWinner(board);
    if (result === aiPiece) return 10 - depth;
    if (result === humanPiece) return depth - 10;
    if (result === "Draw") return 0;

    const emptyIndices = board.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let idx of emptyIndices) {
            board[idx] = aiPiece;
            let score = minimax(board, depth + 1, false, aiPiece, humanPiece);
            board[idx] = "";
            bestScore = Math.max(score, bestScore);
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let idx of emptyIndices) {
            board[idx] = humanPiece;
            let score = minimax(board, depth + 1, true, aiPiece, humanPiece);
            board[idx] = "";
            bestScore = Math.min(score, bestScore);
        }
        return bestScore;
    }
}

function getBestMove(board, aiPiece) {
    const humanPiece = aiPiece === "X" ? "O" : "X";
    let bestScore = -Infinity;
    let move = -1;
    const emptyIndices = board.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);

    for (let idx of emptyIndices) {
        board[idx] = aiPiece;
        let score = minimax(board, 0, false, aiPiece, humanPiece);
        board[idx] = "";
        if (score > bestScore) {
            bestScore = score;
            move = idx;
        }
    }
    return move;
}

// 2. ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    let users = {};
    if (fs.existsSync(usersFile)) {
        try { users = JSON.parse(fs.readFileSync(usersFile, 'utf8')); } catch (e) { users = {}; }
    }
    if (users[username]) return res.send("User already exists! <a href='/'>Go back</a>");

    // UPDATED: Added achievements array for future Feature #2
    users[username] = {
        password: password,
        stats: { wins: 0, losses: 0, draws: 0 },
        achievements: [] 
    };
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    req.session.username = username;
    res.redirect('/game.html'); 
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!fs.existsSync(usersFile)) return res.send("No users found.");
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

    if (users[username] && users[username].password === password) {
        req.session.username = username;
        res.redirect('/game.html');
    } else {
        res.send("Invalid credentials. <a href='/'>Go back</a>");
    }
});

app.post('/ai-move', async (req, res) => {
    const { board, aiPiece, difficulty } = req.body;
    const emptyIndices = board.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);
    if (emptyIndices.length === 0) return res.status(400).json({ error: "No moves left" });

    let moveIndex;
    let isFallbackMove = false; 

    if (difficulty === 'easy') {
        moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    } else if (difficulty === 'hard') {
        moveIndex = getBestMove(board, aiPiece);
    } else {
        try {
            const moveCompletion = await groq.chat.completions.create({
                messages: [{
                    role: "user", 
                    content: `You are a Tic-Tac-Toe engine playing as ${aiPiece}. Board: ${JSON.stringify(board)}. Legal moves: ${emptyIndices.join(', ')}. Respond ONLY with the integer of your move.`
                }],
                model: "llama-3.1-8b-instant", 
            });
            let aiMove = moveCompletion.choices[0]?.message?.content.trim();
            moveIndex = parseInt(aiMove);

            if (isNaN(moveIndex) || !emptyIndices.includes(moveIndex)) {
                moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                isFallbackMove = true; 
            }
        } catch (error) {
            moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            isFallbackMove = true; 
        }
    }
    res.json({ move: moveIndex, isFallbackMove: isFallbackMove });
});

// --- UPDATED: REFINED AI CHAT FOR "THE GROQ LOG" ---
app.post('/ai-chat', async (req, res) => {
    const { board, aiPiece, moveIndex, personality } = req.body;
    let aiMessage = "Your move."; 
    let isFallbackMessage = false; 

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{
                role: "system",
                content: `You are a Live AI Commentator. You respond with high personality. Personality type: ${personality}.`
            }, {
                role: "user", 
                content: `Match context: You are ${aiPiece}. You just moved to square ${moveIndex}. The board is: ${JSON.stringify(board)}. 
                Write a brief, one-sentence comment for the 'Live Feed'. Direct it at the human. 
                Personality: ${personality}. NO emojis. Be punchy.`
            }],
            model: "llama-3.1-8b-instant", 
        });

        let generatedMessage = chatCompletion.choices[0]?.message?.content.trim();
        if (generatedMessage) {
            aiMessage = generatedMessage;
        } else {
            isFallbackMessage = true;
        }
    } catch (error) {
        console.error("Groq Chat Error:", error);
        aiMessage = "Analyzing your next mistake.";
        isFallbackMessage = true; 
    }

    res.json({ message: aiMessage, isFallbackMessage: isFallbackMessage });
});

app.post('/save-game', (req, res) => {
    if (!req.session.username) return res.status(401).send("Not logged in");
    const { board, turn, gameOver, userPiece } = req.body;
    let games = {};
    if (fs.existsSync(gamesFile)) {
        try { games = JSON.parse(fs.readFileSync(gamesFile, 'utf8')); } catch(e) {}
    }
    games[req.session.username] = { board, turn, gameOver, userPiece };
    fs.writeFileSync(gamesFile, JSON.stringify(games, null, 2));
    res.json({ message: "Game saved!" });
});

app.post('/update-stats', (req, res) => {
    if (!req.session.username) return res.status(401).json({ error: "Unauthorized" });

    const { result, gameMode, difficulty, personality } = req.body; 
    const username = req.session.username;

    let users = {};
    if (fs.existsSync(usersFile)) {
        try { users = JSON.parse(fs.readFileSync(usersFile, 'utf8')); } catch(e) {}
    }

    if (users[username]) {
        if (result === 'win') users[username].stats.wins++;
        else if (result === 'loss') users[username].stats.losses++;
        else if (result === 'draw') users[username].stats.draws++;

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    }

    if (gameMode === 'ai' && difficulty && personality) {
        let aiStats = {};
        if (fs.existsSync(aiStatsFile)) {
            try { aiStats = JSON.parse(fs.readFileSync(aiStatsFile, 'utf8')); } catch(e) {}
        }

        if (!aiStats[difficulty]) aiStats[difficulty] = {};
        if (!aiStats[difficulty][personality]) {
            aiStats[difficulty][personality] = { wins: 0, losses: 0, draws: 0 };
        }

        if (result === 'win') aiStats[difficulty][personality].losses++;
        else if (result === 'loss') aiStats[difficulty][personality].wins++;
        else if (result === 'draw') aiStats[difficulty][personality].draws++;

        fs.writeFileSync(aiStatsFile, JSON.stringify(aiStats, null, 2));
    }

    res.json({ message: "Stats updated successfully!" });
});

app.get('/leaderboard-data', (req, res) => {
    let users = {};
    if (fs.existsSync(usersFile)) {
        try { users = JSON.parse(fs.readFileSync(usersFile, 'utf8')); } catch(e) {}
    }

    const leaderboard = Object.keys(users).map(username => {
        return {
            username: username,
            stats: users[username].stats,
            achievements: users[username].achievements || [] // Ensure this is sent back
        };
    });

    res.json(leaderboard);
});

app.get('/ai-stats-data', (req, res) => {
    let aiStats = {};
    if (fs.existsSync(aiStatsFile)) {
        try { aiStats = JSON.parse(fs.readFileSync(aiStatsFile, 'utf8')); } catch(e) {}
    }
    res.json(aiStats);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
});