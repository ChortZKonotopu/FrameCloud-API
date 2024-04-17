const { express, Router } = require('express')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const cloudinary = require('cloudinary').v2;
const pool = require('./database')

dotenv.config();

const router = Router();

router.route('/get-user').post(async (req, res) => { 
    try {
        const { id } = req.body
        console.log('id user: ', id)
        let result = await pool.query(`
        SELECT *
        FROM user
        WHERE id = ${id}
        `)

        res.status(200).json(result[0][0])

    } catch (error) {
        console.log(error)
        res.json(error)
    }
}) 


router.route('/subscribe').post(async (req, res) => { 
    try {
        const { idCreator } = req.body 
        console.log(idCreator)
        //check if user logged in
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        //check if user already subscribed
        let result = await pool.query(`
        SELECT *
        FROM subscribe
        WHERE idUser = ${userInfo.id}
        AND idCreator = ${idCreator};
        `)

        // console.log(result)
        if (!result[0][0]) {
            //creating subscribe
            console.log('creating subscribe')

            result = await pool.query(`
            INSERT INTO subscribe
            (idUser, idCreator)
            VALUES
            (${userInfo.id}, ${idCreator});
            `)
            // console.log(result)
            res.status(200).json({ 'message': 'subscribe succesfully created' })
        } else {
            //deleting subscribe
            console.log('deleting subscribe')

            result = await pool.query(`
            DELETE FROM
            subscribe WHERE
            idUser = ${userInfo.id}
            AND idCreator = ${idCreator};
        `);
            res.status(200).json({ 'message': 'subscribe succesfully deleted' })
        }
    } catch (error) {
        console.log(error)
        res.error(error)
    }
})

//on subscription



//getUsers
router.route('/get-users').post(async (req, res) => {
    try {
        //check if user logged in
        const token = req.cookies.jwt
        let result
        if (token == null) {
            console.log('im here')
            result = await pool.query(`
                SELECT *
                FROM user
                ORDER BY RAND()
                LIMIT 30;
                `)
        } else {

            
            
            let userInfo
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
                userInfo = user
            })
            console.log('userinfo: ', userInfo)
            
            if (userInfo) {
                result = await pool.query(`
                SELECT *
                FROM user
                WHERE id != ${userInfo.id}
                ORDER BY RAND()
                LIMIT 30;
                `)
            }
            }
            // console.log(result[0])
            res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.starus(404).json({message: error})
    }
}) 


//get user subscribes 
router.route('/user-subscribes').post(async (req, res) => {
    try {
        console.log('im here')
        //check if user logged in
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        const result = await pool.query(`
            SELECT *
            FROM user
            JOIN subscribe ON user.id = subscribe.idCreator
            WHERE subscribe.idUser = ${ userInfo.id };
        `)
        // console.log(result[0])
        res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.starus(404).json({ message: error })
    }
})
 
router.route('/search').post(async (req, res) => { 
    try {
        const { searchTerm } = req.body
        console.log(searchTerm)

        result = await pool.query(`
    SELECT *
    FROM user
    WHERE email LIKE CONCAT('%', ?, '%') OR username LIKE CONCAT('%', ?, '%') 
    ORDER BY RAND()
    LIMIT 30;
`, [searchTerm, searchTerm]);

        // console.log(result[0])
        res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.status(404).json({ message: error })
    }
}) 

router.route('/check-if-subscribed').post(async (req, res) => {
    try {
        const { id } = req.body

        console.log('checking if user subscribed...', id)

        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        result = await pool.query(`
            SELECT *
            FROM subscribe
            WHERE (idUser = '${userInfo.id}' AND idCreator = '${id}')
        `)
        if (result[0][0]) {
            // console.log(result[0])
            res.status(200).json(result[0])
        } else {
            res.status(200).json([])
        }
    } catch (error) {
        console.log(error)
        res.status(404).json({ message: error })
    }
})

router.route('/edit-profile').post(async (req, res) => {
    try {
        const { image, username, birthday, hometown, relations, languages, biography } = req.body
        console.log('im here')

        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        const photoUrl = await cloudinary.uploader.upload(image)
        console.log(photoUrl.url)

        const result = await pool.query(`
            UPDATE user
            SET 
                img = '${photoUrl.url}',
                username = '${username}',
                birthday = '${birthday}',
                biography = '${biography}',
                hometown = '${hometown}',
                relationships = '${relations}',
                languages = '${languages}'
            WHERE id = ${userInfo.id};
        `);
        res.status(200).json({message: "User data updated."})
    } catch (error) {
        console.log(error)
        res.status(404).json({ message: error })
    }
})


router.route('/testing-server').get(async (req, res) => {
    res.json({message: 'server is runnning & working.'})
})

module.exports = router
