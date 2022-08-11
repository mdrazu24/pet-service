const express = require("express");
//const fetch = require("node-fetch");
const mysql = require("mysql");
const app = express();
const pool = require("./dbPool");
const cookieSession = require('cookie-session')
const jwt = require("jsonwebtoken")

// const session = require('express-session');
const bcrypt = require('bcrypt');

// app.use(session({
//   secret: "top secret!",
//   resave: false,
//   saveUninitialized: true
// }));

app.use(cookieSession(
  {
    signed: false,
    //  secure : process.env.NODE_ENV !== 'test', 
    maxAge: 24 * 60 * 60 * 1000 //this is one day.
  }
)
)

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

//routes
app.get('/', function(req, res) {
  res.render('index', { isLoggedIn: req.session.jwt ? true : false });
});

app.get('/login', (req, res) => {
  if (req.session.jwt) {
    res.redirect('/');
  }
  res.render("loginMember")
});


app.get('/myProfile', isAuthenticated, (req, res) => {
  res.render('profile', { isLoggedIn: req.session.jwt ? true : false });
});

app.get('/logout', isAuthenticated, (req, res) => {
  req.session = null
  res.redirect('/');
});

app.get("/appointment", isAuthenticated, async (req, res, next) => {
  pool.query("SELECT * FROM pet_reservation;", ((err, result) => {
    if (err) {
      console.log(err)
      res.render('appoinment', { isLoggedIn: req.session.jwt ? true : false, services: [] })


    } else {
      res.render('appoinment', { isLoggedIn: req.session.jwt ? true : false, services: result })
    }
  }))

})

app.get("/services", isAuthenticated, async (req, res, next) => {
  res.render('petServices', { isLoggedIn: req.session.jwt ? true : false })

})

app.post('/login', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  //console.log("username:" + username);
  //console.log("password:" + password);
  let hashedPwd = "";

  let sql = "SELECT * FROM users WHERE username = ?";
  let rows = await executeSQL(sql, [username]);

  if (rows.length > 0) {
    hashedPwd = rows[0].password;
  }

  let passwordMatch = await bcrypt.compare(password, hashedPwd);
  console.log("passwordMatch:" + passwordMatch);

  if (passwordMatch) {
    // req.session.cookie = { ...req.session.cookie, authenticated: true };
    const token = jwt.sign(
      { message: "loggedIn" },
      "jwtsecret",
      {
        expiresIn: "24h",
      }
    )

    req.session = {
      jwt: token,
    }
    res.render('petServices');
  } else {
    res.render("loginMember", { "loginError": true });
  }
});


//functions
function isAuthenticated(req, res, next) {
  if (!req.session.jwt) {
    res.redirect('/');
  } else {
    next();
  }
}



//app.get('/index', async(req, res) => {
//let url = "https://api.unsplash.com/photos/random/?//client_id=Uembvy8gZTfQLBdT3q5mbV0vj2xDO3YMCqdHfURmAIk&featured=true&query=dogs";
//let response = await fetch(url);
//let data = await response.json();
//let image = data.urls.small;
//res.render('index', {"indexUrl":image})
//});


app.get('/member/new', (req, res) => {
  res.render('newMember')
});
app.get("/signup/pet", (req, res) => {


});
//app.get('/login', (req, res) => {
// res.render("loginMember")
//});

app.get("/dbTest", async function(req, res) {
  let sql = "SELECT CURDATE()";
  let rows = await executeSQL(sql);
  res.send(rows);
});//dbTest

app.get("/signup/new", (req, res) => {
  res.render("newPetSignUp");
});

app.get("/registration/complete", (req, res) => {
  res.render('results', { "message": "Registration Complete!" });
})
//app.post functions 
app.post("/signup/new", async function(req, res) {
  let fName = req.body.fName;
  let lName = req.body.lName;
  let email = req.body.email;
  let zip = req.body.zip;
  let phone = req.body.phone;
  let username = req.body.username;
  let password = req.body.password;
  let sql = "Insert into customertable (fName, lName, email, phone ,zip , userId, password) VALUES (?,?, ?,?, ?,?,?);";
  let params = [fName, lName, email, phone, zip, username, password];
  let rows = await executeSQL(sql, params);
  res.render("newPetSignUp", { "message": "Member added!", "first": fName });
});

app.post("/registration/complete", async function(req, res) {
  let name = req.body.pName;
  let age = req.body.pAge;
  let breed = req.body.breed;
  let owner = document.querySelector("#fName").value;
  let sql = "Insert into petregistration (petName, petAge, petBreed,ownerName) VALUES (?,?, ?,?);";
  let params = [name, age, breed, owner];
  let rows = await executeSQL(sql, params);
  res.render("results", { "message": "Registration Complete!" });
});

app.post('/services', async (req, res, next) => {
  const data = req.body

  pool.query(
    "INSERT INTO pet_reservation (service,appointmentAt, appointmentTime, petName, petBreed ) VALUES (?,?,?,?,?)",
    [
      data.service,
      data.appointmentAt,
      data.appointmentTime,
      data.petName,
      data.petBreed,


    ],
    (err, result) => {
      if (err) {
        res.send(err)
      } else {
        res.redirect('/appointment')
      }

    }

  )

})

//start server
app.listen(3000, () => {
  console.log("Expresss server running...")
});

return pool;

async function executeSQL(sql, params) {
  return new Promise(function(resolve, reject) {
    pool.query(sql, params, function(err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
}//executeSQL

