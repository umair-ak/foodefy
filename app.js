const express = require("express");
const bodyParser = require("body-parser");
const app = express()
const ejs = require("ejs");
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.get("/", function(req, res){
    res.render("index");
});

app.get("/menu",function(req,res){
    res.render("menu");
});

app.listen(3000,function(){
    console.log("everything is working fine");
});