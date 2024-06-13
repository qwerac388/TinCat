const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");
const app = express();
const session = require("express-session");
const port = process.env.PORT || 3000; // Fallback to 3000 if process.env.PORT is not defined
const saltRounds = 10;
const env = require("dotenv");

env.config();

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// const db = new pg.Client({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: process.env.PG_PORT,
// });

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect();

app.get("/", (req, res) => {
  // Check if user session exists
  if (req.session.user) {
    // Render homepage with username from session
    res.render("homepage.ejs", { username: req.session.user.username });
  } else {
    // Render homepage normally if no user is logged in
    res.render("homepage.ejs");
  }
});

app.get("/checkoutpage", (req, res) => {
  res.render("checkoutpage.ejs");
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
            res.redirect(
              `/account-created?username=${encodeURIComponent(user.username)}`
            );
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

//Payment Successful
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
            res.redirect(
              `/payment-success?username=${encodeURIComponent(user.username)}`
            );
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

//Voucher Code
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
