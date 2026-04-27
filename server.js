const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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