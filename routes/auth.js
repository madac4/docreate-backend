const { validationResult } = require('express-validator');
const router = require('express').Router();
const nodemailer = require('nodemailer');
const CryptoJS = require('crypto-js');
const gravatar = require('gravatar');
const jwt = require('jsonwebtoken');

const { verifyToken, verifyTokenAndAdmin } = require('../middleware/middleware');
const Organization = require('../models/Organization.js');
const { registerValidation, loginValidation } = require('../validation/auth');
const ActiveSession = require('../models/Session');
const User = require('../models/User.js');

const senderEmail = 'contact@stellarsolutions.md';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'orbupetru12@gmail.com',
        pass: 'jzraqoqnwvqngdwl',
    },
});

//? USER INVITE
router.post('/invite', verifyTokenAndAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        let user = await User.findOne({ email: email });
        if (user) {
            return res.status(400).json({
                errors: [{ msg: 'Acest utilizator deja exista' }],
            });
        }

        const token = jwt.sign(
            { email, organization: req.user.organization },
            process.env.JWT_SECRET,
            {
                expiresIn: '30m',
            },
        );

        const inviteLink = `http://localhost:3000/register/${token}`;
        // const inviteLink = `https://docreate.vercel.app/register/${token}`;
        const mailOptions = {
            from: `DoCreate ${senderEmail}`,
            to: email,
            subject: 'You have been invited to join our organization',
            html: `Please follow this link to create your account: <a href="${inviteLink}">Click Here</a>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Invitația a fost trimisă' });
    } catch (error) {
        res.status(400).json({ message: 'Invitația nu a putut fi trimisa' });
    }
});
//? USER INVITE

//? GET INVITED USER EMAIL BY TOKEN
router.get('/register/:token', async (req, res) => {
    const token = req.header('x-auth-token');
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        res.send(decodedToken.email);
    } catch (error) {
        res.status(400).json({ message: 'Invalid token' });
    }
});
//? GET INVITED USER EMAIL BY TOKEN

//? REGISTER USER
router.post('/register', registerValidation, async (req, res) => {
    const { name, email, password } = req.body;
    const token = req.header('x-auth-token');

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const avatar = gravatar.url(email, { s: '200', r: 'pg', d: 'mm' });

        const encryptedPassword = CryptoJS.AES.encrypt(
            password,
            process.env.PASSWORD_SECURE,
        ).toString();

        await User.create({
            name,
            email,
            password: encryptedPassword,
            organization: decodedToken.organization,
            profilePicture: avatar,
            role: 'Member',
        });

        res.status(200).json({ message: 'Contul a fost creat cu succes' });
    } catch (error) {
        res.status(400).json({ message: 'Contul nu a putut fi creat' });
    }
});
//? REGISTER USER

//? LOGIN USER
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.status(400).json({ errors: [{ msg: 'Email sau Parola este greșită' }] });
    }

    const decryptedPassword = CryptoJS.AES.decrypt(
        user.password,
        process.env.PASSWORD_SECURE,
    ).toString(CryptoJS.enc.Utf8);

    if (decryptedPassword !== req.body.password) {
        return res.status(401).send({ message: 'Email sau Parola este greșită' });
    }

    const payload = {
        user: {
            id: user.id,
        },
    };

    jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
            expiresIn: req.body.remember ? '14d' : '12h',
        },
        (err, token) => {
            if (err) throw err;
            res.json({ token });
        },
    );
});
//? LOGIN USER

//? GET USER
router.get('/', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});
//? GET USER

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

// const router = require('express').Router();

// const {
//     inviteUser,
//     getEmailFromToken,
//     registerUser,
//     getUser,
//     forgetPassword,
//     resetPassword,
//     loginUser,
// } = require('../controllers/AuthController');
// const {
//     registerValidation,
//     loginValidation,
//     mailValidation,
//     passwordValidation,
// } = require('../validation/auth');
// const { verifyToken, verifyTokenAndAdmin } = require('../middleware/middleware');

// router.post('/invite', [verifyTokenAndAdmin, mailValidation], inviteUser);
// router.post('/register', registerValidation, registerUser);
// router.post('/login', loginValidation, loginUser);
// router.post('/forget-password', mailValidation, forgetPassword);
// router.get('/', verifyToken, getUser);
// router.get('/register/:token', getEmailFromToken);
// router.put('/reset-password/:token', passwordValidation, resetPassword);

// module.exports = router;

//! COMMENTED ROUTES
//* REGISTRER ADMIN
// router.post(
//     '/register-admin',
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
//             let organization = await Organization.findOne({ name: req.body.organization });
//             if (!organization) {
//                 organization = new Organization({
//                     name: req.body.organization,
//                     admin: null,
//                     members: [],
//                     invitations: [],
//                 });
//                 await organization.save();
//             }

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
//                 organization: organization._id, // set the user's organization to the organization ID
//                 password: CryptoJS.AES.encrypt(
//                     req.body.password,
//                     process.env.PASSWORD_SECURE,
//                 ).toString(),
//                 profilePicture: avatar,
//                 role: organization.admin ? 'Member' : 'Admin', // set the user's role based on whether the organization already has an admin or not
//             });

//             await user.save();

//             if (!organization.admin) {
//                 organization.admin = user._id; // set the organization's admin to the new user's ID
//             }

//             organization.members.push(user._id); // add the new user as a member of the organization
//             await organization.save();
//             res.send(user);
//         } catch (error) {
//             console.log(error.message);
//             res.status(500).send('Server error');
//         }
//     },
// );
//* REGISTRER ADMIN

//* REGISTRER
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
//* REGISTRER

//! COMMENTED ROUTES
