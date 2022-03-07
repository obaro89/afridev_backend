const config = require('config');
const mongoose = require('mongoose');
const db = config.get('mongoURL');

const connectDB = async () => {
	try {
		await mongoose.connect(db, {
			useCreateIndex: true,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
		});
		console.log('Database connected!');
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
};

module.exports = connectDB;
