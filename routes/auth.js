const router = require('express').Router();
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');
const nodemailer = require('nodemailer');
const UAParser = require('ua-parser-js');
const uuid = require('uuid');
const axios = require('axios');
const requestIp = require('request-ip');

const { verifyToken, verifyTokenAndAdmin } = require('../middleware/middleware');
const User = require('../models/User.js');
const Organization = require('../models/Organization.js');
const ActiveSession = require('../models/Session');

const senderEmail = 'contact@stellarsolutions.md';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'orbupetru12@gmail.com',
        pass: 'jzraqoqnwvqngdwl',
    },
});

router.post(
    '/register-admin',
    verifyTokenAndAdmin,
    [
        check('name', 'Introduceți numele').not().isEmpty(),
        check('organization', 'Introduceți numele').not().isEmpty(),
        check('email', 'Introduceți un email valid').isEmail().not(),
        check('password', 'Introduceți o parola de minim 6 caractere').isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
            });
        }

        try {
            let organization = await Organization.findOne({ name: req.body.organization });
            if (!organization) {
                organization = new Organization({
                    name: req.body.organization,
                    admin: null,
                    members: [],
                    invitations: [],
                });
                await organization.save();
            }

            let user = await User.findOne({ email: req.body.email });
            if (user) {
                return res.status(400).json({
                    errors: [{ msg: 'Sunteți deja înregistrat' }],
                });
            }

            const avatar = gravatar.url(req.body.email, {
                s: '200',
                r: 'pg',
                d: 'mm',
            });

            user = new User({
                name: req.body.name,
                email: req.body.email,
                organization: organization._id, // set the user's organization to the organization ID
                password: CryptoJS.AES.encrypt(
                    req.body.password,
                    process.env.PASSWORD_SECURE,
                ).toString(),
                profilePicture: avatar,
                role: organization.admin ? 'Member' : 'Admin', // set the user's role based on whether the organization already has an admin or not
            });

            await user.save();

            if (!organization.admin) {
                organization.admin = user._id; // set the organization's admin to the new user's ID
            }

            organization.members.push(user._id); // add the new user as a member of the organization
            await organization.save();
            res.send(user);
        } catch (error) {
            console.log(error.message);
            res.status(500).send('Server error');
        }
    },
);

router.post(
    '/login',
    [
        check('email', 'Introduceți un email valid').isEmail().not(),
        check('password', 'Introduceți o parola de minim 6 caractere').isLength({ min: 6 }),
    ],
    async (req, res) => {
        try {
            const user = await User.findOne({ email: req.body.email });

            if (user) {
                const decryptedPassword = CryptoJS.AES.decrypt(
                    user.password,
                    process.env.PASSWORD_SECURE,
                ).toString(CryptoJS.enc.Utf8);

                if (decryptedPassword === req.body.password) {
                    const parser = new UAParser();
                    const userAgent = req.headers['user-agent'];
                    const parsedUserAgent = parser.setUA(userAgent).getResult();
                    const browserName = parsedUserAgent.browser.name;
                    const osName = parsedUserAgent.os.name;
                    const ip = requestIp.getClientIp(req);
                    const deviceId = uuid.v4();

                    const response = await axios.get(
                        `http://api.ipstack.com/${ip}?access_key=${process.env.IPSTACK_API_KEY}&format=1`,
                    );

                    const city = `${response.data.country_name}, ${response.data.city}`;

                    const session = new ActiveSession({
                        userId: user._id,
                        deviceId: deviceId,
                        browser: browserName,
                        os: osName,
                        ip: ip,
                        city: city,
                    });

                    await session.save();

                    const payload = {
                        user: {
                            id: user.id,
                        },
                    };

                    jwt.sign(
                        payload,
                        process.env.JWT_SECRET,
                        {
                            expiresIn: '1d',
                        },
                        (err, token) => {
                            if (err) throw err;
                            res.json({ token, sessionId: session._id, deviceId: deviceId });
                        },
                    );
                } else {
                    res.status(401).send({ message: 'Email sau Parola este greșită' });
                }
            } else {
                res.status(400).json({ errors: [{ msg: 'Email sau Parola este greșită' }] });
            }
        } catch (error) {
            res.status(400).send(error);
        }
    },
);

