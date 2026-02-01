const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store drawing history for each room
let roomHistory = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    if (roomHistory[room]) {
      socket.emit("load_history", roomHistory[room]);
    }
  });

  // 1. Drawing (Broadcast only)
  socket.on("draw_line", ({ room, data }) => {
    socket.to(room).emit("draw_line", data);
  });

  // 2. Save Line (End Stroke)
  socket.on("end_stroke", ({ room, data }) => {
    if (!roomHistory[room]) {
      roomHistory[room] = [];
    }
    roomHistory[room].push(data);
  });

  // 3. Undo
  socket.on("undo", (room) => {
    if (roomHistory[room] && roomHistory[room].length > 0) {
      roomHistory[room].pop();
      io.to(room).emit("canvasImage", roomHistory[room]);
    }
  });

  // lol chal ja bsdk

  // 4. Clear
  socket.on("clear", (room) => {
    roomHistory[room] = [];
    io.to(room).emit("canvasImage", []);
  });

  // 5. Edit Text
  socket.on("edit_line", ({ room, id, newText }) => {
    if (roomHistory[room]) {
      const lineIndex = roomHistory[room].findIndex((line) => line.id === id);
      if (lineIndex !== -1) {
        roomHistory[room][lineIndex].text = newText;
        io.to(room).emit("load_history", roomHistory[room]);
      }
    }
  });

  // 6. Move Element
  socket.on("move_element", ({ room, id, x, y }) => {
    if (roomHistory[room]) {
      const lineIndex = roomHistory[room].findIndex((line) => line.id === id);
      if (lineIndex !== -1) {
        roomHistory[room][lineIndex].x = x;
        roomHistory[room][lineIndex].y = y;
        socket.to(room).emit("load_history", roomHistory[room]);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(process.env.PORT || 3001, () => {
  console.log("SERVER RUNNING");
});