const path = require("path");
const http = require('http');

const express = require('express');
const { Server } = require("socket.io");

const GameMaster = require('./gameMaster');

const gameConfiguration = require('./gameConfiguration');


const app = express();
const server = http.createServer(app);

const io = new Server(server);


const gameMaster = new GameMaster(gameConfiguration);


app.use(express.static(path.join(__dirname, 'public')));


app.get('/test', (req, res) => {
  console.log('hey');
});


// Serve up game page at any domain path
app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Handle connection to the server
io.on('connection', (socket) => {
  gameMaster.handleConnection(socket);
});


server.listen(process.env.PORT || 8080, () => {
  console.log('listening');
});
