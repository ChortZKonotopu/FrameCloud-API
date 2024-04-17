const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');
const cookieParser = require("cookie-parser")
    
// Load environment variables from .env file
dotenv.config();

const app = express()

//general uses
app.use(cors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST',
    credentials: true,
}))
app.use(express.json({ limit: '30mb'}))
app.use(cookieParser())

//add auth route
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes); 

//add auth route
const postRoutes = require('./routes/post');
app.use('/post', postRoutes);

//add user route
const userRoutes = require('./routes/user');
app.use('/user', userRoutes);

//add postFetching route
const postFetchingRoutes = require('./routes/postFetching');
app.use('/post-fetching', postFetchingRoutes);


app.listen(5000, () => {
    console.log('server is listening on port 5000...')
})