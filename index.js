const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const pg = require("pg");

const app = express();
const port = process.env.PORT || 3000; // Fallback to 3000 if process.env.PORT is not defined

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// const db = new pg.Client({
//   user: "postgres",
//   host: "localhost",
//   database: "TinCat",
//   password: "zoo0330",
//   port: 5432,
// });

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect();

app.get("/", (req, res) => {
  const username = req.query.username;
  if (username) {
    res.render("homepage.ejs", { username: username });
  } else {
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

// User signup
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  console.log(username);
  console.log(email);
  console.log(password);
  try {
    const result = await db.query(
      "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username",
      [username, email, password]
    );
    console.log(result);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(user);
      res.redirect(
        `/account-created?username=${encodeURIComponent(user.username)}`
      );
    }
  } catch (err) {
    console.error(err);
    res.render("signup.ejs", {
      message: "Username/Email already exists, please try again.",
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

    console.log(result);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(user);

      if (password == user.password) {
        // If passwords match, redirect to the homepage with the user's username
        res.render("homepage.ejs", { username: user.username });
      } else {
        // If passwords do not match, reload login page with error message
        res.render("login.ejs", {
          message: "The password you entered is incorrect. Please try again.",
        });
      }
    } else {
      // No user found with the provided email
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
    const result = await db.query(
      "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username",
      [username, email, password]
    );
    console.log(result);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(user);
      res.redirect(
        `/payment-success?username=${encodeURIComponent(user.username)}`
      );
    }
  } catch (err) {
    console.error(err);
    res.render("checkoutpage.ejs", {
      message: "Username/Email already exists, please try again.",
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
