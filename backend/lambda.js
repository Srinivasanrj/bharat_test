const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const schemeRoutes = require('./routes/schemes');
const conversationRoutes = require('./routes/conversation');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/schemes', schemeRoutes);
app.use('/api/conversation', conversationRoutes);

app.get('/', (req, res) => {
    res.send('Mitra API is running on AWS Lambda...');
});

module.exports.handler = serverless(app);
