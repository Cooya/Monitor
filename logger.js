const path = require('path');
const util = require('util');
const { createLogger, config, format, transports } = require('winston');

const dbConfig = require('./config').logging;

let transport;
let exitOnError;
const formats = [
	format.timestamp({ format: 'DD/MM HH:mm:ss' }),
	format.label({ label: path.basename(process.mainModule.filename) }),
	format.errors({ stack: true }),
	format.splat(),
	format.printf(info => {
		info.message = typeof info.message === 'object' ? util.inspect(info.message) : info.message;
		return `${info.timestamp} ${info.level} [${info.label}] ${info.message} ${info.stack || ''}`;
	})
];

if (process.env.NODE_ENV == 'production' || process.env.NODE_ENV == 'prod') {
	if(!dbConfig)
		throw new Error('MongoDB configuration required for creating a MongoDB log transport.');

	require('winston-mongodb');
	transport = new transports.MongoDB({
		level: 'debug',
		db: dbConfig.dbUrl,
		collection: dbConfig.collection,
		label: path.basename(process.mainModule.filename),
		handleExceptions: true,
		format: format.metadata({ fillWith: ['stack'] })
	});
	exitOnError = false;
} else {
	formats.unshift(format.colorize());
	transport = new transports.Console({
		level: process.env.NODE_ENV == 'debug' ? 'debug' : 'info',
		handleExceptions: true
	});
	exitOnError = true;
}

const logger = createLogger({
	levels: config.syslog.levels,
	level: 'debug',
	exitOnError,
	transports: [transport],
	format: format.combine(...formats)
});

module.exports = logger;
