const amqp = require('amqplib');
const config = require('../../config'); // Pastikan config diatur dengan benar

class Publisher {
  constructor() {
    this.channel = null;
    this.connection = null;
  }

  async createChannel() {
    this.connection = await amqp.connect(config.rabbitMQ.url);
    this.channel = await this.connection.createChannel();
  }

  async publishMessage(queueName, message, correlationId) {
    if (!this.channel) {
      await this.createChannel();
    }

    await this.channel.assertQueue(queueName, { durable: true });

    await this.channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        correlationId: correlationId,
      }
    );
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = Publisher;
