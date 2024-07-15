const amqp = require("amqplib");
const logger = require("./../helpers/logger");
const { getIO } = require("../helpers/socket");
const Google = require("../controllers/google");
const config = require("../../config");
const Publisher = require("./publisher");
const publisher = new Publisher();

const google = new Google();

class LoginWorker {
  async consume() {
    try {
      await this.connectToRabbitMQ();
    } catch (error) {
      logger.error(`Error during initial setup: ${error}`);
    }
  }

  async connectToRabbitMQ() {
    try {
      const connection = await amqp.connect(config.rabbitMQ.url);
      const channel = await connection.createChannel();

      connection.on("error", (err) => {
        logger.error("Connection error:", err);
        if (err.code === "ECONNRESET") {
          logger.info("Connection was reset. Trying to reconnect...");
          setTimeout(() => this.connectToRabbitMQ(), 5000);
        }
      });

      const workers = {};

      const q1 = await channel.assertQueue("login_tasks");
      logger.verbose("Ready to consume msg using rk login.task");

      channel.consume(q1.queue, async (msg) => {
        if (msg) {
          const correlationId = msg.properties.correlationId;
          console.log(correlationId);
          const data = JSON.parse(msg.content.toString());
          try {
            if (data.action === "start_login") {
              logger.verbose("open browser request received from queue");
              const google = new Google();
              await google.launchBrowser({
                id: correlationId,
                userAgent: data.userAgent,
                useProxy: null,
                proxy: null,
              });

              workers[correlationId] = google;

              publisher.publishMessage(
                "login_callback",
                {
                  action: "login_page_loaded",
                  correlationId,
                },
                correlationId
              );
            } else if (data.action == "submit_email") {
              logger.verbose("submit email request received from queue");

              const { email } = data;

              const googleLogin = workers[correlationId];
              if (!googleLogin) {
                throw new Error("No worker found for this correlationId");
              }
              try {
                await googleLogin.submitEmail(email);
                logger.info(`email: ${email} submitterd`);
              } catch (error) {
                publisher.publishMessage(
                  "login_callback",
                  {
                    action: "login_error",
                    error: error.message,
                    correlationId,
                  },
                  correlationId
                );
              } 
            } else if (data.action == "submit_password") {
              logger.verbose("submit password request received from queue");

              const { password } = data;

              const googleLogin = workers[correlationId];
              if (!googleLogin) {
                throw new Error("No worker found for this correlationId");
              }
              try {
                await googleLogin.submitPassword(password);
              } catch (error) {
                publisher.publishMessage(
                  "login_callback",
                  {
                    action: "login_error",
                    error: error.message,
                    correlationId,
                  },
                  correlationId
                );
              }
            }
          } catch (error) {
            logger.error(`Error during RabbitMQ message consumption: ${error}`);
          } finally {
            channel.ack(msg);
          }
        }
      });
    } catch (error) {
      logger.error(`Error during setup: ${error}`);
      setTimeout(() => this.connectToRabbitMQ(), 5000);
    }
  }
}

const consumer = new LoginWorker();
consumer.consume();
