const Google = require('./app/controllers/google')
const google = new Google()

// const email = 'email.verification@alphadatalabs.com'
// const password = 'ADLVerify@123'
// const proxy = 'user49213:17UwJY0LJf@154.202.3.50:49213'

// const email = 'bob@alphadatalabs.com'
// const password = 'ADLBob@123'

const email = 'james@alphadatalabs.com'
const password = 'ADLJames@123'

// const email = 'zotacgaming22@gmail.com'
// const email = 'zonaupdateee@gmail.com'
// const email = 'miaublubuk@gmail.com'
// const password = 'Jogj@6602'

// const email = 'yuriramonaz@gmail.com'
// const password = 'lumajang'
// const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' // Windows 10
const userAgent = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' // Android
const useProxy = true
// const proxy = 'user49026:Vr274RCnRa@154.202.3.58:49026'
const proxy = null

google.newLoginWithCredentials({
    email: email,
    password: password,
    userAgent: userAgent,
    useProxy: useProxy,
    proxy: proxy
})