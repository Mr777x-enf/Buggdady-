const bcrypt = require('bcrypt'); 
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
module.exports = { registerUser, getUserByEmail };