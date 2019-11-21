const azureStorage = require('azure-storage');
const multiparty = require('multiparty');
const express = require('express');

const settings = require('../settings.json');
var storageAccount = settings.storageAccount;
var accessKey = settings.accessKey;
var containerName = settings.container;

const router = express.Router();

router.post('/', function(req, res) {
	var blobService = azureStorage.createBlobService(storageAccount, accessKey);
	const form = new multiparty.Form();
	form.on('part', function(part) {
		if (part.filename) {
	      var size = part.byteCount;
	      var name = part.filename;

	      blobService.createBlockBlobFromStream(containerName, name, part, size, function (error) {
	        var result = {"result": "success"};
			if (error) {
				result = {"result":"error"};
				console.log(error);
			}
	      });
	    } else {
	      form.handlePart(part);
	    }
	});
	form.parse(req);
	res.render('index', { 
        message: 'Success' 
    });
});

module.exports = router;