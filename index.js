const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoute = require('./routes/auth');
const userRoute = require('./routes/user');

const app = express();
const port = 3002;
app.use(cors());
app.use(bodyParser.json());

mongoose.set('strictQuery', false);
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Database connect successfull'))
    .catch((err) => console.log(err));

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);

app.listen(port, () => console.log(`Server listening on port ${port}`));
