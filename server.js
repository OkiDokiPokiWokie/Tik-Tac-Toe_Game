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

// Serves all files (CSS, images, JS) from /public
app.use(express.static(path.join(__dirname, 'public')));

const usersFile = path.join(__dirname, 'data', 'users.json');

// Root route: Specifically serves index.html when you visit the site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. ROUTES
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    let users = {};
    if (fs.existsSync(usersFile)) {
        try {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        } catch (e) { users = {}; }
    }

    if (users[username]) {
        return res.send("User already exists! <a href='/'>Go back</a>");
    }

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

// 3. START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
});