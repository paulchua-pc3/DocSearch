const azureStorage = require('azure-storage');
const multiparty = require('multiparty');
const multer = require('multer');

const express = require('express');

const upload = multer({ "dest": './uploads' });

const settings = require('../settings.json');
var storageAccount = settings.storageAccount;
var accessKey = settings.accessKey;
var containerName = settings.container;

const router = express.Router();

router.post('/',  upload.single('snapshot'), function(req, res) {
	var blobService = azureStorage.createBlobService(storageAccount, accessKey);
	var original_filename = req.file.originalname;
	var temp_filename = req.file.filename;
	blobService.createBlockBlobFromLocalFile(containerName, original_filename, 'uploads/'+temp_filename, function (error) {
		if (error){
			console.log("error on upload");
			res.send('Error');
		}
		res.send('Success');
	});
	/*
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
	*/
});

module.exports = router;