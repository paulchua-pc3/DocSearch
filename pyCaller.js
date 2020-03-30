module.exports = function (query, filename, res) {
    const express = require('express');
    const { spawn } = require('child_process');
    const app = express();
    
    // Spawn new child process to call the python script
    const python = spawn('python', ['ai_ocr_classification.py', query]);

    // Collect data from script
    var response;
    python.stdout.on('data', function (data) {
        if (data != undefined){
            response = JSON.parse(data.toString('utf-8'));
        }
    });
    // Close event, retrieve classify result from stream
    python.on('close', (code) => {        
        if (response.result != undefined) {
            if (response.result.confidence >= 0.9) {
                res(response.result.classification);
            } else {
                res("Irrelevant");
            }
        } else {
            res("Irrelevant");
        }
    });
}