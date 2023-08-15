const express = require("express");   // npm install express
const cors = require('cors');  // npm install cors
const app = express();

const port = process.env.PORT || 5000 ;
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); // npm install jsonwebtoken
require('dotenv').config()


app.get('/', (req, res) => {
    res.send('Simple Node Server Running');
});



// Middleware
app.use(cors())
app.use(express.json())
// Middleware to verify JWT in API requests
function verifyJWT(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ status: 401, message: 'Authorization token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ status: 403, message: 'Invalid or expired JWT token' });
    }
}

// Generate JWT token function
function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Set the expiration time as desired
}



// app.use(cors({
//     origin: '*',
//     allowedHeaders: ['Content-Type', 'Authorization']
//   }));
//   app.use(express.json()); // Use express.json() as a built-in middleware
  
//   app.listen(port, '0.0.0.0');

// app.use(cors());
// app.use(express.json()); // Use express.json() as a built-in middleware






const uri = "mongodb+srv://StackNote:BKeBBAt0GTNlBTda@cluster0.ny2vrds.mongodb.net/?retryWrites=true&w=majority";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const database = client.db('simpleNode');
    const userCollection = database.collection('users');
    const notePostCollection = database.collection('Notes')
    //const user = {name: 'Saif ', email: 'saif0606@gmail.com'}
   // const result = await userCollection.insertOne(user);;;;
   // console.log(result);

    app.post('/users', async (req, res) => {
        // console.log('post api CALLED');
        const {name, email, password} = req.body;
        const query = {
            name: name,
             email: email, 
             password: password,
             createDt: new Date(),
             updateDt: new Date(),
            //  token: uuidv4()
            };

        
        try{
            const result = await userCollection.insertOne(query);
            if(!result){
                return res.json({
                    status: 404,
                    message: 'user not found'
                })
            }else{
                res.json({
                    status: 200,
                    data: result
                })
            }
        }
        catch(err){
            res.json({
                status: 500,
                message: 'internal server error'
            })
        }
    
 
    });



    app.get('/all-user', verifyJWT, async(req, res) => {
        try{
            const result = await userCollection.find().toArray();

            res.json({
                status: 200,
                data: result
            })
        }catch(err){
            res.json({
                status: 500,
                message: 'Internal server error'
            })

        }
    })


    app.post('/login',  async (req,res) => {
        
        const {email, password} = req.body;
        const query = {email: email, password: password};
 
        try{
            const result = await userCollection.findOne(query);

            if(!result){
                return res.json({
                    status: 404,
                    message: "User not found"
                })
            }
          
             // Generate and send JWT token in the response
             const token = generateToken({ userId: result._id }); // Include any additional data you want in the payload
                res.json({
                    status: 200,
                    data: result,
                    token: token
                })
            
        } catch(err){
            res.json({
                status: 500,
                message: "Internal Server Error"
            })
        }




    })



        //create note post
        // app.post('/createNotePost', async (req, res) => {
        //     const {data} = req.body;
        //     data.createDt = new Date();
        //     data.updateDt = new Date();
       
    
        // try{
        //     const result = await notePostCollection.insertOne(data);
            
        //     res.json({
        //         status: 200,
        //         data: result
        //     })
    
        // }catch(err){
    
        //     res.json({
        //         status: 200,
        //         message: "Internal Server Error"
        //     })
    
        // }
    
        // })
        // create note post
        app.post('/createNotePost', verifyJWT, async (req, res) => {
            const { data } = req.body;
        
            // Check if data exists and is an object
            if (!data || typeof data !== 'object') {
                return res.status(400).json({ status: 400, message: "Invalid data format" });
            }
        
            // Extract the user ID from the decoded token in the request
            const userId = req.user.userId;
        
            // Check if the required properties are present
            if (!userId || !data.title || !data.Description) {
                return res.status(400).json({ status: 400, message: "Invalid data format. Missing required properties." });
            }
        
            // Add the 'createDt' and 'updateDt' properties to the 'data' object
            data.createDt = new Date();
            data.updateDt = new Date();
            data.userId = userId; // Associate the user ID with the note post
        
            try {
                const result = await notePostCollection.insertOne(data);
                res.json({
                    status: 200,
                    data: result
                });
            } catch (err) {
                res.status(500).json({
                    status: 500,
                    message: "Internal Server Error"
                });
            }
        });
        



        // get all posts

        app.get('/getAllNotePost', verifyJWT, async(req,res)=>{
            try{
                const result = await notePostCollection.find().toArray();

                res.json({
                    status: 200,
                    data: result
                })

            }catch(err){
                res.json({
                    status: 500,
                    message: "Internal Server Error"
                })
            }
        })

// update note post
app.put('/updateNotePost/:id', verifyJWT, async (req, res) => {
    const { id } = req.params;
    const query = { _id: new ObjectId(id) };
    const { data } = req.body;

    try {
        // You need to use ObjectId to match the id in the collection
        const getSinglePost = await notePostCollection.findOne(query);
        if (!getSinglePost) {
            return res.json({
                status: 404,
                message: "Note not found"
            });
        }

        const updateQuery = {}; // Initialize the update query object

        // Check and update title and description
        if (data.title) updateQuery.title = data.title;
        if (data.Description) updateQuery.Description = data.Description;

        // Update the updateDt field
        updateQuery.updateDt = new Date();

        // Perform the update
        const result = await notePostCollection.updateOne(query, { $set: updateQuery });

        res.json({
            status: 200,
            data: result
        });
    } catch (err) {
        res.json({
            status: 500,
            message: "Internal Server Error"
        });
    }
});

// delete note post
app.delete('/deleteNotePost/:id', verifyJWT, async (req, res) => {
    const { id } = req.params;
    const query = { _id: new ObjectId(id) };

    try {
        // You need to use ObjectId to match the id in the collection
        const getSinglePost = await notePostCollection.findOne(query);
        if (!getSinglePost) {
            return res.json({
                status: 404,
                message: "Note not found"
            });
        }

        const result = await notePostCollection.deleteOne(query);

        res.json({
            status: 200,
            data: result
        });
        
    } catch (err) {
        res.json({
            status: 500,
            message: "Internal Server Error"
        });
    }


});






   // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);


app.get('/users', (req, res) => {

    if(req.query.name){
        const search = req.query.name;
        const filtered = user.filter(usr => usr.name.toLowerCase().indexOf(search) >= 0);
        res.send(filtered);
    }else{
        res.send(users);
    }

    res.send(users);
});



app.listen(port, () => {
    console.log(`app is running on http://localhost:${port}`);
});
