const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const session = require("express-session");
const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
const env = require("dotenv");

// TinCat user pool
const TinCatUserName = ["Luna", "Molly", "Chloe", "Bella", "Sophie"];

env.config();

// Initialize database connection
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

//For Heroku Deployment
// const db = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

db.connect();

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

//CallBackURL for Heroku Deployment
// https://tincatapp-494be906216d.herokuapp.com/auth/google/callback
// http://localhost:3000/auth/google/callback

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      passReqToCallback: true,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length > 0) {
          // User exists, log them in
          return done(null, result.rows[0]);
        } else {
          // User doesn't exist, create a new user
          const newUser = await db.query(
            "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username",
            [profile.displayName, profile.email, "google"]
          );
          return done(null, newUser.rows[0]);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Routes
app.get("/", (req, res) => {
  if (req.session.user) {
    res.render("homepage.ejs", { username: req.session.user.username });
  } else {
    res.render("homepage.ejs");
  }
});

app.get("/user-checkout", (req, res) => {
  res.render("user-checkout.ejs");
});

app.get("/checkoutpage", (req, res) => {
  if (req.session.user) {
    res.render("user-checkout.ejs", { username: req.session.user.username });
  } else {
    res.render("checkoutpage.ejs");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/account-created", (req, res) => {
  const username = req.query.username;
  res.render("account-created.ejs", { username: username });
});

app.get("/payment-success", (req, res) => {
  const username = req.query.username;
  res.render("payment-success.ejs", { username: username });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session:", err);
      return res.redirect("/");
    }
    res.redirect("/");
  });
});

app.get("/user", (req, res) => {
  const randomIndex = Math.floor(Math.random() * TinCatUserName.length);
  const getRandomUserName = TinCatUserName[randomIndex];
  if (req.session.user) {
    res.render("user.ejs", {
      username: req.session.user.username,
      TinCatUserName: getRandomUserName,
    });
  } else {
    res.render("user.ejs");
  }
});

// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to homepage with the user's username
    req.session.user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    };
    res.redirect("/");
  }
);

//Passing the environment variable to user.js for front end use
app.get("/api/config", (req, res) => {
  res.json({
    META_BLENDERBOT_HUGGINGFACE_API_KEY:
      process.env.META_BLENDERBOT_HUGGINGFACE_API_KEY,
  });
});

// User signup
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  console.log(username);
  console.log(email);
  console.log(password);
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    console.log(result);
    if (result.rows.length > 0) {
      res.render("signup.ejs", {
        message: "Email already exists, please try again.",
      });
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error Hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);

          const result = await db.query(
            "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username",
            [username, email, hash]
          );
          if (result.rows.length > 0) {
            const user = result.rows[0];
            // Save the user info in session
            req.session.user = {
              id: user.id,
              username: user.username,
              email: user.email,
            };
            console.log(user);
            res.redirect("/account-created");
          }
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.render("signup.ejs", {
      message: "Failed to signup due to server error",
    });
  }
});

// User login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email);
  console.log(password);
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      const isMatch = await bcrypt.compare(password, storedHashedPassword);
      if (isMatch) {
        // Save the user info in session
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
        };
        res.render("homepage.ejs", { username: user.username });
      } else {
        res.render("login.ejs", {
          message: "The password you entered is incorrect. Please try again.",
        });
      }
    } else {
      res.render("login.ejs", {
        message:
          "No account found with that email. Please check your entry or register.",
      });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("login.ejs", { message: "Failed to login due to server error" });
  }
});

// Guest Payment Successful
app.post("/checkoutpage", async (req, res) => {
  const { username, email, password } = req.body;
  console.log(username);
  console.log(email);
  console.log(password);
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    console.log(result);
    if (result.rows.length > 0) {
      res.render("checkoutpage.ejs", {
        message: "Email already exists, please try again.",
      });
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log("Error Hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          const result = await db.query(
            "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username",
            [username, email, hash]
          );
          if (result.rows.length > 0) {
            const user = result.rows[0];
            // Save the user info in session
            req.session.user = {
              id: user.id,
              username: user.username,
              email: user.email,
            };
            console.log(user);
            res.redirect("/payment-success");
          }
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.render("checkoutpage.ejs", {
      message: "Failed to signup due to server error",
    });
  }
});

//User Payment Successful
app.post("/user-checkout", (req, res) => {
  res.render("payment-success.ejs");
});

//Guest Voucher Code
app.post("/apply-promo", async (req, res) => {
  const { promoCode } = req.body;
  if (promoCode == "WELCOME2024") {
    res.render("checkoutpage.ejs", {
      msg: "Promo code applied successfully.",
      price: 59,
    });
  } else {
    res.render("checkoutpage.ejs", {
      msg: "Invalid promo code.",
      price: 69,
    });
  }
});

//User Voucher Code
app.post("/apply-promo2", async (req, res) => {
  const { promoCode } = req.body;
  if (promoCode == "WELCOME2024") {
    res.render("user-checkout.ejs", {
      msg: "Promo code applied successfully.",
      price: 59,
      username: req.session.user.username,
    });
  } else {
    res.render("user-checkout.ejs", {
      msg: "Invalid promo code.",
      price: 69,
      username: req.session.user.username,
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
