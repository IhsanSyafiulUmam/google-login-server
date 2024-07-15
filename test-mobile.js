const userAgentString = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.4 Mobile/15E148 Safari/604.1';

// Use a regular expression to check if the user agent string contains "mobile"
const isMobile = /mobile/i.test(userAgentString)
const isDesktop = !isMobile

console.log(`User Agent: ${userAgentString}`)
console.log(`Is Mobile: ${isMobile}`)
console.log(`Is Desktop: ${isDesktop}`)