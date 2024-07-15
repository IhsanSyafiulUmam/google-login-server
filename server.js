const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const amqp = require('amqplib');
const cors = require('cors');
const uuid = require('uuid');
const { initializeSocket } = require('./app/helpers/socket');
const { startConsumer } = require('./app/services/loginCallback');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = 'http://127.0.0.1:5173'

// Configure CORS options
const corsOptions = {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
};

app.use(cors(corsOptions));



app.use(session({
    secret: 'your-secret',
    resave: false,
    saveUninitialized: true
}));


initializeSocket(server)

startConsumer()



// // RabbitMQ setup
// const QUEUE = 'login_tasks';
// let channel, connection;

// async function connectToRabbitMQ() {
//     try {
//         connection = await amqp.connect('amqp://localhost');
//         channel = await connection.createChannel();
//         await channel.assertQueue(QUEUE, { durable: true });
//         console.log('Connected to RabbitMQ');
//     } catch (error) {
//         console.error('Error connecting to RabbitMQ', error);
//     }
// }

// io.on('connection', (socket) => {
//     console.log('New client connected');

//     // Setup heartbeat mechanism
//     socket.isAlive = true;
//     socket.on('pong', () => {
//         socket.isAlive = true;
//     });

//     const interval = setInterval(() => {
//         if (!socket.isAlive) {
//             console.log('Terminating stale connection');
//             return socket.disconnect(true);
//         }
//         socket.isAlive = false;
//         socket.emit('ping');
//     }, 30000);

//     socket.on('login', async ({ email, password }) => {
//         console.log('Received login request:', email);
//         const correlationId = uuid.v4();
//         const message = { email, password, correlationId };

//         // Send task to RabbitMQ
//         await channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(message)), { correlationId });
//         console.log('Login task sent to RabbitMQ:', message);

//         // Listen for the result
//         channel.consume(QUEUE, (msg) => {
//             if (msg.properties.correlationId === correlationId) {
//                 const result = JSON.parse(msg.content.toString());
//                 console.log('Received response from RabbitMQ:', result);
//                 if (result.status === '2fa-required') {
//                     socket.emit('2fa-required');
//                     console.log('2FA required, notified client');
//                 } else if (result.status === 'login-success') {
//                     socket.emit('login-success');
//                     console.log('Login successful, notified client');
//                 }
//                 channel.ack(msg);
//             }
//         });
//     });

//     socket.on('init', async ({ ip, userAgent, location}) => {
//         console.log('Initializing')
//         console.log(ip);
//         console.log(JSON.stringify(location))
//         console.log(JSON.stringify(userAgent))
//     })

//     socket.on('2fa', async ({ code }) => {
//         console.log('Received 2FA code:', code);
//         const correlationId = uuid.v4();
//         const message = { code, correlationId };

//         // Send 2FA task to RabbitMQ
//         await channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(message)), { correlationId });
//         console.log('2FA task sent to RabbitMQ:', message);

//         // Listen for the result
//         channel.consume(QUEUE, (msg) => {
//             if (msg.properties.correlationId === correlationId) {
//                 const result = JSON.parse(msg.content.toString());
//                 console.log('Received 2FA response from RabbitMQ:', result);
//                 if (result.status === 'login-success') {
//                     socket.emit('login-success');
//                     console.log('2FA successful, notified client');
//                 }
//                 channel.ack(msg);
//             }
//         });
//     });

//     socket.on('disconnect', () => {
//         clearInterval(interval);
//         console.log('Client disconnected');
//     });
// });

server.listen(4000, () => {
    console.log('Server is running on port 4000');
    // connectToRabbitMQ();
});
