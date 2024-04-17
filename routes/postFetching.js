const { express, Router } = require('express')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')

const pool = require('./database')

dotenv.config();

const router = Router();

router.route('/postInfiniteScroll').post(async (req, res) => {
    try {
        // console.log('infinite scroll...')

        const { lastId } = req.body
        console.log('inf scroll, last id: ', lastId)
        let result
        if (lastId == 1) {
            //get first pack of posts 
            result = await pool.query(`
            SELECT *
            FROM post
            ORDER BY id DESC
            LIMIT 5;
        `)
        } else {
            result = await pool.query(`
                SELECT *
                FROM post
                WHERE id < ${lastId}
                ORDER BY id DESC
                LIMIT 5;
            `) 
        }
        // console.log('infinite scroll: ', result[0])

        if (result[0][0]) {
            res.status(200).json({'posts': result[0]})
        } else {
            res.status(200).json({'posts': []})
        }

    } catch (error) {
        console.log(error)
        res.json({'message':error})
    }
})

//post saved infinite scroll

router.route('/postSavedInfiniteScroll').post(async (req, res) => {
    try {
        console.log('infinite saved scroll...')
        //checking if user is logged in
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        const { lastId } = req.body
        let result
        let savedPostsId
        if (lastId == 1) {
            result = await pool.query(`
            SELECT idPost
            FROM save
            WHERE idUser = ${userInfo.id}
            ORDER BY idPost DESC
            LIMIT 4;
            `)

            savedPostsId = result[0].map(obj => obj.idPost)
            console.log('saved postts ids:', savedPostsId)
            const query = `SELECT * FROM post WHERE id IN (${savedPostsId.join(',')}) ORDER BY id DESC LIMIT 2`;

            result = await pool.query(query)

            console.log('results: ',result)

        } else {
            result = await pool.query(`
            SELECT idPost
            FROM save
            WHERE idUser = ${userInfo.id}
            AND idPost < ${lastId}
            ORDER BY idPost DESC
            LIMIT 2;
            `)
            savedPostsId = result[0].map(obj => obj.idPost)
            console.log('saved postts ids:', savedPostsId)
            const query = `SELECT * FROM post WHERE id IN (${savedPostsId.join(',')}) ORDER BY id ASC LIMIT 2`;

            result = await pool.query(query)

            console.log('results: ', result)
        }

        if (result[0][0]) {
            res.status(200).json({ 'posts': result[0] })
        } else {
            res.status(200).json({ 'posts': [] })
        }

    } catch (error) {
        console.log(error)
        res.json({ 'message': error })
    }
})

//get smallest save id for setting hasMore
router.route('/smallestIdPost').post(async (req, res) => {
    //checking if user is logged in
    const token = req.cookies.jwt
    if (token == null) return res.sendStatus(401)

    let userInfo
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403).json('error veryfying the user token.')
        userInfo = user
    })

const query = `SELECT MIN(idPost) as smallestIdPost FROM save WHERE idUser = ${userInfo.id}`;
    const result = await pool.query(query)

    console.log('least post saved id', result[0])
    // Send the smallestIdPost in the response
    res.json({ smallestIdPost: result[0][0].smallestIdPost });
});


//need to test it
router.route('/mediaInfiniteScroll').post(async (req, res) => {
    try {
        const { lastId } = req.body
        let result
        if (lastId == 1) {
            //get first pack of posts
            result = await pool.query(`
                SELECT id, imageUrl, idUser
                FROM post
                WHERE imageUrl IS NOT NULL AND imageUrl <> ''
                ORDER BY id DESC
                LIMIT 10;
            `)
        } else {
            result = await pool.query(`
                SELECT id, imageUrl, idUser
                FROM post
                WHERE id < ${lastId} 
                AND imageUrl IS NOT NULL AND imageUrl <> ''
                ORDER BY id DESC
                LIMIT 15;
            `)
        }

        res.status(200).json({ 'posts': result[0] })
    } catch (error) {
        console.log(error)
        res.json({ 'message': error })
    }
})

//get user posts with this id
router.route('/user-post').post(async (req, res) => {
    try {
        const { id } = req.body
        console.log(id)
        const result = await pool.query(`
            SELECT *
            FROM post
            WHERE idUser = ${id};
        `)
        // console.log(result[0])
        res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.send(error)
    }
 })


//get image links of user posts
router.route('/user-media').post(async (req, res) => {
    try {
        const { id } = req.body
        console.log(id)
        const result = await pool.query(`
            SELECT imageUrl
            FROM post
            WHERE idUser = ${id}
            LIMIT 5;
        `)
        // console.log(result[0])
        res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.send(error)
    }
})

//fetch music urls
router.route('/user-music').post(async (req, res) => {
    try {
        const { id } = req.body
        console.log(id)
        const result = await pool.query(`
            SELECT musicUrl
            FROM post
            WHERE musicUrl != 'undefined' AND idUser=${id};
        `)
        // console.log(result)
        res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.send(error)
    }
})


module.exports = router