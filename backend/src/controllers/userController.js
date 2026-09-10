const bcrypt = require('bcrypt'); 
const jwt = require("jsonwebtoken");
const {createUser, findUserByEmail} = require('../models/user.model'); 

const registerUser = async ( req,res) =>{
     try{
        
        const {name,email,password} = req.body; 

        if(!name || !email || !password){
            return res.status(400).json({
            message:"Name, email and password are required"
            });

            }
     
    const existUser = await findUserByEmail(email);
    if(existUser){
        return res.status(409).json({
            message:"User already exist"
        });
    } 
    const hashPassword = await  bcrypt.hash(password,10);
    
    const user = await createUser(
        name,
        email,
        hashPassword
    );
    return res.status(201).json({ message: "User created successfully", user });

} catch (error){
    return res.status(500).jaon({
        message:"Internal server error"
    })
}
}  
const loginUser = async(req,res)=>{
    try{
        const {email , password} = req.body;
        if(!email || !password ){
            return res.status(400).json({
                message:"Email and password are required"
            })
        }
        const user = await findUserByEmail(email);
         if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // 3. Check password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        } 
        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_ACCESS_SECRET,
            {
                expiresIn: "15m"
            }
        );

        // 8. Create refresh token
        const refreshToken = jwt.sign(
            {
                id: user.id
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // 9. Send tokens to client
        return res.status(200).json({
            message: "Login successful",

            accessToken,

            refreshToken
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const refreshAccessToken = async(req,res)=>{

    try{
        const {refrshToken} = req.body;
        if(!refrshToken){
            return res.status(401).json({
                message:"Refresh token required"
            })
        }

            const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        const newAccessToken = jwt.sign(
            {
                id: decoded.id
            },
            process.env.JWT_ACCESS_SECRET,
            {
                expiresIn: "15m"
            }
        );

        return res.status(200).json({
            accessToken: newAccessToken
        });

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired refresh token"
        });
    }
};


    




const getUserByEmail = async (req,res)=>{
    try{
        const { email } = req.params;
        const user = await findUserByEmail(email);
        if(!user){
            return res.status(404).json({
                message: "User not found"
            

            })

        }
        return res.status(200).json({
            user 

        });
        } catch (error) {
            return res.status(500).json({
                message:"Internal server error"
            });
        }
    

}
module.exports = { registerUser, getUserByEmail ,loginUser,refreshAccessToken };