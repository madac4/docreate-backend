const router = require('express').Router();
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');

const { verifyToken } = require('../middleware/middleware');
const User = require('../models/User.js');

router.post(
    '/register',
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
                            expiresIn: '1d', // IN PRODUCTION IT WILL 3600
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

module.exports = router;
