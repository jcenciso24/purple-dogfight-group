const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const ADMIN_KEY = 'purple123';
const DATA_FILE = 'golf-data.json';

let gameData = { foursomes: {} };

if (fs.existsSync(DATA_FILE)) {
    try {
        const saved = fs.readFileSync(DATA_FILE, 'utf8');
        gameData = JSON.parse(saved);
        console.log('✅ Loaded saved data');
        console.log(`📊 Foursomes: ${Object.keys(gameData.foursomes).length}`);
    } catch (err) { console.log('⚠️ Starting fresh'); }
}

function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2)); }
function generateCode() { return crypto.randomBytes(4).toString('hex'); }

app.get('/api/foursome/:code', (req, res) => {
    const foursome = gameData.foursomes[req.params.code];
    if (foursome) res.json({ success: true, foursomeName: foursome.name, players: foursome.players });
    else res.status(404).json({ success: false });
});

app.post('/api/foursome/:code', (req, res) => {
    const foursome = gameData.foursomes[req.params.code];
    if (foursome && foursome.players[req.body.playerIndex]) {
        foursome.players[req.body.playerIndex].scores = req.body.scores;
        saveData();
        res.json({ success: true });
    } else res.status(404).json({ success: false });
});

// NEW: Get all players from all foursomes for global leaderboard
app.get('/api/all-players', (req, res) => {
    const allPlayers = [];
    for (const [code, foursome] of Object.entries(gameData.foursomes)) {
        for (const player of foursome.players) {
            allPlayers.push({
                name: player.name,
                scores: player.scores,
                foursomeName: foursome.name
            });
        }
    }
    console.log(`📊 Global leaderboard: ${allPlayers.length} players`);
    res.json({ players: allPlayers });
});

app.post('/api/admin/verify', (req, res) => {
    if (req.body.key === ADMIN_KEY) res.json({ success: true });
    else res.status(403).json({ success: false });
});

app.post('/api/admin/create-foursome', (req, res) => {
    if (req.body.key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
    const code = generateCode();
    gameData.foursomes[code] = {
        name: req.body.foursomeName,
        code: code,
        players: req.body.playerNames.map(name => ({ name: name, scores: Array(18).fill(0) })),
        createdAt: new Date().toISOString()
    };
    saveData();
    res.json({ success: true, code: code });
});

app.get('/api/admin/all-foursomes', (req, res) => {
    const foursomes = Object.values(gameData.foursomes).map(f => ({ name: f.name, code: f.code, players: f.players.map(p => ({ name: p.name })) }));
    res.json({ foursomes });
});

app.post('/api/admin/delete-foursome', (req, res) => {
    if (req.body.key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
    delete gameData.foursomes[req.body.foursomeCode];
    saveData();
    res.json({ success: true });
});

app.get('/foursome/:code', (req, res) => { res.sendFile(path.join(__dirname, 'foursome.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.listen(PORT, () => {
    console.log(`✅ Purple Dogfight Group running on port ${PORT}`);
    console.log(`🔑 Admin key: ${ADMIN_KEY}`);
});