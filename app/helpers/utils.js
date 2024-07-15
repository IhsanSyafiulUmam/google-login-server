const { json } = require('body-parser')
const logger = require('./logger')
const moment = require('moment')


const timeNow = moment().format('YYYYMMDD_HHmmss')

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

const randomWaitTime = (min = 2500, max = 5000) => Math.floor(Math.random() * (max - min + 1) + min)
const typingDelay = randomWaitTime(100, 400)
const nextDelay = randomWaitTime(1500, 5000)

async function checkIpAddress(page) {
    const checkIpAddressUrl = 'https://iproyal.com/ip-lookup/'

    try {
        await page.goto(checkIpAddressUrl, {
            timeout: 60000,
            waitUntil: 'domcontentloaded'
        })

        const details = await page.evaluate(() => {
            const section = document.querySelector('section.card')
            const rows = section.querySelectorAll('.flex.flex-row')
            const data = {}
        
            rows.forEach(row => {
                const label = row.children[0].textContent.trim().replace(':', '')
                const value = row.children[1].textContent.trim()
                data[label] = value
            })
        
            return data
        })
        logger.info(JSON.stringify(details))
        await page.goto('about:blank')
        await sleep(1000)
    } catch (err) {
        logger.error('An error occurred while checking the IP address:', err)
        logger.info('IP address: unknown')
    }
}


async function autoScroll(page, option={ scrollIntervalMs:1000 }){
    await page.evaluate(async (option) => {
        await new Promise((resolve) => {
            let totalHeight = 0
            let distance = 800
            let totalScroll = 0
            let maxScroll = 1
            let timer = setInterval(() => {
                totalScroll += 1
                var scrollHeight = document.body.scrollHeight
                window.scrollBy(0, distance)
                totalHeight += distance
                if (totalScroll >= maxScroll || totalHeight > scrollHeight) {
                    clearInterval(timer)
                    resolve()
                }
            }, option.scrollIntervalMs)
        })
    }, option)
}


module.exports = { timeNow, sleep, randomWaitTime, typingDelay, nextDelay, checkIpAddress, autoScroll }