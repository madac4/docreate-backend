const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const documentRoute = require('./routes/document');
const organizationRoute = require('./routes/organizations');

const app = express();
const port = 3002;
app.use(bodyParser.json());
const corsOptions = {
    origin: '*',
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

mongoose.set('strictQuery', false);
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Database connect successfull'))
    .catch((err) => console.log(err));

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/documents', documentRoute);
app.use('/api/organizations', organizationRoute);

app.listen(port, () => console.log(`Server listening on port ${port}`));
