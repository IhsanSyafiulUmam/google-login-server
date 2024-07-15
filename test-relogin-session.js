const Google = require('./app/controllers/google')
const google = new Google()

// const email = 'email.verification@alphadatalabs.com'
const email = 'miaublubuk@gmail.com'
// const email = 'james@alphadatalabs.com'

// const email = 'bob@alphadatalabs.com'
// const proxy = 'user49076:k8k4D75aqu@154.202.3.68:49076'
const proxy = ''

google.reloginSession({ email: email, proxy: proxy })