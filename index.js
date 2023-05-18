const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

require('dotenv').config();

const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');
const documentRoute = require('./routes/document');
const organizationRoute = require('./routes/organizations');

// const sessionRoute = require('./routes/sessions');

const app = express();
app.use(bodyParser.json());
app.use(cors());

mongoose.set('strictQuery', false);

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Database connect successfull'))
    .catch((err) => console.log(err));

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/documents', documentRoute);
app.use('/api/organizations', organizationRoute);
// app.use('/api/sessions', sessionRoute);

app.listen(process.env.PORT || 3003, (err) => {
    err ? console.log(err) : console.log(`Server is running on port ${process.env.PORT || 3003}`);
});
