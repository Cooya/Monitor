const MongoClient = require('mongodb').MongoClient;
const randomText = require('random-textblock');

const config = require('../config').app;
const logger = require('../logger');

const levels = ['error', 'warning', 'info', 'notice', 'debug'];
const modules = ['server.js', 'controller.js', 'helper.js', 'upload.js', 'builder.js', 'engine.js'];
const textOptions = {
	minWords: 8,
	maxWords: 16,
	minSentences: 1,
	maxSentences: 1
};

async function processCollection(dbConnection, collectionName) {
	let collection = dbConnection.collection(collectionName);
	if(await collection.countDocuments() > 0)
		await collection.drop();

	let date = new Date();
	for (let i = 0; i < 1000; ++i) {
		date.setSeconds(date.getSeconds() - Math.floor(Math.random() * 10000));
		await collection.insertOne({
			level: levels[Math.floor(Math.random() * levels.length)],
			message: randomText.getTextBlock(textOptions),
			timestamp: date,
			label: modules[Math.floor(Math.random() * modules.length)]
		});
	}
}

(async () => {
	let mongoConnection;
	let dbConnection;
	try {
		mongoConnection = await MongoClient.connect(config.dbUrl, {useNewUrlParser: true});
		dbConnection = mongoConnection.db();
		for(collectionName of config.logsCollections)
			await processCollection(dbConnection, collectionName);
	} catch (e) {
		logger.error(e);
	}
	mongoConnection.close();
})();
