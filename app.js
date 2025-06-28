import path from "path";
import http from "http";

import express from "express";
import { Server } from "socket.io";

import GameMaster from "./gameMaster.js";

import gameConfiguration from "./gameConfiguration.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server);


const gameMaster = new GameMaster(gameConfiguration, io);

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, 'public')));


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
