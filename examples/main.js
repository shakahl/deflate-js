(function () {
	'use strict';

	var inflate = require('../lib/rawinflate.js'),
		deflate = require('../lib/rawdeflate.js'),
		Base64 = require('./base64'),
		ender = require('ender');

	ender.domReady(function () {	
		ender('#inflated').bind('keyup', function () {
			var self = this, dst = ender('#deflated');

			setTimeout(function(){
				dst.val(Base64.toBase64(deflate(Base64.utob(self.value))));
			},0);
		});
		ender('#deflated').bind('keyup', function () {
			var self = this, dst = ender('#inflated');
			setTimeout(function(){
				dst.val(Base64.btou(inflate(Base64.fromBase64(self.value))));
			},0);
		});
	});
}());
