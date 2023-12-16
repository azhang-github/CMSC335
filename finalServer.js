process.stdin.setEncoding("utf8");
const fs = require("fs");
const express = require("express");   /* Accessing express module */
const app = express();  /* app is a request handler function */
const portNumber = process.argv[2];
const path = require("path");
const bodyParser = require("body-parser"); /* To handle post parameters */
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })

app.set("view engine","ejs");
app.listen(portNumber);
console.log(`To access server: http://localhost:${portNumber}`);
app.set("views", path.resolve(__dirname, "templates"));

app.use(express.static(__dirname + '/'));

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

 /* Our database and collection */
const databaseAndCollection = {db: "CMSC335_DB", collection:"finalProject"};

const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", function () {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            process.stdout.write("Shutting down the server\n");
            process.exit(0);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
   }
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.quopgmb.mongodb.net/?retryWrites=true&w=majority`;
//const uri = `mongodb+srv://${userName}:${password}@cluster0.abqjceg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });



app.get("/", (req, res) => {
    res.render("home");
});

app.get("/home", (req, res) => {
    res.render("home");
});

app.get("/listOfBooks", (req, res) => {
    // const protocol = req.protocol;
    console.log(`protocol is ${req.protocol}`);
    const variables = {
        address: `${req.protocol}://${req.hostname}:${portNumber}/listOfBooks`,
    };
    res.render("listOfBooks", variables);
});

app.get("/page2", (req, res) => {
    console.log(`protocol is ${req.protocol}`);
    const variables = {
        address: `${req.protocol}://${req.hostname}:${portNumber}/page2`,
    };
    res.render("page2", variables);
});

app.get("/setFavorite", (req, res) => {
    console.log(`protocol is ${req.protocol}`);
    const variables = {
        address: `${req.protocol}://${req.hostname}:${portNumber}/processSetFavorite`,
    };
    res.render("setFavorite", variables);
});

app.get("/bookNotFound", (req, res) => {
    const variables = {
    };
    res.render("bookNotFound", variables);
});

app.get("/retrieveFavorite", (req, res) => {
    console.log(`protocol is ${req.protocol}`);
    const variables = {
        address: `${req.protocol}://${req.hostname}:${portNumber}/processRetrieveFavorite`,
    };
    res.render("retrieveFavorite", variables);
});


app.use(bodyParser.urlencoded({extended:false}));
app.post("/listOfBooks", async (req, res) => {
    
    booksTable = "";
        
    fetch("https://openlibrary.org/search.json?q=" + req.body.book)
  .then(response => response.json())
  .then(jsonStuff => {
    
    let first10 = jsonStuff.docs.slice(0, 10);
    booksTable = makeHTMLTable(first10);
    const variables = {
        table: booksTable
    };
    res.render("listOfBooksConfirmation", variables);
  });
});

app.post("/page2", async (req, res) => {

    try {
        await client.connect();

        const variables = {
            
        };

        res.render("page2Confirmation", variables);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

async function getFavorite(providedEmail) {
    try {
        await client.connect();
       
        let filter = {email: providedEmail};
        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .findOne(filter);

        if (result) {
            return result;
        } 

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
      
}

async function addNewFavorite(email, name, bookJson) {
    try {
        await client.connect();
        // console.log("in addNewFavorite, bookJson = ");
        // console.log(bookJson);
       
        /* Inserting one movie */
        // console.log("***** Inserting one application *****");
        let favorite = {email: email, name: name, title: bookJson.title, author: bookJson.author_name[0], year: bookJson.first_publish_year};
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(favorite);
        return result;
        // console.log(`Movie entry created with id ${result.insertedId}`);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

}

app.post("/processSetFavorite", async (req, res) => {
                
    let email = req.body.email;
    let name = req.body.name;
    let title = req.body.book?.replaceAll(' ', '+');
    // console.log("In processSetFavorite ");
    // console.log("https://openlibrary.org/search.json?q="+title);

    const fetchPromise = fetch("https://openlibrary.org/search.json?q="+title)
        .then(a =>a.json())
        .then(response => {
            if (response.num_found > 0) {
                // console.log(response.docs[0]);
                addNewFavorite(email, name, response.docs[0]);

                const variables = { 
                    name: name ?? "NONE",
                    email: email ?? "NONE",
                    author: response.docs[0]?.author_name[0] ?? "NONE",
                    title: response.docs[0]?.title ?? "NONE",
                    year: response.docs[0]?.first_publish_year ?? "NONE"
                };
                res.render("displayFavorite", variables);

            } else {
                const variables = { 
                };
                res.render("bookNotFound", variables);
            }
        });

});

app.post("/processRetrieveFavorite", (req, res) => {
    let email = req.body.email;

    const promise = getFavorite(email);
    promise.then(
        (result) => {
            const variables = { 
                name: result?.name ?? "NONE",
                email: result?.email ?? "NONE",
                author: result?.author ?? "NONE",
                title: result?.title ?? "NONE",
                year: result?.year ?? "NONE"
            };
            res.render("displayFavorite", variables);
        },
        (error) => console.error(error)
    );
});

async function deleteAll() {

    try {
        await client.connect();
       
        /* Deleting all applications */
        // console.log("***** Deleting all applications *****");
        const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .deleteMany({});
        // console.log(`Documents deleted ${result.deletedCount}`);

        return result.deletedCount;

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

}

app.get("/processFavRemove", (request, response) => {

    const promise = deleteAll();
    promise.then(
        (result) => {
            const variables = { deletedCount: result};
            response.render("processFavRemove", variables);
        },
        (error) => console.error(error)
    );
    
});

app.get("/removeAllFavorites", (request, response) => {

    // const variables = { 
    //     host: request?.hostname ?? "localhost",
    // };
    console.log(`protocol is ${req.protocol}`);
    const variables = {
        address: `${request.protocol}://${request.hostname}:${portNumber}/removeAllFavorites`,
    };
    response.render("removeAllFavorites", variables);
});

app.post("/removeAllFavorites", async (req, res) => {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        const variables = {
            deletedCount: result.deletedCount
        };
        res.render("processFavRemove", variables)
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});



//Insert object into Database
async function insertStuff(client, databaseAndCollection, newStudent) {
   await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newStudent);
}

//Lookup an entry in the dataBase
async function lookUpOneEntry(client, databaseAndCollection, studentEmail) {
    let filter = {email: studentEmail};
    return await client.db(databaseAndCollection.db)
                    .collection(databaseAndCollection.collection)
                    .findOne(filter);

}

//Lookup with a filter in the database
async function lookUpMany(client, databaseAndCollection, gpa) {
    let filter = {gpa : { $gte: gpa}};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find(filter);

    // Some Additional comparison query operators: $eq, $gt, $lt, $lte, $ne (not equal)
    // Full listing at https://www.mongodb.com/docs/manual/reference/operator/query-comparison/
    return await cursor.toArray();
}

function makeHTMLTable(res) {
    let string = `<table border="1px solid black">\n`;
    string += `<tr><th>Book Title</th><th>Author</th><th>Year</th></tr>\n`;
    res.forEach(item => {
        let image = "";
        let author = (item.author_name === undefined) ? 'Name Unavailable' : item.author_name;
        let year = (item.first_publish_year === undefined) ? 'Year Unavailable' : item.first_publish_year;
        string += `<tr><td>${item.title}</td><td>${author}</td><td>${year}</td></tr>\n`;
    });
    string += "</table>\n";
    return string;
}