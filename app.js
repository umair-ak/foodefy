require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express()
const ejs = require("ejs");
const mongoose=require("mongoose");
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const findOrCreate=require('mongoose-findorcreate')

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook');
app.use(session({
    secret:"Our little secret.",
    resave:false,
saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser:true, useUnifiedTopology:true} );

mongoose.set("useCreateIndex", true);

const Items = new mongoose.Schema({
    name : String,
    price : Number,
    img_name : String
})

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    facebookId:String,
    cartItems : [Items]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User=new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
    done(null, user.id);
});

passport.deserializeUser(function(id,done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

passport.use(new GoogleStrategy({

    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/registered",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/registered"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
passport.authenticate('google',{scope:["profile"]}));

app.get("/auth/google/registered", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
   
    res.redirect('/registered');
  });

  app.get("/auth/facebook",
  passport.authenticate('facebook'));
  
  app.get("/auth/facebook/registered", 
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      
      res.redirect('/registered');
    });

app.get("/login", function(req,res){
    res.render("authlogin");
});
app.get("/home", function(req,res){
    res.render("authhome");
});

app.get("/register", function(req,res){
    res.render("authregister");
});

app.get("/registered", function(req,res){
  User.find({"registered":{$ne:null}}, function(err, foundUsers){
    if(err){
        console.log(err);
    }else{
        if(foundUsers){
            res.render("authregistered", {userWithSecrets:foundUsers});
        }
    }
  });
});

app.get("/logout", function(req,res,next){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

app.get("/goback", function(req,res,next){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/register');
      });
});

app.post("/register", function(req, res){

    User.register({username:req.body.username}, req.body.password, function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/login");
            });
        }
    });
 })

app.post("/login", function(req,res){
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect('/');
            });
        }
    });
});

app.get("/", function(req, res){
    res.render("index");
});

app.get("/menu",function(req,res){
    res.render("menu");
});

app.listen(3000,function(){
    console.log("everything is working fine");
});