const router = require('express').Router();

const {
    inviteUser,
    getEmailFromToken,
    registerUser,
    getUser,
    forgetPassword,
    resetPassword,
    loginUser,
} = require('../controllers/AuthController');
const {
    registerValidation,
    loginValidation,
    mailValidation,
    passwordValidation,
} = require('../validation/auth');
const { verifyToken, verifyTokenAndAdmin } = require('../middleware/middleware');

router.post('/invite', [verifyTokenAndAdmin, mailValidation], inviteUser);
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/forget-password', mailValidation, forgetPassword);
router.get('/', verifyToken, getUser);
router.get('/register/:token', getEmailFromToken);
router.put('/reset-password/:token', passwordValidation, resetPassword);

module.exports = router;

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
