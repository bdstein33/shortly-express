var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: "purple monkeys"
}));

app.all('*', util.checkUser);

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  util.getUserId(req.session.user, function(id) {
    Links.reset().query({where: {user_id: id}}).fetch().then(function(urls) {
      res.send(200, urls.models);
    });
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    return res.send(404);
  }

  util.getUserId(req.session.user, function(id) {
    new Link({ url: uri, user_id: id}).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin,
            user_id: id
          });

          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      }
    });
  })
});

// app.post('/links',
// function(req, res) {
//   var uri = req.body.url;

//   if (!util.isValidUrl(uri)) {
//     return res.send(404);
//   }

//   new User({ username: req.session.user }).urls({ url: uri }).fetch().then(function(urls) {
//     console.log(urls);
//     if (urls) {
//       res.send(200, urls.attributes);
//     } else {
//       util.getUrlTitle(uri, function(err, title) {
//         if (err) {
//           console.log('Error reading URL heading: ', err);
//           return res.send(404);
//         }

//         var link = new Link({
//           url: uri,
//           title: title,
//           base_url: req.headers.origin
//           // user_id: ???
//         });

//         link.save().then(function(newLink) {
//           Links.add(newLink);
//           res.send(200, newLink);
//         });
//       });
//     }
//   });
// });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup', {error:''})
});

app.post('/login', function(req, res) {
  new User({username: req.body.username})
  .fetch()
  .then(function(user) {
    if(user !== null) {
      util.checkPassword(req.body.password, user.get('password'), function(same) {
        if (same) {
          req.session.user = user.get('username');
          res.redirect('/');
        } else {
          res.redirect('/login');
        }
      })
    } else {
      res.redirect('/login');
    }

  });
});

app.post('/signup', function(req, res) {
  util.encryptPassword(req.body.password, function(encrypted_pw) {
    new User({
      'username': req.body.username,
      'password': encrypted_pw
    }).save().then(function(new_user) {
      req.session.regenerate(function(){
        req.session.user = new_user.get('username');
        res.redirect('/');
      });
    }).catch(function(error) {
        res.render('signup', {error: "Username already exists"});
      });
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function(){
    res.redirect('/');
  });
});



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
