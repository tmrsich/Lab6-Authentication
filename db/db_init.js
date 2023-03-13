// Initializes the database along with some sample data
const db = require("./db_connection");

// Delete existing table, if any
const drop_itemtable_sql = "DROP TABLE IF EXISTS Item"
db.execute(drop_itemtable_sql);

// Creates the table
const create_itemtable_sql = `
    CREATE TABLE Item (
        item_id INT NOT NULL AUTO_INCREMENT,
        class_name VARCHAR(45) NOT NULL,
        assignment_name VARCHAR(45) NOT NULL,
        due_date VARCHAR(10) NOT NULL,
        priority_rating TINYINT NOT NULL,
        assignment_type VARCHAR(45),
        assignment_format VARCHAR(45),
        interest_level TINYINT NULL,
        relevance_level TINYINT NULL,
        description VARCHAR(200) NULL,
        PRIMARY KEY (item_id, assignment_name)
    );
`
db.execute(create_itemtable_sql);

// Adds some sample items
const insert_itemtable_sql = `
    INSERT INTO Item
        (class_name, assignment_name, due_date, priority_rating, assignment_type, assignment_format, interest_level, relevance_level, description)
    VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?);
`
db.execute(insert_itemtable_sql, ["Web Apps", "Lab 1", "01-06-2023", "5", "Lab", "Practical", "8", "3", "Finish details table and styles"]);
db.execute(insert_itemtable_sql, ["Theory of Knowledge", "Extended Essay", "06-09-2024", "1", "Essay", "Research", "5", "8", "Find sources and complete annotated bibliography"]);
db.execute(insert_itemtable_sql, ["AP Calculus AB", "Optimization Test Retake", "01-08-2023", "10", "Test", "Written", "2", "2", "Study optimization and related rates (extra attention to formulas)"]);
db.execute(insert_itemtable_sql, ["Web Apps", "Lab 4", "02-05-2023", "3", "Lab", "Practical", "10", "3", "sample description"]);

// Reads the sample items inserted
const read_itemtable_sql = "SELECT * FROM Item";

db.execute(read_itemtable_sql,
    (error, results) => {
        if (error)
            throw error;

        console.log("Table 'Item' initialized with:")
        console.log(results);
    }
);
db.end();