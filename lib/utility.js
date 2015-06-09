var request = require('request');
var bcrypt = require('bcrypt-nodejs');
var User = require('../app/models/user.js')


exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

exports.getUserId = function(username, cb) {
  new User({username: username}).fetch().then(function(user) {
    cb(user.id);
  });
}

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/

exports.checkUser = function(req, res, next) {
  if(req.url !== '/login' && req.url !== '/signup' && req.session.user === undefined) {
    res.redirect('/login');
  }

  else if((req.url === '/login' || req.url === '/signup') && req.session.user !== undefined) {
    res.redirect('index');
  }
  else {
    next();
  }

};


exports.encryptPassword = function(password, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return err;

    bcrypt.hash(password, salt, null, function(err, encrypted_pw) {
      if (err) return err;
      callback(encrypted_pw);
    });
  });
};

exports.checkPassword = function(password, encrpyted_pw, callback) {
  bcrypt.compare(password, encrpyted_pw, function(err, same){
    if (err) return err;
    callback(same);
  });
};
