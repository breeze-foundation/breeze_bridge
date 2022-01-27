var express = require('express');
const { start } = require('./bridge');
var app = express();

app.get('/', function (req, res) {
  res.send(`Hello World`);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

start();