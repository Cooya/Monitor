const bodyParser = require('body-parser');
const express = require('express');
const logger = require('@coya/logger')(require('./config').logging);
const MongoClient = require('mongodb').MongoClient;

let config = require('./config').app;
let mongoConnection;
let dbConnection;
const collections = {};

async function selectCollection(collectioName) {
	collections[collectioName] = dbConnection.collection(collectioName);
	logger.info('Collection "%s" selected.', collectioName);
}

(async () => {
	try {
		mongoConnection = await MongoClient.connect(config.dbUrl, {useNewUrlParser: true});
		dbConnection = mongoConnection.db();
		logger.info('Connected to database.');

		config.logsCollections.forEach(collection => selectCollection(collection));
		selectCollection(config.requestsCollection);
		selectCollection(config.loggerCollection);
		selectCollection(config.statsCollection);
	} catch(e) {
		logger.error(e);
		process.exit(1);
	}

	const app = express();
	app.use(bodyParser.json());
	app.use('/', express.static(config.webInterfaceBuildFolder));
	
	app.get('/monitor/requests', async (req, res) => {
		try {
			const result = await collections[config.requestsCollection].aggregate([
				{$group: {_id: {'path': '$content.path', 'host': '$content.hostname'},  number: {$sum : 1}}},
				{$sort: {'number': -1}}
			]).toArray();
			res.json(result);
		} catch(e) {
			logger.error(err);
			res.json({error: 'The request to the database has failed.'});
		};
	});

	app.get('/monitor/config', async (req, res) => {
		logger.info('Config request received.');
		res.json({collections: config.logsCollections});
		logger.info('Config response sent sucessfully.');
	});
	
	app.post('/monitor/query', async (req, res) => {
		logger.info('Query request received.');

		if(!req.body.filters || ! req.body.entryType)
			return res.json({error: 'Filters and entry type are required in the query.'});

		const filters = req.body.filters;
		logger.debug(filters);
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
				subqueries.push({label: filters.module});
			if(filters.levels && filters.levels.length) {
				filters.levels = filters.levels.map(v => v.value);
				subqueries.push({level: {$in: filters.levels}});
			}
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
				subqueries.push({timestamp: {$gte: new Date(filters.dateFrom), $lte: new Date(filters.dateTo)}});
			else
				subqueries.push({timestamp: {$gte: new Date(filters.dateFrom)}});
		}
		else if(filters.dateTo)
			subqueries.push({timestamp: {$lte: new Date(filters.dateTo)}});
	
	
		let query;
		if(subqueries.length > 1)
			query = {$and: subqueries};
		else if(subqueries.length == 1)
			query = subqueries[0];
		else
			query = {};
	
		logger.debug(JSON.stringify(query));

		try {
			const entries = await collection.find(query).sort({date: -1}).limit(parseInt(filters.maxEntries)).toArray();
			res.json({error: null, entries});
			logger.info('Query response sent successfully, %s entries sent.', entries.length);
		} catch(e) {
			logger.error(e);
			res.json({error: 'The request to the database has failed.'});
		}
	});

	app.listen(config.port, (err) => {
		if(err) {
			logger.error(err);
			process.exit(1);
		}
		logger.info('Server listening on port %s (%s environment).', config.port, process.env.NODE_ENV);
	});
})();
