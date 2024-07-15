const amqp = require('amqplib');
const config = require('../../config');
const queueName = 'upload_userprofile';

async function startConsumer() {
  try {
    const connection = await amqp.connect(config.rabbitMQ.url);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName, { durable: true });

    channel.consume(queueName, (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());

        console.log(`Received ${message.action} action for correlationId: ${message.correlationId}`);
       
        channel.ack(msg);
      }
    });
    console.log('Profile Uploader is waiting for messages...');
  } catch (error) {
    console.error('Error in consumer:', error);
  }
}

module.exports = { startConsumer };
