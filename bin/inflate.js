#!/usr/bin/env node
(function () {
	'use strict';

	var fs = require('fs'),
		path = require('path'),
		optimist = require('optimist'),
		deflate = require('../index'),
		Base64 = require('../examples/base64'),
		argv,
		out;

	argv = optimist.usage('Usage: $0 --file [filename] --output [filename]')
			.alias({
				'f': 'file',
				'o': 'output'
			}).demand(['file']).argv;

	out = deflate.inflate(fs.readFileSync(argv.file));

	if (!argv.output) {
		argv.output = path.basename(argv.file).replace(/\.deflate$/, '');
	}

	console.log(argv.output);

	fs.writeFileSync(argv.output, new Buffer(out));
}());
