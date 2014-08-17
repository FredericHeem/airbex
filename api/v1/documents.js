var log = require('../log')(__filename)
, debug = log.debug;
var _ = require('lodash');
var fs = require('fs');
var format = require('util').format;

module.exports = exports = function(app) {
    exports.app = app
    var upload = app.upload

    app.post('/v1/users/documents', app.security.demand.primary(1), exports.uploadId)
    app.get('/v1/users/documents', app.security.demand.primary(1), exports.getIds)
}

exports.uploadId = function(req, res, next) {
    
    var now = new Date();
    if(!req.files || !req.files.document){
        debug("uploadId no doc");
        return res.send(400, {
            name: 'BadRequest',
            message: 'Request is invalid'
        })
    }
    var document = req.files.document;
    
    var upload_path = req.user.id + "-" + now.getFullYear() + "-" 
    + now.getMonth() + "-" + now.getDate() + "-"
    + now.getHours() + "-" + now.getMinutes() + "-" + now.getSeconds() + "-";
    var sizeKb = document.size / 1024 | 0
    
    if(sizeKb > 5* 1014){
        debug('uploadId user id: %s, %s, size %s kB TOO BIG', req.user.id, document.name, sizeKb);
        return res.send(400, {
            name: 'BadRequest',
            message: 'file is too big'
        })
    }
    
    debug('uploadId user id: %s, %s, size %s kB', req.user.id, document.name, sizeKb);
    
    //fs.rename(document.path, "document/" + upload_path + document.name);
    
    fs.readFile(document.path, "binary", function (err, data) {
        if (err) throw err;
        var status = "Pending";
        var type = "";
        var data64 = new Buffer(data, 'binary').toString('base64');
        debug('uploadId base 64 length %s',data64.length)
        req.app.conn.write.query({
            text: [
                'INSERT INTO document (user_id, name, type, status, image, size)',
                'VALUES ($1, $2, $3, $4, $5, $6)'
            ].join('\n'),
            values: [req.user.id, document.name, type, status, data64, document.size]
        }, function(err) {
            if (err) return next(err)
            req.app.activity(req.user.id, 'UploadId', {"name" : document.name})
            res.send({result : format('\nuploaded %s (%d Kb) '
                    , document.name
                    , sizeKb )});
        })
      });
}

exports.getIds = function(req, res, next) {
    var userId = req.user.id;
    debug('getIds %d', userId);

    req.app.conn.read.query({
        text: [
               'SELECT name, size, last_modified_date, "type", status, message',
               'FROM document',
               'WHERE user_id = $1',
               ].join('\n'),
               values: [userId]
    }, function(err, dr) {
        if (err) return next(err)
        debug('getIds #document ', dr.rows.length);
        res.send(dr.rows.map(function(row) {
            return {
                name: row.name,
                status: row.status,
                last_modified_date: row.last_modified_date
            }
        }))
    })

}
