const { express, Router } = require('express')
const dotenv = require('dotenv')
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken')

const pool = require('./database')

dotenv.config();

const router = Router();


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

router.route('/createPost').post(async (req, res) => {
    try {
        //checking if user is logged in
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error verifying the user token.')
            userInfo = user
        })

        // Posting the media into cloudinary
        const { images, music, description } = req.body
        console.log('New post, images count:', images.length, 'music:', description)

        const imageLinks = []
        for (let i = 0; i < images.length; i++) {
            const photoUrl = await cloudinary.uploader.upload(images[i])
            imageLinks.push(photoUrl.url)
        }
        let musicUrl = ''
        if (music) {
            console.log('posting music')
            musicUrl = await cloudinary.uploader.upload(`${music}`, { resource_type: 'auto' })
        } else {
            console.log('not posting music')
        }

        //Creating current date
        const currentDate = new Date();

        // Format the date and time as "dd/mm/yyyy hh:mm"
        const formattedDate = new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(currentDate).toString();

        const imageUrlList = JSON.stringify(imageLinks);

        const result = await pool.query(`
            INSERT INTO post
            (idUser, imageUrl, musicUrl, description, datetime)
            VALUES
            (${userInfo.id}, '${imageUrlList}', '${musicUrl.url}',
            '${description}', '${formattedDate}');
        `);


        res.status(200).json({ 'message': 'post successfully created!' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ 'message': 'Error creating post.' });
    }
});

router.route('/like').post(async (req, res) => { 
    try {
        const { postId } = req.body
        console.log(postId)

        //check if user logged in
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        //check if user already liked the post
        let result = await pool.query(`
        SELECT *
        FROM \`like\`
        WHERE \`idUser\` = ${userInfo.id}
        AND \`idPost\` = ${postId};
        `)

        // console.log(result)
        if (!result[0][0]) {
            //creating like
            console.log('creating like')

            result = await pool.query(`
            INSERT INTO \`like\`
            (idUser, idPost)
            VALUES
            (${userInfo.id}, ${postId});
            `)
            // console.log(result)
            res.status(200).json({'message': 'like succesfully created'})
        } else {
            //deleting like
            // console.log('deleting like')

            result = await pool.query(`
            DELETE FROM
            \`like\` WHERE
            \`idUser\` = ${userInfo.id}
            AND \`idPost\` = ${postId};
        `);
            res.status(200).json({ 'message': 'like succesfully deleted' })
        }
    } catch (error) {
        console.log(error)
        res.json({'message': error})
    }
})

router.route('/save').post(async (req, res) => {
    try {
        const { postId } = req.body
        // console.log(postId)

        //check if user logged in
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)

        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        //check if user already saved the post
        let result = await pool.query(`
        SELECT *
        FROM \`save\`
        WHERE \`idUser\` = ${userInfo.id}
        AND \`idPost\` = ${postId};
        `)

        // console.log(result)
        if (!result[0][0]) {
            //creating save
            console.log('creating save')

            result = await pool.query(`
            INSERT INTO \`save\`
            (idUser, idPost)
            VALUES
            (${userInfo.id}, ${postId});
            `)
            // console.log(result)
            res.status(200).json({ 'message': 'like succesfully created' })
        } else {
            //deleting save
            // console.log('deleting save')

            result = await pool.query(`
            DELETE FROM
            \`save\` WHERE
            \`idUser\` = ${userInfo.id}
            AND \`idPost\` = ${postId};
            `);
            res.status(200).json({ 'message': 'like succesfully deleted' })
        }
    } catch (error) {
        console.log(error)
        res.json({ 'message': error })
    }
})

//create comment
router.route('/comment').post(async (req, res) => {
    try {
        const { comment, postId } = req.body;

        // Check if user is logged in
        const token = req.cookies.jwt;
        if (token == null) return res.sendStatus(401);

        // Verify user token
        let userInfo;
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
            if (err) return res.sendStatus(403).json('error verifying the user token.');

            userInfo = user;

            try {
                // Execute parameterized query
                await pool.execute('INSERT INTO comment (idUser, idPost, comment) VALUES (?, ?, ?)', [userInfo.id, postId, comment]);

                res.status(200).json({ 'message': 'comment created' });
            } catch (error) {
                console.log(error);
                res.status(500).json({ 'message': 'Error inserting comment into database' });
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ 'message': 'Internal server error' });
    }
});

