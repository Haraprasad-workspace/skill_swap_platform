const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const path = require('path')
const upload = require('./config/multer_config.js')
const cloudinary = require('./utils/cloudinary-config.js')
const mongoose = require('mongoose')
const compression = require('compression')
require('dotenv').config();


//defining all the models 
const userModel = require('./models/usermodel.js')



app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cookieParser())
app.use(compression());


//all the get request starts here 

app.get('/',(req,res)=>{
    res.send("working");
})


app.get('/login', async (req,res)=>{
    try{res.render('login')}
    catch(err){
        res.redirect('/oops');
    }
})



app.get('/register', async (req,res)=>{
    try{res.render('register')}
    catch(err){
        res.redirect('/oops');
    }
})


app.get('/logout' , (req,res)=>{
    res.cookie("token","")
    res.redirect("/")

})

app.get('/oops',(req,res)=>{
    res.render('oops',{message:"Something went wrong. Please try again later."})
})


// all the post requests starts here 

app.post('/login', async (req, res) => {

    //destructure the request body to get the email and password 
    let { email, password } = req.body;
    //check the email user exist or not 
    let user = await userModel.findOne({
        email
    });
    //block to be executed if the user do not exist 
    if (!user) {
        return res.render('oops', { message: "email not found" })
    }
    //if user exist then , compare the password 
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            //if the password is same , the assing the jwt tokn having email and userid 
            const token = jwt.sign({ email: email, userid: user._id }, process.env.MYSECRETKEY, { expiresIn: "1h" })
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
            });

            res.redirect('/')
        }
        else {
            return res.status(500).render('oops', { message: "something went wrong,sorry for your inconvinience" })
        }
    })
})

app.post('/register', async (req, res) => {
    let { name, email, password } = req.body;

    let checkuser = await userModel.findOne({ email })
    if (checkuser) {
        return res.status(500).render('oops', { message: "email id already exist" })
    }

    bcrypt.genSalt(10, (err, salt) => {

        if (err) {
            return res.status(500).render('oops', { message: "internal server error" })
        }
        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) {
                return res.status(500).render('oops', { message: "internal server error" })
            }
            let user = await userModel.create({
                name,
                email,
                password: hash

            })

            const token = jwt.sign({ email: email, userid: user._id }, process.env.MYSECRETKEY)
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
            });

            res.redirect('/')
        })
    })



})


app.listen(process.env.PORT)