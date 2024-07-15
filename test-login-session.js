const Google = require('./app/controllers/google')
const google = new Google()

// const email = 'email.verification@alphadatalabs.com'
// const email = 'james@alphadatalabs.com'
const email = 'miaublubuk@gmail.com'
// const email = 'ihsansyafiul@gmail.com'

// const email = 'dudungraharjo24@gmail.com'
// const email = 'zotacgaming22@gmail.com'
// const email = 'zonaupdateee@gmail.com'
// const proxy = 'user49076:k8k4D75aqu@154.202.3.68:49076'
const proxy = ''

google.loginWithSession({ email: email, proxy: proxy })