router.route('/get-comments').post(async (req, res) => {
    try {
        const { postId } = req.body

        let result = await pool.query(`
        SELECT *
        FROM comment
        WHERE idPost = ${postId}
        ORDER BY id DESC;`)

        res.status(200).json(result[0])
    } catch (error) {
        console.log(error)
        res.json({ 'message': error })
    }
})

router.route('/deleteComment').post(async (req, res) => { 
    try {
        const { id } = req.body
        // console.log(id)

        result = await pool.query(`
        DELETE FROM
        comment WHERE
        id = ${id}
        `);
        res.status(200).json({ 'message': 'like succesfully deleted' })
    } catch (error) {
        console.log(error)
        res.status(404).json({ "message": 'cabage'})
    }
})
    
//get like count, isLiked, isSaved
router.route('/post-info').post(async (req, res) => {
    try {
        const { idPost } = req.body
        console.log('post information for: ', idPost)
        //get user info
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)
        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        let result = await pool.query(`
            SELECT *
            FROM \`like\`
            WHERE idPost = ${idPost};
        `)
        const likeCount = result[0].length

        result = await pool.query(`
            SELECT *
            FROM \`like\`
            WHERE idUser = ${userInfo.id}
            AND idPost = ${idPost};
        `)

        let isLiked
        if (result[0][0]) {
            isLiked = true
        } else {
            isLiked = false
        }

        result = await pool.query(`
            SELECT *
            FROM save
            WHERE idUser = ${userInfo.id}
            AND idPost = ${idPost};
        `)

        let isSaved
        if (result[0][0]) {
            isSaved = true
        } else {
            isSaved = false
        }

        res.status(200).json({ likeCount, isLiked, isSaved })

    } catch (error) {
        console.log(error)
        res.send(error)
    }
})

router.route('/get-postdata').post(async (req, res) => {
    try {
        const { postId } = req.body
        //get user info
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)
        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        let result = await pool.query(`
            SELECT *
            FROM \`post\`
            WHERE id = ${postId};
        `)
        
        res.status(200).json({ postData: result[0][0]})

    } catch (error) {
        console.log(error)
        res.send(error)
    }
})

