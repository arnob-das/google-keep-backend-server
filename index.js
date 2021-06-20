const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()
const admin = require('firebase-admin')
const ObjectId = require('mongodb').ObjectId


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mfrtm.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const port = 5000

const app = express()
app.use(cors())
app.use(bodyParser.json())


const serviceAccount = require("./configs/keeper-arnob-firebase-adminsdk-a03qy-48e133fab7.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `${process.env.DB_URL}`
});


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
    const notesCollection = client.db("google-keep").collection('notes');
    
    app.get('/myNotes', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    console.log(queryEmail, tokenEmail);
                    if (tokenEmail == queryEmail) {
                        notesCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                    else {
                        res.status(401).send('un-authorized access')
                    }
                }).catch(function (error) {
                    res.status(401).send('un-authorized access')
                });
        }
        else {
            res.status(401).send('un-authorized access')
        }
    })

    app.get('/allNotes', (req, res) => {
        notesCollection.find({})
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.post('/addNotes', (req, res) => {
        const newNotes = req.body
        notesCollection.insertOne(newNotes)
            .then(result => {
                res.send(result.insertedCount > 0)
            })
    })

    app.delete('/delete/:id', (req, res) => {
        notesCollection.deleteOne({ _id: ObjectId(req.params.id) })
            .then((err, result) => {
                console.log(result)
            })
    })

});


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(process.env.PORT || port)
