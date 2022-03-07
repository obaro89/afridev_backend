const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const User = require('../../models/Users');
const { check, validationResult } = require('express-validator');

//POST request to create a post
//Access is private
// api/post
router.post(
	'/',
	[auth, [check('text', 'Text is required').not().isEmpty()]],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		try {
			const user = await User.findById(req.user.id).select('-password');
			const newPost = {
				user: req.user.id,
				text: req.body.text,
				avatar: user.avatar,
				name: user.name,
			};
			const post = new Post(newPost);
			await post.save();
			res.json(post);
		} catch (error) {
			console.error(error.message);
		}
	}
);

//get all posts api/posts
//private route
router.get('/', auth, async (req, res) => {
	try {
		const posts = await Post.find().sort({ date: -1 });
		if (posts) {
			res.json(posts);
		}
	} catch (error) {
		console.error(error);
	}
});

//get a post api/post/:id
//private route
router.get('/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ msg: 'Post not found' });
		}

		res.json(post);
	} catch (error) {
		if (error.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not found' });
		}
		console.error(error);
	}
});

//get a post api/post/:id
//private route
router.delete('/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (post.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: 'User not authorized' });
		}
		await post.remove();
		res.json({ msg: 'Post removed' });
	} catch (error) {
		if (error.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Post not found' });
		}
		console.error(error);
	}
});

//Like and unlike post
//PUT request
//access is private

router.put('/like/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (post.likes.filter((like) => like.id === req.user.id).length > 0) {
			return res.json({ msg: 'Post has already been liked.' });
		}
		post.likes.push(req.user.id);
		await post.save();
		res.json(post.likes);
	} catch (error) {
		console.error(error.message);
	}
});

//Like and unlike post
//PUT request
//access is private

router.put('/unlike/:id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		const filtered = post.likes.filter((like) => like.id === req.user.id);
		if (filtered.length > 0) {
			const removeIndex = post.likes
				.map((like) => like.id)
				.indexOf(req.user.id);
			post.likes.splice(removeIndex, 1);
			await post.save();
			return res.status(200);
		}
		return res.json({ msg: 'Post has not been liked' });
	} catch (error) {
		console.error(error);
	}
});

//Add a comment to a post
//POST request
//Access is private
//route api/posts/comment/:id
router.post(
	'/comment/:id',
	[auth, [check('text', 'Comment is required').not().isEmpty()]],
	async (req, res) => {
		try {
			const { name, avatar } = await User.findById(req.user.id).select(
				'-password'
			);
			const post = await Post.findById(req.params.id);

			post.comments.unshift({
				text: req.body.text,
				user: req.user.id,
				name: name,
				avatar: avatar,
			});
			await post.save();
			res.json(post.comments);
		} catch (error) {
			console.error(error);
		}
	}
);

router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);

		// Pull out comment
		const comment = post.comments.find(
			(comment) => comment.id === req.params.comment_id
		);
		// Make sure comment exists
		if (!comment) {
			return res.status(404).json({ msg: 'Comment does not exist' });
		}
		// Check user
		if (comment.user.toString() !== req.user.id) {
			return res.status(401).json({ msg: 'User not authorized' });
		}

		post.comments = post.comments.filter(
			({ id }) => id !== req.params.comment_id
		);

		await post.save();

		return res.json(post.comments);
	} catch (err) {
		console.error(err.message);
		return res.status(500).send('Server Error');
	}
});

module.exports = router;
