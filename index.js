const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

//middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lb6xnzu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


//middlewares

const logger = async(req, res, next)=>{
    console.log('Called:', req.host, req.originalUrl);
    next();
}

const verifyToken = async(req, res, next)=>{
    const token = req.cookies?.token;
    console.log('Value of token:', token);
    if(!token){
        return res.status(401).send({message: 'Access denied'});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
            console.log(err);
            return res.status(401).send({message: 'Access denied'})
        }
        console.log(('value in the token:', decoded));
        req.user = decoded;
        next();
    })
    
}

async function run() {
    try {
        await client.connect();
        console.log("Connected to database");
        // Perform database operations here
        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookings')

        //auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(token);

            res
            .cookie('token', token, {
                httpOnly: true,
                secure: false,
                
            })
            .send({ success: true });
        })

        //services related api
        app.get('/services', logger, async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', logger, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result);

        })

        app.post('/checkout', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);

        });

        app.get('/checkout',logger, verifyToken, async (req, res) => {
            console.log(req.query.email);
            // console.log('Cookie:', req.cookies.token);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);

        })
        app.patch('/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateCheckoutDetails = req.body;
            console.log(updateCheckoutDetails);
            const updateDoc = {
                $set: {
                    status: updateCheckoutDetails.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);


        })





    } catch (err) {
        console.error(err);
    } finally {
        // await client.close();
    }
}

run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Car doctor is running');
})

app.listen(port, () => {
    console.log(`Car doctor is running on port: ${port}`);
})