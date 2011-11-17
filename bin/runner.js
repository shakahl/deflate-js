#!/usr/bin/env node
(function () {
	'use strict';

	var fs = require('fs'),
		optimist = require('optimist'),
		deflate = require('../index'),
		Base64 = require('../examples/base64'),
		argv,
		level,
		out;

	argv = optimist.usage('Usage: $0 --level [1-9] --file [filename] --output [filename]')
			.alias({
				'f': 'file',
				'o': 'output',
				'l': 'level'
			})
			.default('level', deflate.deflate.DEFAULT_LEVEL)
			.demand(['file', 'output']).argv;

	out = deflate.deflate(fs.readFileSync(argv.file, 'utf8'), level);

	fs.writeFileSync(argv.output, new Buffer(out));
}());
