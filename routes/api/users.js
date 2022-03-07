const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../../models/Users');

//Route to register a new user
router.post(
	'/',
	[
		check('name', 'Name is required').not().isEmpty(),
		check('email', 'Please enter a valid email').isEmail(),
		check('password', 'Password must not be less than 6 characters').isLength({
			min: 6,
		}),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		try {
			const { name, email, password } = req.body;
			let user = await User.findOne({ email: email });
			if (user) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'User already exist' }] });
			}
			const avatar = gravatar.url(email, {
				s: '200',
				r: 'pg',
				d: 'm',
			});

			user = new User({
				name,
				password,
				email,
				avatar,
			});
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);

			await user.save();
			//res.send('User registered');
			const payload = {
				user: {
					id: user.id,
				},
			};
			jwt.sign(
				payload,
				config.get('jwtSecret'),
				{ expiresIn: 36000 },
				(err, token) => {
					if (err) throw err;
					res.json({ token });
				}
			);
		} catch (err) {
			res.status(500).send('Server Error');
		}
	}
);

module.exports = router;
