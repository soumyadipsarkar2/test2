const mongoose=require('mongoose');

const connectDB=async()=>{
    // return mongoose.connect(uri,{useNewUrlParser:true,UseUnifiedTopology:true});
    x=await mongoose.connect(process.env.MONGO_URI);
    console.log("vsdvdv",mongoose.connection.readyState);
    return x;
};

module.exports=connectDB;