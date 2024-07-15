const amqp = require('amqplib');
const config = require('../../config');
const { getIO } = require('../helpers/socket');

const queueName = 'login_callback';

async function startConsumer() {
  try {
    const connection = await amqp.connect(config.rabbitMQ.url);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    channel.consume(queueName, (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());
        const io = getIO();

        console.log(`Received ${message.action} action for correlationId: ${message.correlationId}`);
        if (message.action === 'login_page_loaded') {
          io.to(message.correlationId).emit('loading', false);
          io.to(message.correlationId).emit('login_page_loaded', message.correlationId);
        } else if (message.action === 'login_error' || message.action === 'login_success') {
          console.log(`Received ${message.action} action for correlationId: ${message.correlationId}`);
          io.to(message.correlationId).emit(message.action, message);
        } else if(message.action === 'login_success') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('login_success', 'login berhasil')
        } else if(message.action === 'email_error') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('email_error', message)
        } else if(message.action === 'email_valid') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('email_valid', message.correlationId)
        } else if(message.action === 'password_error') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('password_error', message)
        } else if(message.action === 'password_valid') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('password_valid', message.correlationId)
        }  else if(message.action === '2fa_required') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('2fa_required', message)
        } else if(message.action === 'login_rejected') {
          io.to(message.correlationId).emit('loading', false)
          io.to(message.correlationId).emit('login_rejected',message)
        }
        channel.ack(msg);
      }
    });

    console.log('Consumer is waiting for messages...');
  } catch (error) {
    console.error('Error in consumer:', error);
  }
}

module.exports = { startConsumer };
