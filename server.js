require('dotenv').config(); // Load the .env file for the API key
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk'); // Import Groq SDK

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Groq with your API Key
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

// 2. ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    let users = {};
    if (fs.existsSync(usersFile)) {
        try {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        } catch (e) { users = {}; }
    }
    if (users[username]) return res.send("User already exists! <a href='/'>Go back</a>");

    users[username] = {
        password: password,
        stats: { wins: 0, losses: 0, draws: 0 }
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

// --- NEW: AI MOVE ROUTE ---
app.post('/ai-move', async (req, res) => {
    const { board, aiPiece } = req.body;

    // 1. Find empty indices to tell the AI what moves are legal
    const emptyIndices = board.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);

    if (emptyIndices.length === 0) return res.status(400).json({ error: "No moves left" });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a Tic-Tac-Toe engine playing as ${aiPiece}. The board indices are 0-8. Current board: ${JSON.stringify(board)}. Legal moves (empty indices) are: ${emptyIndices.join(', ')}. Respond ONLY with a single integer from the legal moves list. No explanation, no greeting, no punctuation.`
                }
            ],
            model: "llama3-8b-8192", // Fast and efficient for logic tasks
        });

        let aiMove = chatCompletion.choices[0]?.message?.content.trim();
        let moveIndex = parseInt(aiMove);

        // --- VALIDATOR ---
        // If AI hallucinates an occupied square or non-number, pick a random legal square as fallback
        if (isNaN(moveIndex) || !emptyIndices.includes(moveIndex)) {
            console.log(`AI Hallucinated: "${aiMove}". Falling back to random.`);
            moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        }

        res.json({ move: moveIndex });
    } catch (error) {
        console.error("Groq API Error:", error);
        // Fallback if API is down or times out
        const fallbackMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        res.json({ move: fallbackMove });
    }
});

// --- SAVE GAME STATE ---
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

// --- UPDATE USER STATS ---
app.post('/update-stats', (req, res) => {
    if (!req.session.username) return res.status(401).json({ error: "Unauthorized" });
    const { result } = req.body; // 'win', 'loss', or 'draw'
    const username = req.session.username;

    if (!fs.existsSync(usersFile)) return res.status(404).json({ error: "File not found" });
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

    if (result === 'win') users[username].stats.wins++;
    else if (result === 'loss') users[username].stats.losses++;
    else if (result === 'draw') users[username].stats.draws++;

    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ message: "Stats updated", stats: users[username].stats });
});

// 3. START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
});