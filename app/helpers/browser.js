const config = require('../../config')
const logger = require('./logger')
const puppeteer = require('puppeteer-extra')
const stealthPlugin = require('puppeteer-extra-plugin-stealth')
const UserAgent = require('user-agents')
const ShortUniqueId = require('short-unique-id')


puppeteer.use(stealthPlugin())

async function initializeBrowser({
    email,
    userAgent = new UserAgent({ deviceCategory: 'desktop', vendor: 'Google Inc.' }).toString(),
    useProxy = true,
    proxy = `user49213:17UwJY0LJf@154.202.3.50:49213`,
    cookies = null,
} = {}) {
    let args, proxyServer, proxyUsername, proxyPassword, windowWidth, windowHeight

    logger.info(`User agent: ${userAgent}`)

    const isMobile = /mobile/i.test(userAgent)
    if (isMobile) {
        logger.debug('Mobile user agent detected')
        windowWidth = 414
        windowHeight = 896
    } else {
        logger.debug('Desktop user agent detected')
        windowWidth = 1366
        windowHeight = 768
    }

    args = [
        '--no-sandbox',
        '--disable-remote-fonts',
        `--window-size=${windowWidth},${windowHeight}`,
        '--disable-notifications',
    ]

    if (useProxy) {
        // proxyServer = proxy.split('@')[1]
        // proxyUsername = proxy.split(':')[0]
        // proxyPassword = proxy.split(':')[1].split('@')[0]
        
        const sessid = new ShortUniqueId({ length: 16 }).rnd()
        const proxyStickyMinutes = 10 // set duration of sticky session
        
        
        proxyServer = 'geo.iproyal.com:12321'
        proxyUsername = 'aoIkPjAuJPx187M2'
        proxyPassword = `zfSlg68BY09HLQoC_country-id_city_session-${sessid}_lifetime-${proxyStickyMinutes}`
        args.push(`--proxy-server=${proxyServer}`)
        
    }

    const browser = await puppeteer.launch({
        headless: config.headlessMode,
        devtools: false,
        args: args,
        userDataDir: `./user_data/${email}`,
    })

    const page = (await browser.pages())[0]
    await page.setViewport({ width: windowWidth, height: windowHeight })
    await page.setUserAgent(userAgent)
    await page.setExtraHTTPHeaders({ Connection: 'close' })
    await page.evaluateOnNewDocument(
        `navigator.mediaDevices.getUserMedia = navigator.webkitGetUserMedia = navigator.mozGetUserMedia = navigator.getUserMedia = webkitRTCPeerConnection = RTCPeerConnection = MediaStreamTrack = undefined;`
    )

    

    if (useProxy) {
        await page.authenticate({ username: proxyUsername, password: proxyPassword })
    }

    // if (cookies) {
    //     await page.setCookie(...cookies);
    //   }

    return { browser, page }
}


module.exports = initializeBrowser