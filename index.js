const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const documentRoute = require('./routes/document');
const organizationRoute = require('./routes/organizations');

const port = 3002;
const app = express();
app.use(bodyParser.json());
app.use(cors());

// mongoose.set('strictQuery', false);
// mongoose
//     .connect(process.env.MONGODB_URI)
//     .then(() => console.log('Database connect successfull'))
//     .catch((err) => console.log(err));

// app.use('/api/auth', authRoute);
// app.use('/api/users', userRoute);
// app.use('/api/documents', documentRoute);
// app.use('/api/organizations', organizationRoute);

app.listen(port, () => console.log(`Server listening on port ${port}`));
app.get('/', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS, DELETE');
    if (req.method === 'OPTIONS') {
        return res.status(200).json({
            body: 'SUKA DAAA',
        });
    }
});
