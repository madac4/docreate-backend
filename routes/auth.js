const router = require('express').Router();
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');
const nodemailer = require('nodemailer');

const { verifyToken, verifyTokenAndAdmin } = require('../middleware/middleware');
const User = require('../models/User.js');

let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'ottilie.hand81@ethereal.email',
        pass: 'sPrf6kFcwvAZ75aCQb',
    },
});

router.post(
    '/register',
    verifyTokenAndAdmin,
    [
        check('name', 'Introduceți numele').not().isEmpty(),
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
                password: CryptoJS.AES.encrypt(
                    req.body.password,
                    process.env.PASSWORD_SECURE,
                ).toString(),
                profilePicture: avatar,
                role: req.body.role,
            });

            await user.save();
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
                            res.json({ token });
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

    const resetLink = `https://docreate.vercel.app/reset-password/${token}`;

    const mailOptions = {
        from: '"Fred Foo 👻" <foo@example.com>',
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
