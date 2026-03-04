const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const schemeRoutes = require('./routes/schemes');
const conversationRoutes = require('./routes/conversation');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/schemes', schemeRoutes);
app.use('/api/conversation', conversationRoutes);

app.get('/', (req, res) => {
  res.send('Mitra API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
