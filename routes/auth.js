const { express, Router } = require('express')
const jwt = require('jsonwebtoken')

const pool = require('./database')

const router = Router();

const maxAge = 30 * 24 * 60 * 60;

router.get('/login', async (req, res) => {
    //Login user
    const { login, password } = req.query

    const result = await pool.query(`SELECT *
    FROM user
    WHERE(username = '${login}'
    OR email = '${login}')
    AND password = '${password}'
    `)

    const user = result[0][0];

    // Check if there is no user found
    if (!user) {
        return res.status(404).json({ error: 'user not found' });
    }
    
    //Create and send token, user info from database
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
    res.cookie('jwt', accessToken, { httpOnly: true, maxAge: maxAge });
    res.status(200).json(user)
})

router.get('/register', async (req, res) => {
    const { login, email, password } = req.query
    
    const isThereSameuser = await pool.query(
        `SELECT *
        FROM user
        WHERE username = '${login}'
        OR email = '${email}'`
        );
        
        
    if (isThereSameuser[0][0]) {
        res.status(409).json('The user with same username/email is already exists')
    } else {
        try {
            
            //Create new user
            const result = await pool.query(`
            INSERT INTO user
            (username, email, password)
            VALUES('${login}',
            '${email}', '${password}')
            `)
            
            const user = await pool.query(
                `SELECT *
            FROM user
            WHERE(username = '${login}'
            OR email = '${login}')
            AND password = '${password}'
            `)
            
            console.log('This user was registered: ', user[0][0])
            
            const accessToken = jwt.sign(user[0][0], process.env.ACCESS_TOKEN_SECRET)
            res.cookie('jwt', accessToken, { httpOnly: true, maxAge: maxAge });
            res.status(200).json(user[0][0])
            
        } catch (error) {
            console.log(error)
            res.status(404).json('Something went wrong. Please try again.')
        }
    }
    res.status(200)
})
    
router.get('/logout', async (req, res) => {
    console.log("user logged out.")
    res.cookie('jwt', '', { maxAge: 1 });
    res.status(200).send('user logged out')
})

router.get('/getuserInfo', async (req, res) => {
    const token = req.cookies.jwt
    if (token == null) return res.sendStatus(401)
    
    //verify the token and 
    let userInfo
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403).json('error veryfying the user token.')
        userInfo = user
        return 
    })

    const user = await pool.query(
        `SELECT *
            FROM user
            WHERE id = '${userInfo.id}'
    `)
        console.log(user[0])
    res.status(200).json(user[0][0])
    })
    
    // function authenticateToken(req, res, next) {
    //     const authHeader = req.headers['authorization']
    //     const token = authHeader && authHeader.split(' ')[1]
    //     if (token == null) return res.sendStatus(401)
        
    //     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    //     if (err) return res.sendStatus(403)
    //     req.user = user
    //     next()
    // })
// }



// const requireAuth = (req, res, next) => {
//     const token = req.cookies.jwt;

//     if (token) {
//         jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decodedToken) => {
//             if (err) {
//                 console.log(err.message);
//                 res.redirect('/login');
//             } else {
//                 console.log('users is valid: ', decodedToken)
//                 next();
//             }
//         })
//     } else {
//         res.redirect('/login')
//     }
// }

module.exports = router