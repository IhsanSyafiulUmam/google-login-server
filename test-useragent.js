const express = require('express');
const app = express();

app.get('/', (req, res) => {
    const userAgent = req.headers['user-agent'];
    console.log(userAgent);
    res.send('User Agent: ' + userAgent);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
