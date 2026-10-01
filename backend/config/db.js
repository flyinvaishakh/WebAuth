import mongoose from "mongoose";

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI,{
            dbName:"MernAuth"
        })
        console.log("Connected to MongoDB");
    }catch(error){
        console.log("Failed to connect");
    }
}

export default connectDB