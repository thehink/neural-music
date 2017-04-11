import express from 'express';
let app = express();

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('hello world!!!')
});

app.listen(4000, function () {
  console.log('Web server listening on port 4000');
})
