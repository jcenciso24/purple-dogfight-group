const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const ADMIN_KEY = 'purple123';

// Start with EMPTY data - no saved data, everything resets on restart
let gameData = { foursomes: {} };

function generateCode() {
    return crypto.randomBytes(4).toString('hex');
}

app.get('/api/foursome/:code', (req, res) => {
    const foursome = gameData.foursomes[req.params.code];
    if (foursome) res.json({ success: true, foursomeName: foursome.name, players: foursome.players });
    else res.status(404).json({ success: false });
});

app.post('/api/foursome/:code', (req, res) => {
    const foursome = gameData.foursomes[req.params.code];
    if (foursome && foursome.players[req.body.playerIndex]) {
        foursome.players[req.body.playerIndex].scores = req.body.scores;
        res.json({ success: true });
    } else res.status(404).json({ success: false });
});

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
    res.json({ success: true, code: code });
});

app.get('/api/admin/all-foursomes', (req, res) => {
    const foursomes = Object.values(gameData.foursomes).map(f => ({ name: f.name, code: f.code, players: f.players.map(p => ({ name: p.name })) }));
    res.json({ foursomes });
});

app.post('/api/admin/delete-foursome', (req, res) => {
    if (req.body.key !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });
    delete gameData.foursomes[req.body.foursomeCode];
    res.json({ success: true });
});

app.get('/foursome/:code', (req, res) => { res.sendFile(path.join(__dirname, 'foursome.html')); });
app.get('/admin', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.listen(PORT, () => {
    console.log(`✅ Purple Dogfight Group running on port ${PORT}`);
    console.log(`🔑 Admin key: ${ADMIN_KEY}`);
    console.log(`📊 Data resets every time the server restarts`);
});