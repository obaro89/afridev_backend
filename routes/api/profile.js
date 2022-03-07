const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/Users');
const { check, validationResult } = require('express-validator');

//Get loggedin user's profile
//Access is private
router.get('/me', auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id }).populate(
			'user',
			['name', 'avatar']
		);
		if (!profile) {
			return res.status(400).json({ msg: 'User does not have a profile' });
		}
		res.json(profile);
	} catch (error) {
		console.error(error);
		res.status(500).send('server error');
	}
});

//POST request to create or update user's profile
//Access is private

router.post(
	'/',
	[
		auth,
		[
			check('status', 'Status is required').not().isEmpty(),
			check('skills', 'Skill is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		// Get fields
		const profileFields = {};

		profileFields.user = req.user.id;
		if (req.body.company) profileFields.company = req.body.company;
		if (req.body.website) profileFields.website = req.body.website;
		if (req.body.location) profileFields.location = req.body.location;
		if (req.body.bio) profileFields.bio = req.body.bio;
		if (req.body.status) profileFields.status = req.body.status;
		if (req.body.githubusername)
			profileFields.githubusername = req.body.githubusername;
		// Skills - Spilt into array
		if (typeof req.body.skills !== 'undefined') {
			profileFields.skills = Array.from(req.body.skills.split(','));
		}

		// Social
		profileFields.social = {};
		if (req.body.youtube) profileFields.social.youtube = req.body.youtube;
		if (req.body.twitter) profileFields.social.twitter = req.body.twitter;
		if (req.body.facebook) profileFields.social.facebook = req.body.facebook;
		if (req.body.linkedin) profileFields.social.linkedin = req.body.linkedin;
		if (req.body.instagram) profileFields.social.instagram = req.body.instagram;

		try {
			let profile = await Profile.findOne({ user: req.user.id });
			if (profile) {
				profile = await Profile.findOneAndUpdate(
					{ user: req.user.id },
					{ $set: profileFields },
					{ new: true }
				);
			} else {
				profile = new Profile(profileFields);
				await profile.save();
				return res.json(profile);
			}
		} catch (e) {
			console.log(e);
			res.status(500).send('Server error');
		}
	}
);

//Get all users profile
//public access

router.get('/', async (req, res) => {
	try {
		const profiles = await Profile.find().populate('user', ['name', 'avatar']);
		if (profiles) res.json(profiles);
	} catch (error) {
		console.error(error.message);
		res.status(500).send('server error');
	}
});

//Get a user profile/user/:id
//public access
//by user id

router.get('/user/:id', async (req, res) => {
	console.log(req.params.id);
	try {
		const profile = await Profile.findOne({ user: req.params.id }).populate(
			'user',
			['name', 'avatar']
		);
		if (!profile) return res.status(400).json({ msg: 'Profile not found' });

		return res.json(profile);
	} catch (error) {
		console.error(error.message);
		if (error.kind === 'ObjectId') {
			return res.status(400).json({ msg: 'Profile not found' });
		}
		res.status(500).send('server error');
	}
});

//DELETE user profile and posts
//private access

router.delete('/', auth, async (req, res) => {
	try {
		//todo: remove user's post

		await Profile.findOneAndRemove({ user: req.user.id });
		await User.findOneAndRemove({ _id: req.user.id });
		res.json({ msg: 'User deleted' });
	} catch (error) {
		console.error(error.message);
		res.status(500).send('server error');
	}
});

//Update / add user profile experience
//PUT method, and private access

router.put(
	'/experience',
	[
		auth,
		[
			check('title', 'Job titile is required').not().isEmpty(),
			check('company', 'Company is required').not().isEmpty(),
			check('from', 'Job start date is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const error = validationResult(req);
		if (!error.isEmpty()) {
			return res.status(400).json({ errors: error.array() });
		}
		const { title, company, location, from, to, current, description } =
			req.body;
		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description,
		};
		try {
			const profile = await Profile.findOne({ user: req.user.id });
			if (profile) {
				profile.experience.unshift(newExp);
				const response = await profile.save();
				return res.json(profile);
			}
		} catch (error) {
			console.error(error.message);
		}
	}
);

//Delete a profile experience
//private route
//Delete request
router.delete('/experience/:id', auth, async (req, res) => {
	try {
		let profile = await Profile.findOne({ user: req.user.id });
		const toBeRemovedIndex = profile.experience
			.map((exp) => exp.id)
			.indexOf(req.params.id);
		if (toBeRemovedIndex !== -1) {
			profile.experience.splice(toBeRemovedIndex, 1);
			await profile.save();
			return res.send(profile);
		} else {
			return res.status(400).json({ msg: 'Experience not found' });
		}
	} catch (error) {
		console.error(error.message);
	}
});

router.put(
	'/education',
	auth,
	check('school', 'School is required').notEmpty(),
	check('degree', 'Degree is required').notEmpty(),
	check('fieldofstudy', 'Field of study is required').notEmpty(),
	check('from', 'From date is required and needs to be from the past')
		.notEmpty()
		.custom((value, { req }) => (req.body.to ? value < req.body.to : true)),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		try {
			const profile = await Profile.findOne({ user: req.user.id });

			profile.education.unshift(req.body);

			await profile.save();

			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route    DELETE api/profile/education/:edu_id
// @desc     Delete education from profile
// @access   Private

router.delete('/education/:edu_id', auth, async (req, res) => {
	try {
		const foundProfile = await Profile.findOne({ user: req.user.id });
		foundProfile.education = foundProfile.education.filter(
			(edu) => edu._id.toString() !== req.params.edu_id
		);
		await foundProfile.save();
		return res.status(200).json(foundProfile);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ msg: 'Server error' });
	}
});

// @route    GET api/profile/github/:username
// @desc     Get user repos from Github
// @access   Public
router.get('/github/:username', async (req, res) => {
	try {
		const uri = encodeURI(
			`https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
		);
		const headers = {
			'user-agent': 'node.js',
			Authorization: `token ${config.get('githubToken')}`,
		};

		const gitHubResponse = await axios.get(uri, { headers });
		return res.json(gitHubResponse.data);
	} catch (err) {
		console.error(err.message);
		return res.status(404).json({ msg: 'No Github profile found' });
	}
});
module.exports = router;