router.get('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.post('/invite', verifyTokenAndAdmin, async (req, res) => {
    const { email } = req.body;

    let user = await User.findOne({ email: email });
    if (user) {
        return res.status(400).json({
            errors: [{ msg: 'Acest utilizator deja exista' }],
        });
    }
    // Create a JWT containing the email and organization ID as payload
    const token = jwt.sign({ email, organization: req.user.organization }, process.env.JWT_SECRET, {
        expiresIn: '24h',
    });

    // Send an email to the user with a link containing the JWT
    // const inviteLink = `http://localhost:3000/register/${token}`;
    const inviteLink = `https://docreate.vercel.app/register/${token}`;
    const mailOptions = {
        from: `DoCreate ${senderEmail}`,
        to: email,
        subject: 'You have been invited to join our organization',
        html: `Please follow this link to create your account: <a href="${inviteLink}">Click Here</a>`,
    };

    await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    res.status(200).json({ message: 'Invitation sent' });
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const token = req.header('x-auth-token');

    try {
        // Verify and decode the JWT
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const avatar = gravatar.url(req.body.email, {
            s: '200',
            r: 'pg',
            d: 'mm',
        });
        const user = new User({
            name: name,
            email: email,
            password: CryptoJS.AES.encrypt(password, process.env.PASSWORD_SECURE).toString(),
            organization: decodedToken.organization,
            profilePicture: avatar,
            role: 'Member',
        });

        // Save the new user in the database
        await user.save();

        res.status(200).json({ message: 'Registration successful' });
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
});

router.get('/register/:token', async (req, res) => {
    const token = req.header('x-auth-token');
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        res.send(decodedToken.email);
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
});

router.post('/forget-password', async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ error: 'Utilizatorul nu a fost găsit' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
    await user.save();

    // const resetLink = `http://localhost:3000/reset-password/${token}`;
    const resetLink = `https://docreate.vercel.app/reset-password/${token}`;

    const mailOptions = {
        from: `DoCreate ${senderEmail}`,
        to: email,
        subject: 'Reset Password',
        html: `You are receiving this email because you (or someone else) has requested a password reset for your account.<br/><br/>
              Please click on the following link, or paste it into your browser to complete the process: <br/><br/>
              <a href="${resetLink}">Resetează parola</a> <br/><br/>
              If you did not request this, please ignore this email and your password will remain unchanged.<br/>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    res.json({ message: 'Verificati email pentru a reseta parola' });
});

router.put('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    const { token } = req.params;

    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.password = CryptoJS.AES.encrypt(
        password.newPassword,
        process.env.PASSWORD_SECURE,
    ).toString();
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Parola a fost resetată' });
});

module.exports = router;

// router.post(
//     '/register',
//     verifyTokenAndAdmin,
//     [
//         check('name', 'Introduceți numele').not().isEmpty(),
//         check('organization', 'Introduceți numele').not().isEmpty(),
//         check('email', 'Introduceți un email valid').isEmail().not(),
//         check('password', 'Introduceți o parola de minim 6 caractere').isLength({ min: 6 }),
//     ],
//     async (req, res) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({
//                 errors: errors.array(),
//             });
//         }

//         try {
//             let user = await User.findOne({ email: req.body.email });

//             if (user) {
//                 return res.status(400).json({
//                     errors: [{ msg: 'Sunteți deja înregistrat' }],
//                 });
//             }

//             const avatar = gravatar.url(req.body.email, {
//                 s: '200',
//                 r: 'pg',
//                 d: 'mm',
//             });

//             user = new User({
//                 name: req.body.name,
//                 email: req.body.email,
//                 organization: req.body.organization,
//                 password: CryptoJS.AES.encrypt(
//                     req.body.password,
//                     process.env.PASSWORD_SECURE,
//                 ).toString(),
//                 profilePicture: avatar,
//             });

//             await user.save();
//             res.send(user);
//         } catch (error) {
//             console.log(error.message);
//             res.status(500).send('Server error');
//         }
//     },
// );
