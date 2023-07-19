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
mongoose.set('useFindAndModify', false);

const itemSchema = new mongoose.Schema({
    name : String,
    price : String,
    img : String
})

const Item = new mongoose.model("item",itemSchema);

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    facebookId:String,
    cartItems : [itemSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User =new mongoose.model("User", userSchema);

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
    let nofUsers = Object.keys(presentuser).length;
    if(nofUsers==0){
        res.render("authhome",{bool:false});
    }
    else{
        res.render("authhome",{bool:true});
    }
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
var presentuser = {}
app.post("/login", function(req,res){
    presentuser = {}
    const user=new User({
        username:req.body.username,
        password:req.body.password
    });
    presentuser["username"]= req.body.username;
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


async function addToCart(item,price,img,res,route){

    const newitem = new Item({
        name:item,
        price:price,
        img:img
    });

    const username = presentuser["username"];
    const user = await User.findOne({username:username});
    if(user==null){
        res.redirect("/login");
    }else{
        user["cartItems"].push(newitem);
        user.save();
        res.redirect(route);
    }
}


app.get("/",async function(req, res){
    let nofUsers = Object.keys(presentuser).length;
    if(nofUsers==0){
        
        res.render("index",{bool:false});
        
    }
    else{
        const user = await User.findOne({username:presentuser['username']});
        if(user == null){
            res.render("index",{bool:true,items:[]})
        }else{
            res.render("index",{bool:true,items:user["cartItems"]});
        }
        
        
    }
});

app.post("/home/:item",function(req,res){
    const item = req.params.item;
    const price = req.body.price;
    const img = req.body.img;
    const action = req.body.action;
    if(action == "cart"){
        addToCart(item,price,img,res,"/#popular");
    }else{
        let nofUsers = Object.keys(presentuser).length;
        if(nofUsers==0){
            res.redirect("/login");
        }else{
            const buy = {
                name:item,
                price:price,
                img:img
            };
            const allitems = [buy];
            res.render("orderconfirm",{items:allitems});
        }
}
});
app.post("/menu/:item",function(req,res){
    const item = req.params.item;
    const price = req.body.price;
    const img = req.body.img;
    const action = req.body.action;
    if(action == "cart"){
        addToCart(item,price,img,res,"/menu");
    }else{
        let nofUsers = Object.keys(presentuser).length;
        if(nofUsers==0){
            res.redirect("/login");
        }else{

            const buy = {
                name:item,
                price:price,
                img:img
            };
            const allitems = [buy];
            res.render("orderconfirm",{items:allitems});
        }
}
});

// deleting an item from cart
app.post("/cart/:item",async (req,res)=>{
    const user = await User.findOneAndUpdate({username:presentuser['username']},{$pull:{cartItems:{name:req.params.item}}});    

    res.redirect("/");
});

app.post("/ordcnfrm",async (req,res)=>{
    const user = await User.findOne({username:presentuser['username']});
    res.render("orderconfirm",{items:user['cartItems']});
});

app.post("/ordcnfrmd", (req,res)=>{
    res.render("ordcnfrmd");
});

app.get("/menu", async function(req,res){
    let nofUsers = Object.keys(presentuser).length;
    if(nofUsers==0){
        res.render("menu",{bool:false});
    }
    else{
        const user = await User.findOne({username:presentuser['username']});
        if(user == null){
            res.render("menu",{bool:true,items:[]})
        }else{
            res.render("menu",{bool:true,items:user["cartItems"]});
        }
    
    }
});

app.listen(3000,function(){
    console.log("everything is working fine");
});