var log = require('../log')(__filename)
, debug = log.debug;
var _ = require('lodash');
var format = require('util').format;
var fs = require('fs-extra');
var formidable = require('formidable');

module.exports = exports = function(app) {
    exports.app = app
    var upload = app.upload

    app.post('/v1/users/documents', app.security.demand.primary(1), exports.uploadId)
    app.get('/v1/users/documents', app.security.demand.primary(1), exports.getIds)
}

function saveDocument(file, req, res, next){
    fs.readFile(file.path, "binary", function (err, data) {
        fs.unlink(file.path);
        if (err) throw err;
        var status = "Pending";
        var type = "";
        var data64 = new Buffer(data, 'binary').toString('base64');
        debug('saveDocument base 64 length %s',data64.length)
        req.app.conn.write.get().query({
            text: [
                   'INSERT INTO document (user_id, name, type, status, image, size)',
                   'VALUES ($1, $2, $3, $4, $5, $6)'
                   ].join('\n'),
                   values: [req.user.id, file.name, type, status, data64, data.length]
        }, function(err) {
            if (err) return next(err)
            req.app.activity(req.user.id, 'UploadId', {"name" : file.name})
            res.send({result : format('\nuploaded %s'
                    , file.name)});
        })
    });
}

exports.uploadId = function(req, res, next) {
    debug("uploadId ");
    var form = new formidable.IncomingForm();

    form.on('file', function(fields, file) {
        debug("uploadId file path: ", file.path);
        saveDocument(file, req, res, next);
    }).on('error', function(err) {
        log.info("an error has occured with form upload");
        log.info(err);
        req.resume();
    })
    .on('aborted', function(err) {
        log.info("saveDocument user aborted upload");
    })
    .on('end', function() {
        log.debug('saveDocument upload done');
    });
    
    form.parse(req, function(err, fields, files) {
        debug("saveDocument form.parse files: ")
    });
}

exports.getIds = function(req, res, next) {
    var userId = req.user.id;
    debug('getIds %d', userId);

    req.app.conn.read.get().query({
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
