const bodyParser = require('body-parser');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const passport = require('passport');
const DigestStrategy = require('passport-http').DigestStrategy;

const config = require('./config');
let mongoConnection;
let dbConnection;
const collections = {};

async function selectCollection(collectioName) {
	collections[collectioName] = dbConnection.collection(collectioName);
	console.log('Collection "%s" selected.', collectioName);
}

(async () => {
	try {
		mongoConnection = await MongoClient.connect(config.dbUrl, {useNewUrlParser: true});
		console.log('Connected to database.');

		dbConnection = mongoConnection.db(config.dbName);
		console.log('Database "%s" selected.', config.dbName);

		selectCollection(config.logsCollection);
		selectCollection(config.requestsCollection);
		selectCollection(config.loggerCollection);
		selectCollection(config.statsCollection);
	} catch(e) {
		console.error(e);
		process.exit(1);
	}

	const app = express();
	app.use(bodyParser.json());
	
	passport.use(new DigestStrategy({qop: 'auth'}, (username, cb) => {
		if(username !== config.digestUsername) return cb(null, false);
		return cb(null, {}, config.digestPassword);
	}));
	app.get('/monitor', passport.authenticate('digest', {session: false}));
	
	app.get('/monitor/requests', async (req, res) => {
		try {
			const result = await collections[config.requestsCollection].aggregate([
				{$group: {_id: {'path': '$content.path', 'host': '$content.hostname'},  number: {$sum : 1}}},
				{$sort: {'number': -1}}
			]).toArray();
			res.json(result);
		} catch(e) {
			console.error(err);
			res.json({error: 'The request to the database has failed.'});
		};
	});
	
	app.post('/monitor/query', async (req, res) => {
		console.log('Query request received.');

		if(!req.body.filters || ! req.body.entryType)
			return res.json({error: 'Filters and entry type are required in the query.'});

		const filters = req.body.filters;
		const subqueries = [];
	
		let collection;
		if(req.body.entryType == 'logs') {
			if(!filters.collection || !filters.collection.length)
				return res.send({error: 'Missing logs collection.'});
			if(!collections[filters.collection])
				return res.send({error: 'Unknown collection "' + filters.collection + '".'});
			
			// collection to query
			collection = collections[filters.collection];

			if(filters.module && filters.module.length)
				subqueries.push({module: filters.module});
			if(filters.levels && filters.levels.length)
				subqueries.push({level: {$in: filters.levels}});
		}
		else if(req.body.entryType == 'logger') {
			collection = collections[config.loggerCollection];
			if(filters.domainName && filters.domainName.length)
				subqueries.push({'content.hostname': filters.domainName});
			if(filters.ipAddress && filters.ipAddress.length)
				subqueries.push({'content.ip': filters.ipAddress});
			if(filters.userAgent && filters.userAgent.length)
				subqueries.push({'content.user_agent': filters.userAgent});
			if(filters.referer && filters.referer.length)
				subqueries.push({'content.referer': filters.referer});
		}
		else if(req.body.entryType == 'stats')
			collection = collections[config.statsCollection];
		else
			return res.send({error: 'Invalid entry type.'});
	
		// common date filter
		if(filters.dateFrom) {
			if(filters.dateTo)
				subqueries.push({date: {$gte: filters.dateFrom, $lte: filters.dateTo}});
			else
				subqueries.push({date: {$gte: filters.dateFrom}});
		}
		else if(filters.dateTo)
			subqueries.push({date: {$lte: filters.dateTo}});
	
	
		let query;
		if(subqueries.length > 1)
			query = {$and: subqueries};
		else if(subqueries.length == 1)
			query = subqueries[0];
		else
			query = {};
	
		try {
			const entries = await collection.find(query).sort({date: -1}).limit(parseInt(filters.maxEntries)).toArray();
			res.json({error: null, entries});
			console.log('Query response sent successfully.');
		} catch(e) {
			console.error(e);
			res.json({error: 'The request to the database has failed.'});
		}
	});

	app.listen(config.port, (err) => {
		if(err) {
			console.error(err);
			process.exit(1);
		}
		console.log('Server listening on port %s.', config.port);
	});
})();
