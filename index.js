const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();





//middleware
app.use(cors({
    origin: [
        // 'http://localhost:5173',
        'https://car-doctor-f8a5b.web.app', 'https://car-doctor-f8a5b.firebaseapp.com', 'http://localhost:5173'
    ],
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

const logger = (req, res, next) =>{
    console.log('log: info', req.method, req.url);
    next();
}


const verifyToken = (req, res, next) =>{
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    // no token available 
    if(!token){
        return res.status(401).send({message: 'unauthorized access'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
        if(err){
            return res.status(401).send({message: 'unauthorized access'})
        }
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
        const bookingCollection = client.db('carDoctor').collection('bookings');
        const productsCollection = client.db('carDoctor').collection('products')

        //authentication related api (jwt)
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('User for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(token);

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true });
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('Logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })

        })


        //services related api
        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })



        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result);

        })

        //products related api
        app.get('/products', async(req, res)=>{
            const cursor = productsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })




        //data reading from the database
        app.get('/checkout', logger, verifyToken, async (req, res) => {
            // console.log(req.query.email);
            // console.log('Cookie:', req.cookies.token);
            console.log('Token owner info:', req.user);
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
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

        //data inserting to the database
        app.post('/checkout', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);

        });

        //data deleting from the database
        app.delete('/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
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