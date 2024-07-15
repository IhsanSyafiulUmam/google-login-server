require('dotenv').config()

module.exports = {
    nodeEnv: process.env.NODE_ENV,
    logger: {
        level: process.env.LOG_LEVEL,
    },
    headlessMode: process.env.HEADLESS_MODE === 'true' ? 'new' : false,
    screenshotEnabled: process.env.SCREENSHOT_ENABLED === 'true',

    navigationTimeout: process.env.NAVIGATION_TIMEOUT,
    elementTimeout: process.env.ELEMENT_TIMEOUT,
    userPromptTimeout: process.env.USER_PROMPT_TIMEOUT,

    rabbitMQ: {
        url: process.env.RABBITMQ_URL,
    },

    mongoDB: {
        url: process.env.MONGODB_URL,
        db: process.env.MONGODB_DB,
    },

    realAccountDB: {
        uri: process.env.REAL_ACCOUNT_DB_URI,
    },
}
