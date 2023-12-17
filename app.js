// Sets up the server
const express = require("express");
const logger = require("morgan");
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');
const dotenv = require('dotenv');
dotenv.config();

const helmet = require("helmet");
const db = require('./db/db_pool');
const app = express();
const port = process.env.PORT || 8080;

// Auth0 Configuration 
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL
  };

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

//Configure Express to use certain HTTP headers for security
//Explicitly set the CSP to allow specific sources
app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'cdnjs.cloudflare.com'],
        styleSrc: ["'self'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.googleapis.com']
      }
    }
  }));

// Configure Express to use EJS
app.set( "views",  __dirname + "/views");
app.set( "view engine", "ejs" );

// defines middleware that logs all incoming requests
app.use(logger("dev"));

// defines middleware that serves static resources in the public directory
app.use(express.static(__dirname + '/public'));

// configures Express to parse URL-encoded POST request bodies (traditional forms)
app.use( express.urlencoded({ extended: false }) );

// Defines middleware that appends useful auth-related information to the res object so EJS can easily access it
app.use((req, res, next) => {
    res.locals.isLoggedIn = req.oidc.isAuthenticated();
    res.locals.user = req.oidc.user;
    next();
})

// req.isAuthenticated is provided from the auth router
app.get('/authtest', (req, res) => {
  res.send(req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out');
});

app.get('/profile', requiresAuth(), (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
  });

// define a route for the default home page
app.get( "/", (req, res) => {
    res.render("homepage");
} );

// defines a query to read all the database information
const read_inventory_sql = `
    SELECT
        item_id,
        class_name, assignment_name, assignment_type, assignment_format,
        due_date, priority_rating, interest_level, relevance_level,
        description
    FROM
        Item
    WHERE
        user = ?
`

// define a route for the inventory page
app.get("/inventory", requiresAuth(), (req, res) => {
    db.execute(read_inventory_sql, [req.oidc.user.email], (error, results) => {
        if (error) {
            res.status(500).send(error); // Internal Server Error
        } else {
            res.render('inventory', {inventory : results})
        }
    });
} );

// define a query for the item detail page
const read_assignment_sql = `
    SELECT
        item_id,
        class_name, assignment_name, assignment_type, assignment_format,
        due_date, priority_rating, interest_level, relevance_level,
        description
    FROM
        Item
    WHERE
        item_id = ? AND user = ?
`
// define a route for the item detail page
app.get("/inventory/details/:item_id", requiresAuth(), (req, res) => {
    db.execute(read_assignment_sql, [req.params.item_id, req.oidc.user.email], (error, results) => {
        if (error)
            res.status(500).send(error); //Internal Server Error
        else if (results.length == 0)
            res.status(404).send(`No item found with id = "${req.params.item_id}"`); //Not found
        else {
            let data = results[0]; // results is still an array
            res.render('details', data);
        }
    });
});

// defines a query for the item detail-list page
const read_list_sql = `
    SELECT
        item_id, assignment_name, class_name
    FROM
        Item
    WHERE
        user = ?
`

// define a route for the list page
app.get("/inventory/list", requiresAuth(), (req, res) => {
    db.execute(read_list_sql, [req.oidc.user.email], (error, results) => {
        if (error) {
            res.status(500).send(error); // Internal Server Error
        } else {
            res.render('list', {list : results})
        }
    });
} );

// defines a query to delete an entry on the inventory page in the table
const delete_inventory_sql = `
    DELETE
    FROM
        Item
    WHERE
        item_id = ? AND user = ?
`

// defines a route to delete an entry
app.get("/inventory/details/:item_id/delete", requiresAuth(), (req, res) => {
    db.execute(delete_inventory_sql, [req.params.item_id, req.oidc.user.email], (error, results) => {
        if (error)
            res.status(500).send(error); // Resorts to an internal server error
        else {
            res.redirect("/inventory");
        }
    });
})

// defines a query to update entries on both the inventory and details page
const update_inventory_sql = `
    UPDATE
        Item
    SET
        class_name = ?,
        assignment_name = ?,
        due_date = ?,
        priority_rating = ?,
        assignment_type = ?,
        assignment_format = ?,
        interest_level = ?,
        relevance_level = ?,
        description = ?
    WHERE
        item_id = ? AND user = ?
`
// defines a POST request to update entries in the database
app.post("/inventory/details/:item_id", requiresAuth(), (req, res) => {
    db.execute(update_inventory_sql, 
    [
        req.body.class_name_input,
        req.body.assignment_name_input,
        req.body.due_date_input,
        req.body.priority_rating_input,
        req.body.assignment_type_input,
        req.body.assignment_format_input,
        req.body.interest_level_input,
        req.body.relevance_level_input,
        req.body.description_input,
        req.params.item_id,
        req.oidc.user.email
    ], (error, results) => {
        if (error)
            res.status(500).send(error);
        else {
            res.redirect(`/inventory/details/${req.params.item_id}`);
        }
    });
})

// query to create entries on the inventory page using the form
const create_inventory_sql = `
    INSERT INTO Item
        (class_name, assignment_name, due_date, priority_rating, user)
    VALUES
        (?, ?, ?, ?, ?)
`

// defines a POST request to create entries in the database
app.post("/inventory", requiresAuth(), (req, res) => {
    db.execute(create_inventory_sql, 
        [
            req.body.class_name,
            req.body.assignment_name,
            req.body.due_date, 
            req.body.priority_rating,
            req.oidc.user.email
        ], (error, results) => {
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            //results.insertId has the primary key (id) of the newly inserted element.
            res.redirect(`/inventory/details/${results.insertId}`);
        }
    });
})

// start the server
app.listen( port, () => {
    console.log(`App server listening on ${ port }. (Go to http://localhost:${ port })` );
} );