router.route('/edit-post').post(async (req, res) => {
    try {
        const { updatedPost, oldPost } = req.body
        // Extract the array of image URLs from the request body
        const imageUrlsArray = JSON.parse(oldPost.imageUrl)

        const publicIds = imageUrlsArray.map(url => {
            // Split the URL by '/' to get the parts
            const parts = url.split('/');
            // Extract the public ID from the parts
            const filename = parts[parts.length - 1];
            // Remove the extension
            const publicId = filename.slice(0, filename.lastIndexOf('.'));
            return publicId;
        });

        // Array to store deletion results
        const deletionResults = [];
        // Loop through each image URL and delete it from Cloudinary
        for (const imageUrl of publicIds) {
            console.log('deleting asset:', imageUrl)
            const deletionResult = await cloudinary.uploader.destroy(imageUrl);
            deletionResults.push(deletionResult);
            console.log(deletionResult)

        }
        // Delete the old mp3
        // if (oldPost.musicUrl) {
        //     const musicUrlArrayParts = oldPost.musicUrl.split('/')
        //     const musicId = musicUrlArrayParts[musicUrlArrayParts.length - 1].slice(0, musicUrlArrayParts[musicUrlArrayParts.length - 1].lastIndexOf('.'))
        //     console.log('deleting asset(music): ', musicId)
        //     const deletionResult = await cloudinary.uploader.destroy(musicId, { resource_type: 'video', type: 'authenticated' });
        //     console.log(deletionResult)
        //     deletionResults.push(deletionResult)
        // }
            const allDeleted = deletionResults.every(result => result.result === 'ok');
            console.log(allDeleted)
        
        const imageLinks = []
        for (let i = 0; i < updatedPost.images.length; i++) {
            const photoUrl = await cloudinary.uploader.upload(updatedPost.images[i])
            imageLinks.push(photoUrl.url)
        }
        let musicUrl = "undefined"
        if (updatedPost.music) {
            console.log('posting music')
            musicUrl = await cloudinary.uploader.upload(`${updatedPost.music}`, { resource_type: 'auto' })
        } else {
            console.log('not posting music')
        }

        //Creating current date
        const currentDate = new Date();

        // Format the date and time as "dd/mm/yyyy hh:mm"
        const formattedDate = new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(currentDate).toString();

        const imageUrlList = JSON.stringify(imageLinks);

        const result = await pool.query(`
            UPDATE post
            SET imageUrl = '${imageUrlList}',
            musicUrl = '${musicUrl.url}',
            description = '${updatedPost.description}',
            datetime = '${formattedDate}'
            WHERE id = ${oldPost.id};
        `);
        
        if (allDeleted) {
            res.status(200).json({ message: 'All media deleted successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
 })


router.route('/delete-post').post(async (req, res) => {
    try {

        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
        })

        const { postData } = req.body
        console.log('deleting this post : ', postData)

        const imageUrlsArray = JSON.parse(postData.imageUrl.replace(/'/g, '"'))

        const publicIds = imageUrlsArray.map(url => {
            // Split the URL by '/' to get the parts
            const parts = url.split('/');
            // Extract the public ID from the parts
            const filename = parts[parts.length - 1];
            // Remove the extension
            const publicId = filename.slice(0, filename.lastIndexOf('.'));
            return publicId;
        });

        // Array to store deletion results
        const deletionResults = [];
        // Loop through each image URL and delete it from Cloudinary
        for (const imageUrl of publicIds) {
            console.log('deleting asset:', imageUrl)
            const deletionResult = await cloudinary.uploader.destroy(imageUrl);
            deletionResults.push(deletionResult);
            console.log(deletionResult)
        }
        //delete the likes
        let result = await pool.query(`
            DELETE FROM \`like\`
            WHERE idPost = ${postData.id};
        `);
        //delete the saves
         result = await pool.query(`
            DELETE FROM save
            WHERE idPost = ${postData.id};
        `);
        //delete the comments
         result = await pool.query(`
            DELETE FROM comment
            WHERE idPost = ${postData.id};
        `);
        //delete post
        result = await pool.query(`
            DELETE FROM post
            WHERE id = ${postData.id};
        `);
        console.log('Post had beed sucesfylly deleted!')

        res.status(200).json({ message: 'Post had beed sucesfylly deleted!' });

    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
 })
router.route('/get-userphotos').post(async (req, res) => {
    try {
        //get user info
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)
        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        result = await pool.query(`
            SELECT * FROM POST
            WHERE idUser = ${userInfo.id}
            ORDER BY id DESC
            LIMIT 5;
        `);
        console.log(result[0])
        res.status(200).json({ imageUrl: result[0] })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
})
 //get more content for profile page
router.route('/get-userposts').post(async (req, res) => {
    try {
        const { lastPostId } = req.body

        //get user info
        const token = req.cookies.jwt
        if (token == null) return res.sendStatus(401)
        let userInfo
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403).json('error veryfying the user token.')
            userInfo = user
        })

        result = await pool.query(`
            SELECT * FROM POST
            WHERE idUser = ${userInfo.id} 
            AND id < ${lastPostId}
            ORDER BY id DESC
            LIMIT 5;
        `);
        console.log(result[0])
        res.status(200).json({ imageUrl: result[0] })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
})


//same but for profile guest
router.route('/get-userphotos-byid').post(async (req, res) => {
    try {
        const {id} = req.body

        result = await pool.query(`
            SELECT * FROM POST
            WHERE idUser = ${id}
            ORDER BY id DESC
            LIMIT 5;
        `);
        console.log(result[0])
        res.status(200).json({ imageUrl: result[0] })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
})

///get-userposts-byid
router.route('/get-userposts-byid').post(async (req, res) => {
    try {
        const { lastPostId, id } = req.body


        result = await pool.query(`
            SELECT * FROM POST
            WHERE idUser = ${id} 
            AND id < ${lastPostId}
            ORDER BY id DESC
            LIMIT 5;
        `);
        console.log(result[0])
        res.status(200).json({ imageUrl: result[0] })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Internal server error' });
    }
})

module.exports = router
