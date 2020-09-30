const validator = require("../controllers/validator.controller");
const reader = require("../controllers/reader.controller");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
            );
        next();
    });
        
    app.post('/checkZip', validator.checkZip);
    app.post('/readInternalFile', reader.readInternalFile);
    
    app.get('/ping', function(req, res) {
        res.send('pong');
    });

};
